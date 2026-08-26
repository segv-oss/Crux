import type { BriefT, FeedEvent, ReviewT, UserT } from '@/lib/fixtures';
import { userById } from '@/lib/fixtures';
import { cn, timeAgo } from '@/lib/utils';
import {
  ArrowsClockwise,
  CheckCircle,
  CircleNotch,
  PaperPlaneRight,
  Sparkle,
  XCircle,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Avatar, MonoLabel, Pill } from './ui';

export function LiveColumn({
  brief,
  events,
  connected,
  onSendMessage,
  onRegenerateBrief,
}: {
  brief: BriefT | null;
  events: FeedEvent[];
  connected: boolean;
  onSendMessage?: (text: string) => Promise<void>;
  onRegenerateBrief?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !onSendMessage) return;
    setSending(true);
    try {
      await onSendMessage(text);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  const handleReanalyze = async () => {
    if (!onRegenerateBrief) return;
    setReanalyzing(true);
    try {
      await onRegenerateBrief();
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <aside className="flex h-full flex-col overflow-hidden border-l border-line">
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        {brief && (
          <BriefCard brief={brief} onReanalyze={handleReanalyze} reanalyzing={reanalyzing} />
        )}
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <MonoLabel>Live sync</MonoLabel>
          <span
            className={cn(
              'flex items-center gap-1.5 font-mono text-[10px]',
              connected ? 'text-ok' : 'text-ink-faint',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                connected ? 'bg-ok live-dot' : 'bg-ink-faint',
              )}
            />
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <div className="space-y-1 px-3 pb-4">
          {events.map((ev) => (
            <FeedRow key={ev.id} ev={ev} />
          ))}
          {events.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-ink-faint">
              Watching for teammate activity…
            </p>
          )}
        </div>
      </div>

      {onSendMessage && (
        <div className="border-t border-line bg-surface/50 p-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Post update or comment…"
              className="min-w-0 flex-1 rounded-md border border-line bg-bg px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-accent/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink text-bg transition-opacity disabled:opacity-40"
            >
              {sending ? (
                <CircleNotch size={12} className="animate-spin" />
              ) : (
                <PaperPlaneRight size={12} weight="fill" />
              )}
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}

function BriefCard({
  brief,
  onReanalyze,
  reanalyzing,
}: {
  brief: BriefT;
  onReanalyze?: () => void;
  reanalyzing?: boolean;
}) {
  const riskTone = brief.risk === 'high' ? 'err' : brief.risk === 'medium' ? 'warn' : 'ok';
  return (
    <div className="border-b border-line p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-mono text-[10px] text-accent">
          <Sparkle size={11} weight="fill" />
          REVIEWER BRIEF
        </p>
        <div className="flex items-center gap-2">
          {onReanalyze && (
            <button
              type="button"
              onClick={onReanalyze}
              disabled={reanalyzing}
              title="Trigger AI Brief re-analysis"
              className="text-ink-faint transition-colors hover:text-ink disabled:opacity-50"
            >
              <ArrowsClockwise size={11} className={reanalyzing ? 'animate-spin' : ''} />
            </button>
          )}
          <Pill tone={riskTone}>{brief.risk.toUpperCase()} RISK</Pill>
        </div>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">{brief.summary}</p>
      <div className="mt-3 flex items-center gap-3 font-mono text-[10px] text-ink-faint">
        <span>~{brief.reviewEstimateMinutes} min review</span>
        <span>coverage {brief.coverageDeltaPercent}%</span>
        <span>{brief.breakingChangesCount} breaking</span>
      </div>
      {brief.suggestedChecklist.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-line pt-3">
          {brief.suggestedChecklist.map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static checklist items
            <p key={`check-${i}`} className="flex gap-2 text-[11px] leading-snug text-ink-muted">
              <span className="text-accent">·</span>
              {typeof item === 'object' && item && 'text' in item
                ? (item as any).text
                : String(item)}
            </p>
          ))}
        </div>
      )}
      <p className="mt-3 font-mono text-[9px] text-ink-faint">
        generated {timeAgo(brief.generatedAt)} ago · scan v18
      </p>
    </div>
  );
}

function FeedRow({ ev }: { ev: FeedEvent }) {
  const users: Record<string, UserT> = {};
  if (ev.kind === 'message') users[ev.message.userId] = userById(ev.message.userId);
  if (ev.kind === 'task' && ev.task.assigneeId)
    users[ev.task.assigneeId] = userById(ev.task.assigneeId);
  if (ev.kind === 'review') users[ev.review.reviewerId] = userById(ev.review.reviewerId);
  const who = Object.values(users)[0];

  return (
    <div
      className={cn(
        'feed-enter rounded-lg border border-transparent px-2.5 py-2',
        ev.kind === 'review' && 'border-line bg-surface',
      )}
    >
      <div className="flex items-center gap-2">
        {ev.kind !== 'checks' && who && <Avatar user={who} size={4.5} />}
        <p className="text-[11px] font-medium text-ink">
          {ev.kind === 'checks' ? 'CI' : who?.name || 'System'}
        </p>
        <span className="ml-auto font-mono text-[9px] text-ink-faint">{timeAgo(ev.at)}</span>
      </div>
      <div className="mt-1 pl-0.5">
        {ev.kind === 'message' && (
          <p className="text-[11.5px] leading-relaxed text-ink-muted">{ev.message.text}</p>
        )}
        {ev.kind === 'task' && (
          <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
            {ev.task.done ? (
              <CheckCircle size={12} weight="fill" className="text-ok" />
            ) : (
              <CircleNotch size={12} className="text-ink-faint" />
            )}
            <span className="font-mono text-[10px] text-ink-faint">{ev.task.linearTaskId}</span>
            {ev.task.done ? 'completed' : 'reopened'}
          </p>
        )}
        {ev.kind === 'review' && <ReviewLine review={ev.review} />}
        {ev.kind === 'checks' && (
          <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
            {ev.checks === 'passing' ? (
              <CheckCircle size={12} weight="fill" className="text-ok" />
            ) : (
              <XCircle size={12} weight="fill" className="text-err" />
            )}
            build / test · {ev.checks}
          </p>
        )}
      </div>
    </div>
  );
}

function ReviewLine({ review }: { review: ReviewT }) {
  const tone =
    review.action === 'approved'
      ? 'text-ok'
      : review.action === 'changes_requested'
        ? 'text-warn'
        : 'text-ink-muted';
  return (
    <div>
      <p className={cn('flex items-center gap-1.5 text-[11px]', tone)}>
        {review.action === 'approved' ? (
          <CheckCircle size={12} weight="fill" />
        ) : (
          <XCircle size={12} weight="fill" />
        )}
        {review.action.replace('_', ' ')}
      </p>
      {review.comment && (
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">{review.comment}</p>
      )}
    </div>
  );
}
