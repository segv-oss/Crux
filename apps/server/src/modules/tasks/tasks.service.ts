import { pool } from '../../config/db.js';
import { allocateSequenceAndJournal, withTransaction } from '../../db/store.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { PRTaskDTO, PaginatedResult, TaskPriority } from '../../types/index.js';

export async function listPRTasks(
  repoId: string,
  prId: string,
  options: {
    limit: number;
    cursor?: string;
    direction: 'forward' | 'backward';
  },
): Promise<PaginatedResult<PRTaskDTO>> {
  const { limit, cursor, direction } = options;
  const conditions: string[] = ['t.pr_id = $1', 't.deleted_at IS NULL'];
  const values: any[] = [prId];
  let paramIdx = 2;

  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      if (direction === 'forward') {
        conditions.push(
          `(t.created_at, t.id) > ($${paramIdx}::timestamptz, $${paramIdx + 1}::text)`,
        );
      } else {
        conditions.push(
          `(t.created_at, t.id) < ($${paramIdx}::timestamptz, $${paramIdx + 1}::text)`,
        );
      }
      values.push(decoded.v, decoded.id);
      paramIdx += 2;
    } catch {
      throw new AppError({
        status: 400,
        code: 'INVALID_CURSOR',
        message: 'Provided cursor could not be decoded.',
      });
    }
  }

  const orderBy =
    direction === 'forward'
      ? 'ORDER BY t.created_at ASC, t.id ASC'
      : 'ORDER BY t.created_at DESC, t.id DESC';

  values.push(limit + 1);
  const sql = `
    SELECT t.*, u.name as assignee_name, u.email as assignee_email, u.avatar_url as assignee_avatar
    FROM pr_tasks t
    JOIN pull_requests pr ON pr.id = t.pr_id
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE pr.repo_id = $${paramIdx} AND ${conditions.join(' AND ')}
    ${orderBy}
    LIMIT $${paramIdx + 1}
  `;

  values.splice(values.length - 1, 0, repoId);
  const res = await pool.query(sql, values);
  const rows = res.rows;
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  if (direction === 'backward') {
    items.reverse();
  }

  const resultItems: PRTaskDTO[] = items.map((r) => ({
    id: r.id,
    prId: r.pr_id,
    assigneeId: r.assignee_id,
    assignee: r.assignee_id
      ? {
          id: r.assignee_id,
          name: r.assignee_name || 'Assignee',
          email: r.assignee_email || '',
          avatarUrl: r.assignee_avatar || '',
        }
      : null,
    linearTaskId: r.linear_task_id,
    title: r.title,
    done: r.done,
    priority: r.priority as TaskPriority,
    version: r.version,
    linearUrl: r.linear_url,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    deletedAt: r.deleted_at ? r.deleted_at.toISOString() : null,
  }));

  const startItem = resultItems[0];
  const endItem = resultItems[resultItems.length - 1];

  return {
    items: resultItems,
    pageInfo: {
      hasMore,
      hasPrevious: !!cursor,
      startCursor: startItem
        ? Buffer.from(JSON.stringify({ v: startItem.createdAt, id: startItem.id })).toString(
            'base64',
          )
        : null,
      endCursor: endItem
        ? Buffer.from(JSON.stringify({ v: endItem.createdAt, id: endItem.id })).toString('base64')
        : null,
      nextCursor:
        hasMore && endItem
          ? Buffer.from(JSON.stringify({ v: endItem.createdAt, id: endItem.id })).toString('base64')
          : null,
    },
  };
}

export async function createTask(
  repoId: string,
  prId: string,
  body: {
    linearTaskId: string;
    title: string;
    priority?: TaskPriority;
    assigneeId?: string | null;
    linearUrl?: string;
  },
  orgId?: string,
): Promise<PRTaskDTO> {
  return withTransaction(async (client) => {
    // Assert PR exists
    const prRes = await client.query(
      'SELECT id FROM pull_requests WHERE repo_id = $1 AND id = $2 AND deleted_at IS NULL',
      [repoId, prId],
    );

    if (prRes.rowCount === 0) {
      throw new AppError({
        status: 404,
        code: 'PR_NOT_FOUND',
        message: `Pull Request '${prId}' not found.`,
      });
    }

    const taskId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await client.query(
        `INSERT INTO pr_tasks (
           id, pr_id, assignee_id, linear_task_id, title, done, priority, version, linear_url
         ) VALUES ($1, $2, $3, $4, $5, false, $6, 1, $7)
         RETURNING *`,
        [
          taskId,
          prId,
          body.assigneeId || null,
          body.linearTaskId,
          body.title,
          body.priority || 'p1',
          body.linearUrl || null,
        ],
      );

      const saved = res.rows[0];

      await allocateSequenceAndJournal(client, {
        prId,
        orgId,
        repoId,
        eventType: 'task:created',
        payload: { taskId: saved.id, linearTaskId: saved.linear_task_id, title: saved.title },
      });

      return {
        id: saved.id,
        prId: saved.pr_id,
        assigneeId: saved.assignee_id,
        linearTaskId: saved.linear_task_id,
        title: saved.title,
        done: saved.done,
        priority: saved.priority as TaskPriority,
        version: saved.version,
        linearUrl: saved.linear_url,
        createdAt: saved.created_at.toISOString(),
        updatedAt: saved.updated_at.toISOString(),
      };
    } catch (err: any) {
      if (err.code === '23505') {
        throw new AppError({
          status: 409,
          code: 'TASK_ALREADY_LINKED',
          message: `Linear issue '${body.linearTaskId}' is already linked to this PR.`,
        });
      }
      throw err;
    }
  });
}

export async function updateTask(
  repoId: string,
  prId: string,
  taskId: string,
  body: {
    done?: boolean;
    title?: string;
    priority?: TaskPriority;
    assigneeId?: string | null;
    expectedVersion: number;
  },
  orgId?: string,
): Promise<PRTaskDTO> {
  return withTransaction(async (client) => {
    // Assert task exists and is scoped to PR
    const res = await client.query(
      `SELECT t.* FROM pr_tasks t
       JOIN pull_requests pr ON pr.id = t.pr_id
       WHERE pr.repo_id = $1 AND t.pr_id = $2 AND t.id = $3 AND t.deleted_at IS NULL
       FOR UPDATE`,
      [repoId, prId, taskId],
    );

    if (res.rowCount === 0) {
      // Check if task exists in other PR
      const existsElsewhere = await client.query('SELECT id FROM pr_tasks WHERE id = $1', [taskId]);
      if (existsElsewhere.rowCount && existsElsewhere.rowCount > 0) {
        throw new AppError({
          status: 404,
          code: 'TASK_NOT_FOUND_ON_PR',
          message: `Task '${taskId}' exists but is not linked to pull request '${prId}'.`,
        });
      }
      throw new AppError({
        status: 404,
        code: 'TASK_NOT_FOUND',
        message: `Task '${taskId}' not found.`,
      });
    }

    const current = res.rows[0];
    if (current.version !== body.expectedVersion) {
      throw new AppError({
        status: 409,
        code: 'OPTIMISTIC_LOCK_CONFLICT',
        message: `Version conflict: Expected version ${body.expectedVersion}, but task is at version ${current.version}.`,
      });
    }

    const nextVersion = current.version + 1;
    const newDone = body.done !== undefined ? body.done : current.done;
    const newTitle = body.title !== undefined ? body.title : current.title;
    const newPriority = body.priority !== undefined ? body.priority : current.priority;
    const newAssignee = body.assigneeId !== undefined ? body.assigneeId : current.assignee_id;

    const updateRes = await client.query(
      `UPDATE pr_tasks
       SET done = $1, title = $2, priority = $3, assignee_id = $4, version = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [newDone, newTitle, newPriority, newAssignee, nextVersion, taskId],
    );

    const updated = updateRes.rows[0];

    await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'task:updated',
      payload: { taskId, done: newDone, version: nextVersion },
    });

    return {
      id: updated.id,
      prId: updated.pr_id,
      assigneeId: updated.assignee_id,
      linearTaskId: updated.linear_task_id,
      title: updated.title,
      done: updated.done,
      priority: updated.priority as TaskPriority,
      version: updated.version,
      linearUrl: updated.linear_url,
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString(),
    };
  });
}

export async function deleteTask(
  repoId: string,
  prId: string,
  taskId: string,
  orgId?: string,
): Promise<{ success: boolean; taskId: string }> {
  return withTransaction(async (client) => {
    const res = await client.query(
      `SELECT t.* FROM pr_tasks t
       JOIN pull_requests pr ON pr.id = t.pr_id
       WHERE pr.repo_id = $1 AND t.pr_id = $2 AND t.id = $3 AND t.deleted_at IS NULL
       FOR UPDATE`,
      [repoId, prId, taskId],
    );

    if (res.rowCount === 0) {
      throw new AppError({
        status: 404,
        code: 'TASK_NOT_FOUND',
        message: `Task '${taskId}' not found.`,
      });
    }

    await client.query(
      'UPDATE pr_tasks SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [taskId],
    );

    await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'task:deleted',
      payload: { taskId },
    });

    return { success: true, taskId };
  });
}

export async function restoreTask(
  repoId: string,
  prId: string,
  taskId: string,
  orgId?: string,
): Promise<{ success: boolean; restoredAt: string }> {
  return withTransaction(async (client) => {
    const checkRes = await client.query(
      'SELECT deleted_at FROM pr_tasks WHERE id = $1 AND pr_id = $2',
      [taskId, prId],
    );

    if (checkRes.rowCount === 0) {
      throw new AppError({
        status: 404,
        code: 'TASK_NOT_FOUND',
        message: `Task '${taskId}' not found on this PR.`,
      });
    }

    if (!checkRes.rows[0].deleted_at) {
      throw new AppError({
        status: 409,
        code: 'ENTITY_NOT_DELETED',
        message: `Task '${taskId}' is active and cannot be restored.`,
      });
    }

    const res = await client.query(
      'UPDATE pr_tasks SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING updated_at',
      [taskId],
    );

    await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'task:updated',
      payload: { taskId, restored: true },
    });

    return {
      success: true,
      restoredAt: res.rows[0].updated_at.toISOString(),
    };
  });
}

export const createPRTask = createTask;
export const updatePRTask = updateTask;
export const deletePRTask = deleteTask;
export const restorePRTask = restoreTask;
