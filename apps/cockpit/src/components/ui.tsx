import type { UserT } from '@/lib/fixtures';
import { cn, initials } from '@/lib/utils';

export function Pill({
  tone,
  children,
  className,
}: {
  tone: 'ok' | 'err' | 'warn' | 'accent' | 'faint';
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    ok: 'bg-ok-soft text-ok',
    err: 'bg-err-soft text-err',
    warn: 'bg-warn-soft text-warn',
    accent: 'bg-accent-soft text-accent',
    faint: 'bg-surface-2 text-ink-faint',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] leading-4',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: 'ok' | 'err' | 'warn' | 'accent' | 'faint'; label: string }> = {
    open: { tone: 'ok', label: 'OPEN' },
    draft: { tone: 'faint', label: 'DRAFT' },
    merged: { tone: 'accent', label: 'MERGED' },
    closed: { tone: 'err', label: 'CLOSED' },
  };
  const s = map[status] ?? map.open;
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function DecisionPill({ decision }: { decision: string }) {
  const map: Record<string, { tone: 'ok' | 'err' | 'warn' | 'accent' | 'faint'; label: string }> = {
    approved: { tone: 'ok', label: 'APPROVED' },
    changes_requested: { tone: 'warn', label: 'CHANGES' },
    pending: { tone: 'faint', label: 'PENDING' },
    not_required: { tone: 'faint', label: 'NOT REQ' },
    draft: { tone: 'faint', label: 'DRAFT' },
  };
  const d = map[decision] ?? map.pending;
  return <Pill tone={d.tone}>{d.label}</Pill>;
}

export function ChecksPill({ checks }: { checks: string }) {
  const map: Record<string, { tone: 'ok' | 'err' | 'warn' | 'faint'; label: string }> = {
    passing: { tone: 'ok', label: 'PASSING' },
    failing: { tone: 'err', label: 'FAILING' },
    pending: { tone: 'warn', label: 'PENDING' },
  };
  const c = map[checks] ?? map.pending;
  return <Pill tone={c.tone}>{c.label}</Pill>;
}

export function Avatar({ user, size = 5 }: { user: UserT; size?: number }) {
  return (
    <span
      title={user.name}
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
      className="flex shrink-0 items-center justify-center rounded bg-surface-2 font-mono text-[9px] text-ink-muted"
    >
      {initials(user.name)}
    </span>
  );
}

export function MonoLabel({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return <p className={cn('mono-label', className)}>{children}</p>;
}
