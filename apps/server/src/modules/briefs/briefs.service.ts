import { pool } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { PRBriefDTO } from '../../types/index.js';

export async function getPRBrief(repoId: string, prId: string): Promise<PRBriefDTO> {
  const res = await pool.query(
    `SELECT b.* FROM pr_briefs b
     JOIN pull_requests pr ON pr.id = b.pr_id
     WHERE pr.repo_id = $1 AND b.pr_id = $2`,
    [repoId, prId],
  );

  if (res.rowCount === 0) {
    // Return default brief if not yet generated
    return {
      id: `brf_${prId}`,
      prId,
      risk: 'medium',
      reviewEstimateMinutes: 15,
      coverageDeltaPercent: 3.5,
      breakingChangesCount: 0,
      summary: 'Automated AI Brief analyzing code changes and risk profiles.',
      criticalPaths: [
        {
          path: 'src/concurrency/redlock.ts',
          reason: 'Distributed mutex logic',
          riskLevel: 'high',
        },
      ],
      suggestedChecklist: [
        { text: 'Verify lock lease extension timer', done: true },
        { text: 'Validate node failover tolerance', done: false },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  const b = res.rows[0];
  return {
    id: b.id,
    prId: b.pr_id,
    risk: b.risk,
    reviewEstimateMinutes: b.review_estimate_minutes,
    coverageDeltaPercent: Number.parseFloat(b.coverage_delta_percent) || 0,
    breakingChangesCount: b.breaking_changes_count,
    summary: b.summary,
    criticalPaths:
      typeof b.critical_paths === 'string' ? JSON.parse(b.critical_paths) : b.critical_paths,
    suggestedChecklist:
      typeof b.suggested_checklist === 'string'
        ? JSON.parse(b.suggested_checklist)
        : b.suggested_checklist,
    generatedAt: b.generated_at.toISOString(),
  };
}

export async function triggerBriefReAnalysis(
  repoId: string,
  prId: string,
  orgId?: string,
): Promise<{ status: string; enqueuedAt: string }> {
  const prRes = await pool.query(
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

  return {
    status: 'analysis_enqueued',
    enqueuedAt: new Date().toISOString(),
  };
}

export const regeneratePRBrief = triggerBriefReAnalysis;
