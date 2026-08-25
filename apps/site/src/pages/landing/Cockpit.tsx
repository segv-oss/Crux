function DiffLine({ type, text }: { type: 'ctx' | 'add' | 'del'; text: string }) {
  const tone =
    type === 'add' ? 'bg-ok/10 text-ok' : type === 'del' ? 'bg-err/10 text-err' : 'text-ink-faint';
  const sign = type === 'add' ? '+' : type === 'del' ? '-' : ' ';
  return (
    <p data-cx="diff" className={`rounded px-1 font-mono text-[11px] leading-relaxed ${tone}`}>
      {sign} {text}
    </p>
  );
}

export function Cockpit() {
  return (
    <section id="cockpit" className="scroll-mt-24 py-28 md:py-36">
      <div>
        <div className="container-x">
          <div className="max-w-xl">
            <p className="mono-label flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              The product
            </p>
            <h2 className="mt-5 text-4xl tracking-tighter text-balance sm:text-5xl">
              The Cockpit.
            </h2>
            <p className="mt-4 max-w-[52ch] leading-relaxed text-ink-muted">
              Every pull request with its tasks, threads, and checks attached. One glance, full
              context.
            </p>
          </div>

          <div className="mt-14 overflow-hidden rounded-[16px] border border-line bg-surface shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-2" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-2" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-2" />
              <p className="ml-3 font-mono text-[11px] text-ink-faint">
                crux · crux/api · pull #482
              </p>
            </div>
            <div className="grid grid-cols-1 md:h-[430px] md:grid-cols-[250px_1fr_270px]">
              <div className="hidden border-r border-line p-4 md:block">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">#482 Rate-limit auth</p>
                  <span className="rounded-full bg-ok/15 px-2 py-0.5 font-mono text-[9px] text-ok">
                    OPEN
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-ink-faint">opened by dana.k · 2h ago</p>
                <div className="mt-5 space-y-2.5 border-t border-line pt-4 text-xs">
                  <p className="mono-label">Linked task</p>
                  <p className="flex items-center gap-2 font-mono text-[11px] text-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    CRX-214
                  </p>
                  <p className="text-ink-faint">Rate-limit auth endpoints</p>
                </div>
                <div className="mt-5 space-y-2.5 border-t border-line pt-4 text-xs">
                  <p className="mono-label">Reviewers</p>
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-2 font-mono text-[8px] text-ink-muted">
                      AR
                    </span>
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-2 font-mono text-[8px] text-ink-muted">
                      JM
                    </span>
                    <span className="text-ink-faint">awaiting review</span>
                  </div>
                </div>
                <div className="mt-5 space-y-2 border-t border-line pt-4 font-mono text-[10px] text-ink-faint">
                  <p>feat/rate-limit-auth → main</p>
                  <p className="text-ok">staging · deployed</p>
                </div>
              </div>

              <div className="border-b border-line p-4 md:border-r md:border-b-0">
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <p className="font-mono text-xs text-ink">auth/limiter.ts</p>
                  <p className="font-mono text-[10px]">
                    <span className="text-ok">+24</span> <span className="text-err">−6</span>
                  </p>
                </div>
                <div className="mt-3 space-y-1">
                  <DiffLine type="ctx" text="export async function limit(ip: string) {" />
                  <DiffLine type="del" text="const max = 100;" />
                  <DiffLine type="add" text="const max = await tier(ip);" />
                  <DiffLine type="add" text="return tokenBucket(ip, max);" />
                  <DiffLine type="ctx" text="}" />
                </div>
                <div
                  data-cx="comment"
                  className="mt-4 rounded-[10px] border border-line bg-surface-2 p-3"
                >
                  <p className="text-xs">
                    <span className="font-medium">arun</span>
                    <span className="ml-1.5 text-ink-faint">commented · 2m</span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Can we fall back to defaults if Redis is down?
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 p-4">
                <p className="mono-label">Live sync</p>
                <div
                  data-cx="lin-old"
                  className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5"
                >
                  <p className="font-mono text-[11px] text-ink">CRX-214</p>
                  <p className="flex items-center gap-1.5 font-mono text-[10px] text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    In Progress
                  </p>
                </div>
                <div
                  data-cx="lin-new"
                  className="flex items-center justify-between rounded-[10px] border border-accent/40 px-3 py-2.5"
                >
                  <p className="font-mono text-[11px] text-ink">CRX-214</p>
                  <p className="flex items-center gap-1.5 font-mono text-[10px] text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    In Review
                  </p>
                </div>
                <div
                  data-cx="slack"
                  className="rounded-[10px] border border-line px-3 py-2.5 text-xs leading-relaxed text-ink-muted"
                >
                  <p className="font-mono text-[10px] text-ink-faint">#pr-review · just now</p>
                  <p className="mt-1">arun: left comments on limiter.ts</p>
                </div>
                <div
                  data-cx="ci-pending"
                  className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5"
                >
                  <p className="font-mono text-[11px] text-ink-muted">build / test</p>
                  <p className="font-mono text-[10px] text-warn">
                    <span data-cx="spinner" className="inline-block">
                      ◌
                    </span>{' '}
                    pending
                  </p>
                </div>
                <div
                  data-cx="ci-pass"
                  className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5"
                >
                  <p className="font-mono text-[11px] text-ink-muted">build / test</p>
                  <p className="font-mono text-[10px] text-ok">✓ passing · 41s</p>
                </div>
                <div
                  data-cx="brief"
                  className="rounded-[10px] border border-accent/40 bg-accent-soft/40 p-3"
                >
                  <p className="flex items-center justify-between font-mono text-[10px] text-accent">
                    REVIEWER BRIEF
                    <span className="text-ink-faint">2 flags</span>
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-ink-muted">
                    <li data-cx="bullet" className="flex gap-1.5">
                      <span className="text-accent">·</span> Auth path changed — hot traffic route
                    </li>
                    <li data-cx="bullet" className="flex gap-1.5">
                      <span className="text-accent">·</span> No schema or contract changes
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
