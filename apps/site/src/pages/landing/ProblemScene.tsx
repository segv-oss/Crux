import { cn } from '@/lib/utils';

const WINS = [
  { key: 'slack', x: -1, y: -0.85, r: -5, rx: -120, ry: -42, rr: -6 },
  { key: 'linear', x: 1, y: -0.55, r: 4, rx: 120, ry: -30, rr: 5 },
  { key: 'github', x: -0.75, y: 1, r: -3, rx: 0, ry: 58, rr: -2.5 },
] as const;

const PAIRS: Array<[(typeof WINS)[number]['key'], (typeof WINS)[number]['key']]> = [
  ['slack', 'linear'],
  ['linear', 'github'],
  ['github', 'slack'],
];

function SlackWindow() {
  return (
    <div className="w-[320px] rounded-[12px] border border-line bg-surface shadow-2xl shadow-black/50 sm:w-[380px] lg:w-[420px]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="font-mono text-xs text-ink"># pr-review</p>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] text-accent">
          3 new
        </span>
      </div>
      <div className="space-y-3 px-4 py-3.5">
        <div className="flex gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 font-mono text-[9px] text-ink-muted">
            DK
          </span>
          <div>
            <p className="text-xs">
              <span className="font-medium">dana.k</span>
              <span className="ml-1.5 text-ink-faint">2:14 PM</span>
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
              the migration diff looks bigger than the ticket — thoughts?
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 font-mono text-[9px] text-ink-muted">
            AR
          </span>
          <div>
            <p className="text-xs">
              <span className="font-medium">arun</span>
              <span className="ml-1.5 text-ink-faint">1:58 PM</span>
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
              reviewing after standup, ping me if CI is red
            </p>
          </div>
        </div>
        <p className="pl-8 text-xs font-medium text-accent">4 replies in thread →</p>
      </div>
    </div>
  );
}

function LinearWindow() {
  const rows = [
    { id: 'CRX-214', title: 'Rate-limit auth endpoints', dot: 'bg-accent', state: 'In Progress' },
    { id: 'CRX-219', title: 'Add backoff to refresh flow', dot: 'bg-ink-faint', state: 'Todo' },
    { id: 'CRX-207', title: 'Audit token rotation', dot: 'bg-ok', state: 'Done' },
  ];
  return (
    <div className="w-[320px] rounded-[12px] border border-line bg-surface shadow-2xl shadow-black/50 sm:w-[380px] lg:w-[420px]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="font-mono text-xs text-ink">Sprint 24</p>
        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-ink-faint">
          3 issues
        </span>
      </div>
      <div className="space-y-1 px-2 py-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', row.dot)} />
            <span className="font-mono text-[10px] text-ink-faint">{row.id}</span>
            <span className="truncate text-xs text-ink">{row.title}</span>
            <span className="ml-auto shrink-0 font-mono text-[9px] text-ink-faint">
              {row.state}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GithubWindow() {
  return (
    <div className="w-[320px] rounded-[12px] border border-line bg-surface shadow-2xl shadow-black/50 sm:w-[380px] lg:w-[420px]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="font-mono text-xs text-ink">crux/api · #482</p>
        <p className="font-mono text-[10px]">
          <span className="text-ok">+142</span> <span className="text-err">−38</span>
        </p>
      </div>
      <div className="space-y-1 px-4 py-3 font-mono text-[11px] leading-relaxed">
        <p className="text-ink-faint">export async function limit(ip: string) {'{'}</p>
        <p className="rounded bg-err/10 px-1 text-err">- const max = 100;</p>
        <p className="rounded bg-ok/10 px-1 text-ok">+ const max = await tier(ip);</p>
        <p className="rounded bg-ok/10 px-1 text-ok">+ return tokenBucket(ip, max);</p>
        <p className="text-ink-faint">{'}'}</p>
      </div>
      <div className="border-t border-line px-4 py-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-warn">
          <span className="h-1.5 w-1.5 rounded-full bg-warn" />
          CI · pending
        </span>
      </div>
    </div>
  );
}

function FramePrCol() {
  return (
    <div className="flex h-full flex-col gap-2.5 p-6">
      <p className="mono-label">Pull request</p>
      <p className="text-xs font-medium text-ink">#482 Rate-limit auth endpoints</p>
      <p className="font-mono text-[10px] text-ink-faint">dana.k · feat/rate-limit-auth</p>
      <div className="my-1 border-t border-line" />
      <div className="space-y-1 font-mono text-[10px]">
        <p className="text-ink-faint">export async function limit(ip) {'{'}</p>
        <p className="rounded bg-err/10 px-1 text-err">- const max = 100;</p>
        <p className="rounded bg-ok/10 px-1 text-ok">+ const max = await tier(ip);</p>
        <p className="rounded bg-ok/10 px-1 text-ok">+ return bucket(ip, max);</p>
        <p className="rounded bg-ok/10 px-1 text-ok">+ export const limits = tiers;</p>
        <p className="text-ink-faint">{'}'}</p>
      </div>
      <div className="rounded-[8px] border border-line bg-surface-2/60 p-2">
        <p className="text-[10px] leading-relaxed text-ink-muted">
          <span className="font-medium text-ink">arun:</span> fallback if redis is down?
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-2 font-mono text-[8px] text-ink-muted">
          AR
        </span>
        <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-2 font-mono text-[8px] text-ink-muted">
          JM
        </span>
        <span className="text-[10px] text-ink-faint">review requested</span>
      </div>
      <p className="mt-auto flex items-center gap-1.5 font-mono text-[10px] text-ok">
        <span className="h-1.5 w-1.5 rounded-full bg-ok" />
        checks passing · 41s
      </p>
    </div>
  );
}

function FrameTaskCol() {
  return (
    <div className="flex h-full flex-col gap-2.5 p-6">
      <p className="mono-label">Task</p>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] text-ink">CRX-214</p>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[9px] text-accent">
          In Review
        </span>
      </div>
      <p className="text-xs text-ink-muted">Rate-limit auth endpoints</p>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full w-2/3 rounded-full bg-accent" />
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-2 font-mono text-[8px] text-ink-muted">
          DK
        </span>
        <span className="text-[10px] text-ink-faint">dana.k · due tomorrow</span>
      </div>
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-[11px] text-ink-muted">
          <span className="text-ok">✓</span> tier limits defined
        </p>
        <p className="flex items-center gap-2 text-[11px] text-ink-muted">
          <span className="text-ok">✓</span> redis fallback noted
        </p>
        <p className="flex items-center gap-2 text-[11px] text-ink-muted">
          <span className="text-ok">✓</span> pr linked to sprint
        </p>
        <p className="flex items-center gap-2 text-[11px] text-ink-faint">
          <span className="text-ink-faint">·</span> load test staging
        </p>
      </div>
      <p className="mt-auto flex items-center gap-1.5 font-mono text-[10px] text-ink-faint">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        moved to review · 2m ago
      </p>
    </div>
  );
}

function FrameThreadsCol() {
  return (
    <div className="flex h-full flex-col gap-2.5 p-6">
      <p className="mono-label">Threads</p>
      <div className="rounded-[10px] border border-line bg-surface-2/60 p-2.5">
        <p className="text-[10px] text-ink-faint">arun · just now</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
          Can we fall back to defaults if Redis is down?
        </p>
      </div>
      <div className="rounded-[10px] border border-line bg-surface-2/60 p-2.5">
        <p className="text-[10px] text-ink-faint">dana.k · 1m</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
          adding a tier default today
        </p>
      </div>
      <div className="rounded-[10px] border border-line bg-surface-2/60 p-2.5">
        <p className="text-[10px] text-ink-faint">jm · 2m</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
          CI is green, lgtm otherwise
        </p>
      </div>
      <p className="text-[11px] font-medium text-accent">4 replies in thread →</p>
      <div className="mt-auto flex h-7 items-center rounded-full border border-line px-3">
        <p className="text-[10px] text-ink-faint">Reply synced to Slack…</p>
      </div>
    </div>
  );
}

export function ProblemScene() {
  return (
    <section id="problem">
      <div data-ps-track style={{ height: '340dvh' }}>
        <div className="sticky top-0 h-dvh overflow-hidden">
          <div className="bg-grid absolute inset-0" aria-hidden="true" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 20%, var(--color-bg) 78%)',
            }}
            aria-hidden="true"
          />

          <div className="absolute top-[8vh] left-1/2 w-full -translate-x-1/2 px-6 text-center">
            <h2
              data-ps="ha"
              className="text-4xl tracking-tighter text-balance sm:text-6xl lg:text-7xl"
            >
              Three tools. Zero cohesion.
            </h2>
            <h2
              data-ps="hb"
              className="absolute inset-x-0 top-0 text-4xl tracking-tighter opacity-0 sm:text-6xl lg:text-7xl"
            >
              Crux is where they meet.
            </h2>
          </div>

          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            {PAIRS.map(([a, b]) => (
              <line
                key={`${a}-${b}`}
                data-ps-line={`${a}-${b}`}
                stroke="var(--color-line-strong)"
                strokeWidth="1.5"
                opacity="0"
              />
            ))}
          </svg>

          <div
            data-ps="frame"
            className="absolute top-1/2 left-1/2 flex h-[58vh] max-h-[560px] w-[92vw] max-w-[1040px] flex-col overflow-hidden rounded-[16px] border border-line-strong bg-surface/80 opacity-0 shadow-2xl shadow-black/60 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-2" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-2" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-2" />
              <p className="ml-3 font-mono text-[11px] text-ink-faint">crux · cockpit</p>
              <span className="ml-auto rounded-full bg-ok/15 px-2 py-0.5 font-mono text-[9px] text-ok">
                LIVE
              </span>
            </div>
            <div data-ps="frame-cols" className="grid flex-1 grid-cols-3 opacity-0">
              <div className="border-r border-line">
                <FramePrCol />
              </div>
              <div className="border-r border-line">
                <FrameTaskCol />
              </div>
              <div>
                <FrameThreadsCol />
              </div>
            </div>
            <div
              data-ps="point"
              className="pointer-events-none absolute top-1/2 left-1/2 h-2 w-2 opacity-0"
              style={{ transform: 'translate(-50%, -50%)' }}
              aria-hidden="true"
            >
              <span className="block h-2 w-2 rounded-full bg-accent" />
              <span
                className="absolute -inset-1 rounded-full bg-accent/50"
                style={{ animation: 'crux-ring 2.2s ease-out infinite' }}
              />
            </div>
          </div>

          <div
            data-ps="slack"
            className="absolute top-1/2 left-1/2"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <SlackWindow />
          </div>
          <div
            data-ps="github"
            className="absolute top-1/2 left-1/2"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <GithubWindow />
          </div>
          <div
            data-ps="linear"
            className="absolute top-1/2 left-1/2"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <LinearWindow />
          </div>

          {PAIRS.map(([a, b], i) => (
            <span
              key={`${a}-${b}`}
              data-ps={`chip-${i}`}
              className="absolute rounded-full border border-err/40 bg-bg/85 px-2.5 py-1 font-mono text-[10px] text-err opacity-0"
              style={{ pointerEvents: 'none' }}
            >
              context lost
            </span>
          ))}

          <div className="absolute bottom-[7vh] left-1/2 flex w-full -translate-x-1/2 flex-wrap justify-center gap-2.5 px-6">
            {[
              '2–3 hrs lost · dev · week',
              'PRs stale in review',
              'Decisions buried in threads',
            ].map((label, i) => (
              <span
                key={label}
                data-ps={`stat-${i}`}
                className="rounded-full border border-line bg-bg/70 px-3.5 py-1.5 font-mono text-[11px] text-ink-muted opacity-0 backdrop-blur-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
