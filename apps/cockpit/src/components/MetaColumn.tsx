import type { PrT, ReviewT, TaskT, UserT } from '@/lib/fixtures';
import {
  ArrowRight,
  CheckCircle,
  CircleNotch,
  GitBranch,
  PaperPlaneRight,
  Plus,
  Rocket,
  ShieldCheck,
  X,
  XCircle,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { MergePanel } from './MergePanel';
import { Avatar, DecisionPill, MonoLabel, Pill, StatusPill } from './ui';

export function MetaColumn({
  pr,
  tasks,
  reviews,
  users,
  onMerged,
  onToggleTask,
  onSubmitReview,
}: {
  pr: PrT;
  tasks: TaskT[];
  reviews: ReviewT[];
  users: Record<string, UserT>;
  onMerged: () => void;
  onToggleTask?: (task: TaskT) => void;
  onSubmitReview?: (
    action: 'approved' | 'changes_requested' | 'comment',
    comment?: string,
  ) => Promise<void>;
}) {
  const author = users[pr.authorId];
  const openTasks = tasks.filter((t) => !t.done).length;

  const [reviewComposerOpen, setReviewComposerOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'changes_requested' | 'comment'>(
    'approved',
  );
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const handleSubmitReview = async () => {
    if (!onSubmitReview) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await onSubmitReview(reviewAction, reviewComment.trim() || undefined);
      setReviewComment('');
      setReviewComposerOpen(false);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <aside className="flex h-full flex-col gap-5 overflow-y-auto border-r border-line p-4 scroll-thin">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-sm text-ink">#{pr.number}</p>
          <StatusPill status={pr.status} />
        </div>
        <p className="mt-1 text-sm font-medium leading-snug text-ink">{pr.title}</p>
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
          <Avatar user={author} size={4.5} />
          {author?.name || 'author'} opened {pr.createdAt.slice(0, 10)}
        </p>
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <MonoLabel>Branch</MonoLabel>
        <p className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-ink-muted">
          <GitBranch size={12} className="text-ink-faint" />
          {pr.branch}
          <ArrowRight size={11} className="text-ink-faint" />
          {pr.targetBranch}
        </p>
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <div className="flex items-center justify-between">
          <MonoLabel>Linked tasks</MonoLabel>
          {openTasks > 0 ? (
            <Pill tone="accent">{openTasks} open</Pill>
          ) : (
            <Pill tone="ok">all done</Pill>
          )}
        </div>
        <div className="space-y-1.5">
          {tasks.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => onToggleTask?.(t)}
              className="group flex w-full items-center gap-2 text-left text-xs transition-colors hover:text-ink"
            >
              {t.done ? (
                <CheckCircle size={13} weight="fill" className="shrink-0 text-ok" />
              ) : (
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full border border-line-strong transition-colors group-hover:border-accent ${
                    t.priority === 'p0' ? 'bg-accent/40' : 'bg-surface-2'
                  }`}
                />
              )}
              <span className="font-mono text-[10px] text-ink-faint">{t.linearTaskId}</span>
              <span
                className={
                  t.done
                    ? 'truncate text-ink-faint line-through'
                    : 'truncate text-ink-muted group-hover:text-ink'
                }
              >
                {t.title}
              </span>
            </button>
          ))}
          {tasks.length === 0 && (
            <p className="text-[11px] text-ink-faint">No linked Linear tasks</p>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <div className="flex items-center justify-between">
          <MonoLabel>Reviews</MonoLabel>
          {onSubmitReview && (
            <button
              type="button"
              onClick={() => setReviewComposerOpen(!reviewComposerOpen)}
              className="flex items-center gap-1 font-mono text-[10px] text-accent transition-colors hover:text-ink"
            >
              <Plus size={10} />
              Review
            </button>
          )}
        </div>

        {reviewComposerOpen && (
          <div className="rounded-lg border border-accent/40 bg-surface p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-ink-muted">Submit Review</span>
              <button
                type="button"
                onClick={() => setReviewComposerOpen(false)}
                className="text-ink-faint hover:text-ink"
              >
                <X size={12} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setReviewAction('approved')}
                className={`flex items-center justify-center gap-1 rounded py-1 font-medium transition-colors ${
                  reviewAction === 'approved'
                    ? 'bg-ok-soft text-ok border border-ok/40'
                    : 'bg-surface-2 text-ink-faint hover:text-ink'
                }`}
              >
                <CheckCircle size={10} weight="fill" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => setReviewAction('changes_requested')}
                className={`flex items-center justify-center gap-1 rounded py-1 font-medium transition-colors ${
                  reviewAction === 'changes_requested'
                    ? 'bg-warn-soft text-warn border border-warn/40'
                    : 'bg-surface-2 text-ink-faint hover:text-ink'
                }`}
              >
                <XCircle size={10} weight="fill" />
                Changes
              </button>
              <button
                type="button"
                onClick={() => setReviewAction('comment')}
                className={`flex items-center justify-center gap-1 rounded py-1 font-medium transition-colors ${
                  reviewAction === 'comment'
                    ? 'bg-surface-2 text-ink border border-line-strong'
                    : 'bg-surface-2 text-ink-faint hover:text-ink'
                }`}
              >
                Comment
              </button>
            </div>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Feedback note (optional)..."
              rows={2}
              className="w-full resize-none rounded border border-line bg-bg p-2 text-xs text-ink placeholder:text-ink-faint focus:border-accent/50 focus:outline-none"
            />

            {reviewError && <p className="text-[10px] text-err">{reviewError}</p>}

            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={reviewSubmitting}
              className="flex h-7 w-full items-center justify-center gap-1.5 rounded bg-ink text-[11px] font-medium text-bg transition-opacity disabled:opacity-40"
            >
              {reviewSubmitting ? (
                <CircleNotch size={11} className="animate-spin" />
              ) : (
                <PaperPlaneRight size={11} weight="fill" />
              )}
              {reviewSubmitting ? 'Submitting...' : 'Submit Decision'}
            </button>
          </div>
        )}

        <div className="space-y-1.5">
          {reviews.map((r) => {
            const u = users[r.reviewerId];
            const tone =
              r.action === 'approved'
                ? 'text-ok'
                : r.action === 'changes_requested'
                  ? 'text-warn'
                  : 'text-ink-faint';
            return (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <Avatar user={u} size={4.5} />
                <span className="text-ink-muted">
                  {u?.name || r.reviewerId.replace('usr_', '')}
                </span>
                <span className={`ml-auto font-mono text-[9px] uppercase ${tone}`}>
                  {r.action.replace('_', ' ')}
                </span>
              </div>
            );
          })}
          {reviews.length === 0 && (
            <p className="text-[11px] text-ink-faint">No reviews submitted yet</p>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <MonoLabel>Policy</MonoLabel>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <ShieldCheck size={13} className="text-ink-faint" />1 approval required
        </div>
        <DecisionPill decision={pr.reviewDecision} />
      </div>

      <MergePanel pr={pr} reviews={reviews} requiredApprovals={1} onMerged={onMerged} />

      <div className="mt-auto space-y-2 border-t border-line pt-4">
        <MonoLabel>Deploy</MonoLabel>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Rocket size={13} className="text-ink-faint" />
          staging · deployed
        </div>
      </div>
    </aside>
  );
}
