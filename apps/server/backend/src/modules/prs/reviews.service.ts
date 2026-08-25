import { withTransaction, allocateSequenceAndJournal } from '../../db/store.js';
import { PRReviewDTO, ReviewAction } from '../../types/index.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function submitReview(
  repoId: string,
  prId: string,
  reviewerId: string,
  body: {
    action: ReviewAction;
    comment?: string;
    expectedHeadSha: string;
    expectedReviewVersion?: number;
  },
  orgId?: string
): Promise<PRReviewDTO> {
  return withTransaction(async (client) => {
    // 1. Lock parent PR and check self-review
    const prRes = await client.query(
      `SELECT id, author_id, head_sha, status, review_decision, version, sequence_number
       FROM pull_requests
       WHERE repo_id = $1 AND id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [repoId, prId]
    );

    if (prRes.rowCount === 0) {
      throw new AppError({ status: 404, code: 'PR_NOT_FOUND', message: `Pull Request '${prId}' not found.` });
    }

    const pr = prRes.rows[0];

    // Self-review protection
    if (pr.author_id === reviewerId) {
      throw new AppError({
        status: 422,
        code: 'SELF_REVIEW_PROHIBITED',
        message: 'Pull request author cannot review or approve their own pull request.',
      });
    }

    // Head SHA check
    if (pr.head_sha !== body.expectedHeadSha) {
      throw new AppError({
        status: 409,
        code: 'PR_HEAD_SHA_MISMATCH',
        message: `Head SHA mismatch: Expected ${body.expectedHeadSha}, but PR is currently at ${pr.head_sha}.`,
      });
    }

    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 2. Upsert active review row
    const reviewRes = await client.query(
      `INSERT INTO pr_reviews (id, pr_id, reviewer_id, action, comment, is_dismissed, version)
       VALUES ($1, $2, $3, $4, $5, false, 1)
       ON CONFLICT (pr_id, reviewer_id) DO UPDATE
       SET action = CASE
                      WHEN EXCLUDED.action = 'comment' THEN pr_reviews.action
                      ELSE EXCLUDED.action
                    END,
           comment = EXCLUDED.comment,
           is_dismissed = false,
           version = pr_reviews.version + 1,
           updated_at = CURRENT_TIMESTAMP
       RETURNING id, pr_id, reviewer_id, action, comment, is_dismissed, version, created_at, updated_at`,
      [reviewId, prId, reviewerId, body.action, body.comment || null]
    );

    const savedReview = reviewRes.rows[0];

    // 3. Append immutable audit history
    await client.query(
      `INSERT INTO pr_review_history (
         pr_id, review_id, reviewer_id, action, comment, is_dismissal
       ) VALUES ($1, $2, $3, $4, $5, false)`,
      [prId, savedReview.id, reviewerId, body.action, body.comment || null]
    );

    // 4. Threshold-aware review quorum evaluation under parent lock
    await client.query(
      `UPDATE pull_requests
       SET review_decision = (
             SELECT CASE
               WHEN pull_requests.status IN ('merged', 'closed') THEN pull_requests.review_decision
               WHEN pull_requests.status = 'draft' THEN 'draft'
               WHEN EXISTS (
                 SELECT 1 FROM pr_reviews
                 WHERE pr_id = $1
                   AND action = 'changes_requested'
                   AND is_dismissed = false
               ) THEN 'changes_requested'
               WHEN (SELECT required_approvals FROM repositories WHERE id = pull_requests.repo_id) = 0 THEN 'not_required'
               WHEN (
                 SELECT COUNT(*) FROM pr_reviews
                 WHERE pr_id = $1
                   AND action = 'approved'
                   AND is_dismissed = false
                   AND reviewer_id != pull_requests.author_id
               ) >= (SELECT required_approvals FROM repositories WHERE id = pull_requests.repo_id) THEN 'approved'
               ELSE 'pending'
             END
           ),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [prId]
    );

    // 5. Journal sequence event
    await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'pr:review',
      payload: {
        reviewId: savedReview.id,
        reviewerId,
        action: savedReview.action,
        comment: savedReview.comment,
        isDismissed: false,
      },
    });

    return {
      id: savedReview.id,
      prId: savedReview.pr_id,
      reviewerId: savedReview.reviewer_id,
      action: savedReview.action,
      comment: savedReview.comment,
      isDismissed: savedReview.is_dismissed,
      version: savedReview.version,
      createdAt: savedReview.created_at.toISOString(),
      updatedAt: savedReview.updated_at.toISOString(),
    };
  });
}

export async function dismissReview(
  repoId: string,
  prId: string,
  reviewId: string,
  adminUserId: string,
  body: {
    dismissalReason: string;
  },
  orgId?: string
): Promise<{ success: boolean; dismissedReviewId: string }> {
  return withTransaction(async (client) => {
    // 0. Verify admin/owner role in repository tenant organization
    const roleRes = await client.query(
      `SELECT om.role FROM repositories r
       JOIN org_members om ON om.org_id = r.org_id
       WHERE r.id = $1 AND om.user_id = $2 AND om.deleted_at IS NULL AND r.deleted_at IS NULL`,
      [repoId, adminUserId]
    );

    if (roleRes.rowCount === 0 || !['admin', 'owner'].includes(roleRes.rows[0].role)) {
      throw new AppError({
        status: 403,
        code: 'FORBIDDEN_ADMIN_ACCESS',
        message: 'Only organization admins or owners have permission to dismiss reviews.',
      });
    }

    // 1. Lock parent PR
    const prRes = await client.query(
      `SELECT id, status, review_decision FROM pull_requests
       WHERE repo_id = $1 AND id = $2 AND deleted_at IS NULL FOR UPDATE`,
      [repoId, prId]
    );

    if (prRes.rowCount === 0) {
      throw new AppError({ status: 404, code: 'PR_NOT_FOUND', message: `Pull Request '${prId}' not found.` });
    }

    // 2. Fetch review to dismiss
    const revRes = await client.query(
      `SELECT id, pr_id, reviewer_id, action, comment, is_dismissed
       FROM pr_reviews WHERE id = $1 AND pr_id = $2`,
      [reviewId, prId]
    );

    if (revRes.rowCount === 0) {
      throw new AppError({ status: 404, code: 'REVIEW_NOT_FOUND', message: `Review '${reviewId}' not found on this PR.` });
    }

    const review = revRes.rows[0];

    // 3. Mark as dismissed in active review table
    await client.query(
      `UPDATE pr_reviews
       SET is_dismissed = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [reviewId]
    );

    // 4. Append dismissal entry to audit history
    await client.query(
      `INSERT INTO pr_review_history (
         pr_id, review_id, reviewer_id, action, is_dismissal, dismissed_by_id, dismissed_reason
       ) VALUES ($1, $2, $3, 'dismissed', true, $4, $5)`,
      [prId, reviewId, review.reviewer_id, adminUserId, body.dismissalReason]
    );

    // 5. Recalculate review quorum
    await client.query(
      `UPDATE pull_requests
       SET review_decision = (
             SELECT CASE
               WHEN pull_requests.status IN ('merged', 'closed') THEN pull_requests.review_decision
               WHEN pull_requests.status = 'draft' THEN 'draft'
               WHEN EXISTS (
                 SELECT 1 FROM pr_reviews
                 WHERE pr_id = $1
                   AND action = 'changes_requested'
                   AND is_dismissed = false
               ) THEN 'changes_requested'
               WHEN (SELECT required_approvals FROM repositories WHERE id = pull_requests.repo_id) = 0 THEN 'not_required'
               WHEN (
                 SELECT COUNT(*) FROM pr_reviews
                 WHERE pr_id = $1
                   AND action = 'approved'
                   AND is_dismissed = false
                   AND reviewer_id != pull_requests.author_id
               ) >= (SELECT required_approvals FROM repositories WHERE id = pull_requests.repo_id) THEN 'approved'
               ELSE 'pending'
             END
           ),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [prId]
    );

    // 6. Journal sequence event
    await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'pr:review',
      payload: {
        reviewId,
        dismissed: true,
        dismissedById: adminUserId,
        dismissalReason: body.dismissalReason,
      },
    });

    return {
      success: true,
      dismissedReviewId: reviewId,
    };
  });
}
