import { DiffView } from '@/components/DiffView';
import { LiveColumn } from '@/components/LiveColumn';
import { MetaColumn } from '@/components/MetaColumn';
import { TopBar } from '@/components/TopBar';
import { api } from '@/lib/api';
import {
  type BriefT,
  DEFAULT_USERS,
  type DiffFileWithLines,
  type FeedEvent,
  type InlineComment,
  type MessageT,
  type PrT,
  type ReviewT,
  type TaskT,
  userById,
} from '@/lib/fixtures';
import { subscribeLive } from '@/lib/live';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

export function CockpitPage() {
  const { repoId = 'repo_crux_core', prId = 'pr_342' } = useParams();
  const [pr, setPr] = useState<PrT | null>(null);
  const [reviews, setReviews] = useState<ReviewT[]>([]);
  const [tasks, setTasks] = useState<TaskT[]>([]);
  const [brief, setBrief] = useState<BriefT | null>(null);
  const [files, setFiles] = useState<DiffFileWithLines[]>([]);
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const feedEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Cockpit · Crux';
    void api.getPr(repoId, prId).then(setPr);
    void api.tasks(repoId, prId).then(setTasks);
    void api.brief(repoId, prId).then(setBrief);
    void api.diff(repoId, prId).then(setFiles);
    void api.comments(repoId, prId).then(setComments);

    Promise.all([api.reviews(repoId, prId), api.messages(repoId, prId)]).then(([revs, msgs]) => {
      setReviews(revs);
      const seeded: FeedEvent[] = [
        ...msgs.map((m: MessageT) => ({
          id: m.id,
          kind: 'message' as const,
          at: m.sentAt,
          message: m,
        })),
        ...revs.map((r: ReviewT) => ({
          id: r.id,
          kind: 'review' as const,
          at: r.createdAt,
          review: r,
        })),
      ].sort((a, b) => a.at.localeCompare(b.at));
      setEvents(seeded);
    });
  }, [repoId, prId]);

  useEffect(() => {
    return subscribeLive(
      repoId,
      prId,
      (ev) => {
        setConnected(true);
        setEvents((prev) => {
          if (prev.some((e) => e.id === ev.id)) return prev;
          return [...prev.slice(-50), ev];
        });

        if (ev.kind === 'task') {
          setTasks((prev) => {
            const exists = prev.some((t) => t.id === ev.task.id);
            if (exists) {
              return prev.map((t) => (t.id === ev.task.id ? ev.task : t));
            }
            return [...prev, ev.task];
          });
        }

        if (ev.kind === 'review') {
          setReviews((prev) => [
            ...prev.filter((r) => r.reviewerId !== ev.review.reviewerId),
            ev.review,
          ]);
          if (ev.review.action === 'approved') {
            setPr((prev) => (prev ? { ...prev, reviewDecision: 'approved' } : prev));
          } else if (ev.review.action === 'changes_requested') {
            setPr((prev) => (prev ? { ...prev, reviewDecision: 'changes_requested' } : prev));
          }
        }

        if (ev.kind === 'checks') {
          setPr((prev) => (prev ? { ...prev, checks: ev.checks } : prev));
        }
      },
      (isConn) => setConnected(isConn),
    );
  }, [repoId, prId]);

  const handleToggleTask = async (task: TaskT) => {
    const updatedDone = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: updatedDone } : t)));
    try {
      const res = await api.toggleTask(repoId, prId, task.id, updatedDone, task.version);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res : t)));
    } catch {
      // Revert on error
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
    }
  };

  const handleSubmitReview = async (
    action: 'approved' | 'changes_requested' | 'comment',
    comment?: string,
  ) => {
    if (!pr) return;
    const res = await api.submitReview(repoId, prId, {
      action,
      comment,
      expectedHeadSha: pr.headSha,
    });
    setReviews((prev) => [...prev.filter((r) => r.reviewerId !== res.reviewerId), res]);
    if (action === 'approved') {
      setPr((prev) => (prev ? { ...prev, reviewDecision: 'approved' } : prev));
    } else if (action === 'changes_requested') {
      setPr((prev) => (prev ? { ...prev, reviewDecision: 'changes_requested' } : prev));
    }
  };

  const handleSendMessage = async (text: string) => {
    const msg = await api.sendMessage(repoId, prId, text);
    const ev: FeedEvent = {
      id: msg.id,
      kind: 'message',
      at: msg.sentAt,
      message: msg,
    };
    setEvents((prev) => [...prev, ev]);
  };

  const handleRegenerateBrief = async () => {
    const regenerated = await api.regenerateBrief(repoId, prId);
    if (regenerated) setBrief(regenerated);
  };

  const users = useMemo(() => {
    const map: Record<string, ReturnType<typeof userById>> = {};
    for (const u of DEFAULT_USERS) {
      map[u.id] = u;
    }
    if (pr) map[pr.authorId] = userById(pr.authorId);
    for (const r of reviews) map[r.reviewerId] = userById(r.reviewerId);
    return map;
  }, [pr, reviews]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new feed events
  useEffect(() => {
    feedEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events.length]);

  if (!pr) {
    return (
      <div className="flex h-dvh flex-col">
        <TopBar repoName="crux-oss/crux-core" />
        <div className="flex flex-1 items-center justify-center text-sm text-ink-faint">
          Loading cockpit…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <TopBar repoName="crux-oss/crux-core" />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <MetaColumn
          pr={pr}
          tasks={tasks}
          reviews={reviews}
          users={users}
          onMerged={() => setPr((p) => (p ? { ...p, status: 'merged' } : p))}
          onToggleTask={handleToggleTask}
          onSubmitReview={handleSubmitReview}
        />
        <section className="min-h-0 overflow-hidden border-r border-line">
          <DiffView
            files={files}
            comments={comments}
            onAddComment={(c) => setComments((prev) => [...prev, c])}
            repoId={repoId}
            prId={prId}
          />
        </section>
        <LiveColumn
          brief={brief}
          events={events}
          connected={connected}
          onSendMessage={handleSendMessage}
          onRegenerateBrief={handleRegenerateBrief}
        />
        <div ref={feedEnd} />
      </div>
    </div>
  );
}
