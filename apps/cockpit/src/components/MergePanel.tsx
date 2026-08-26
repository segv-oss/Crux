import { api } from '@/lib/api';
import type { PrT, ReviewT } from '@/lib/fixtures';
import { cn } from '@/lib/utils';
import { CheckCircle, Lock, XCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { MonoLabel } from './ui';

export function MergePanel({
  pr,
  reviews,
  requiredApprovals,
  onMerged,
}: {
  pr: PrT;
  reviews: ReviewT[];
  requiredApprovals: number;
  onMerged: () => void;
}) {
  const [merging, setMerging] = useState(false);
  const [merged, setMerged] = useState(pr.status === 'merged');
  const [error, setError] = useState<string | null>(null);

  const approvals = reviews.filter((r) => r.action === 'approved' && !r.isDismissed).length;
  const blocking = reviews.filter((r) => r.action === 'changes_requested' && !r.isDismissed).length;
  const checksOk = pr.checks === 'passing';

  const conditions = [
    { ok: approvals >= requiredApprovals, label: `approvals ${approvals}/${requiredApprovals}` },
    {
      ok: blocking === 0,
      label:
        blocking > 0
          ? `${blocking} blocking review${blocking > 1 ? 's' : ''}`
          : 'no blocking reviews',
    },
    { ok: checksOk, label: `CI ${pr.checks}` },
    { ok: pr.status !== 'draft', label: pr.status === 'draft' ? 'not draft' : 'ready' },
  ];
  const canMerge = conditions.every((c) => c.ok) && !merged;

  const merge = async () => {
    setMerging(true);
    setError(null);
    try {
      await api.mergePr(pr.repoId, pr.id, {
        expectedHeadSha: pr.headSha,
        expectedVersion: pr.version,
        mergeMethod: 'squash',
      });
      setMerged(true);
      onMerged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-2.5 border-t border-line pt-4">
      <div className="flex items-center justify-between">
        <MonoLabel>Merge</MonoLabel>
        <span className="flex items-center gap-1 font-mono text-[9px] text-ink-faint">
          <Lock size={9} />
          squash
        </span>
      </div>
      <div className="space-y-1">
        {conditions.map((c) => (
          <p key={c.label} className="flex items-center gap-1.5 text-[11px]">
            {c.ok ? (
              <CheckCircle size={11} weight="fill" className="text-ok" />
            ) : (
              <XCircle size={11} weight="fill" className="text-err" />
            )}
            <span className={c.ok ? 'text-ink-muted' : 'text-err'}>{c.label}</span>
          </p>
        ))}
      </div>
      {merged ? (
        <p className="flex h-8 items-center justify-center gap-1.5 rounded-[10px] bg-ok-soft font-mono text-[11px] text-ok">
          <CheckCircle size={13} weight="fill" />
          MERGED
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void merge()}
          disabled={!canMerge || merging}
          className={cn(
            'flex h-8 w-full items-center justify-center gap-1.5 rounded-[10px] text-xs font-medium transition-transform active:scale-[0.98]',
            canMerge && !merging
              ? 'bg-ok text-bg hover:brightness-110'
              : 'cursor-not-allowed bg-surface-2 text-ink-faint',
          )}
        >
          {merging ? 'Merging…' : canMerge ? 'Merge squash' : 'Merge blocked'}
        </button>
      )}
      {error && <p className="text-[10px] text-err">{error}</p>}
    </div>
  );
}
