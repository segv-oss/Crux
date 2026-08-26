import { TopBar } from '@/components/TopBar';
import { Avatar, ChecksPill, DecisionPill, StatusPill } from '@/components/ui';
import { api } from '@/lib/api';
import { type PrT, userById } from '@/lib/fixtures';
import { timeAgo } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function PrsPage() {
  const [prs, setPrs] = useState<PrT[] | null>(null);

  useEffect(() => {
    document.title = 'Pull Requests · Crux Cockpit';
    api.listPrs().then(setPrs);
  }, []);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar repoName="crux-oss/crux-core" />
      <main className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="text-2xl tracking-tight">Pull requests</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {prs
              ? `${prs.filter((p) => p.status === 'open').length} open · ${prs.length} total`
              : 'loading…'}
          </p>

          <div className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {prs?.map((pr) => {
              const author = (pr as any).author?.name
                ? {
                    id: pr.authorId,
                    name: (pr as any).author.name,
                    email: (pr as any).author.email || '',
                    avatarUrl: (pr as any).author.avatarUrl || '',
                    createdAt: pr.createdAt,
                    updatedAt: pr.updatedAt,
                    githubId: '100',
                  }
                : userById(pr.authorId);

              return (
                <Link
                  key={pr.id}
                  to={`/prs/${pr.repoId}/${pr.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      <span className="mr-2 font-mono text-xs text-ink-faint">#{pr.number}</span>
                      {pr.title}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-ink-faint">
                      <Avatar user={author} size={4} />
                      {author.name} · {pr.branch} → {pr.targetBranch} · updated{' '}
                      {timeAgo(pr.updatedAt)} ago
                    </p>
                  </div>
                  <p className="hidden shrink-0 font-mono text-[11px] sm:block">
                    <span className="text-ok">+{pr.additions}</span>{' '}
                    <span className="text-err">−{pr.deletions}</span>
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <ChecksPill checks={pr.checks} />
                    <DecisionPill decision={pr.reviewDecision} />
                    <StatusPill status={pr.status} />
                  </div>
                </Link>
              );
            })}
            {!prs && (
              <div className="px-4 py-10 text-center text-sm text-ink-faint">
                Loading pull requests…
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
