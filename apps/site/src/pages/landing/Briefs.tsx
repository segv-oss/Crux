import { Database, Flask, Pulse, ShieldCheck } from '@phosphor-icons/react';

const points = [
  {
    icon: Pulse,
    title: 'Critical-path analysis',
    body: 'Spots changes that cascade across services before they merge.',
  },
  {
    icon: Database,
    title: 'Schema & contract detection',
    body: 'Flags migrations and breaking API changes automatically.',
  },
  {
    icon: Flask,
    title: 'Test coverage gaps',
    body: 'Names the paths your diff leaves untested.',
  },
  {
    icon: ShieldCheck,
    title: 'Security pre-filter',
    body: 'Surfaces auth, secrets, and permission risks first.',
  },
];

export function Briefs() {
  return (
    <section id="briefs" className="scroll-mt-24 border-t border-line py-28 md:py-36">
      <div className="container-x grid items-center gap-16 lg:grid-cols-2">
        <div>
          <h2 className="text-4xl tracking-tighter text-balance sm:text-5xl">
            A reviewer brief, before you ask.
          </h2>
          <p className="mt-4 max-w-[48ch] leading-relaxed text-ink-muted">
            The moment a PR opens, Crux scans the diff and writes the two-minute brief you would
            have written yourself.
          </p>
          <div className="mt-10 space-y-6">
            {points.map((point) => (
              <div key={point.title} data-b="row" className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface text-accent">
                  <point.icon size={17} />
                </span>
                <div>
                  <p className="text-sm font-medium">{point.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{point.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[16px] border border-line bg-surface p-5 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <p className="font-mono text-xs text-ink">payments/refund.ts</p>
              <p className="font-mono text-[10px]">
                <span className="text-ok">+61</span> <span className="text-err">−12</span>
              </p>
            </div>
            <div className="mt-3 space-y-1 font-mono text-[11px] leading-relaxed">
              <p data-b="line" className="text-ink-faint">
                export async function refund(id: string) {'{'}
              </p>
              <p data-b="line" className="relative rounded px-1 text-ink-faint">
                - const rate = await fetchRate(id);
                <span
                  data-b="mark"
                  className="absolute inset-0 rounded bg-err/15 ring-1 ring-err/40"
                />
              </p>
              <p data-b="line" className="text-ink-faint">
                + const rate = await fetchRate(id, {'{ fresh: true }'});
              </p>
              <p data-b="line" className="relative rounded px-1 text-ink-faint">
                + await ledger.append(id, rate);
                <span
                  data-b="mark"
                  className="absolute inset-0 rounded bg-accent/15 ring-1 ring-accent/50"
                />
              </p>
              <p data-b="line" className="text-ink-faint">
                return settle(id, rate);
              </p>
              <p data-b="line" className="text-ink-faint">
                {'}'}
              </p>
            </div>
          </div>
          <div
            data-b="card"
            className="relative mt-5 ml-auto max-w-sm rounded-[16px] border border-accent/40 bg-surface-2 p-5 shadow-2xl shadow-black/50 lg:absolute lg:-bottom-12 lg:right-6 lg:mt-0"
          >
            <p className="flex items-center justify-between font-mono text-[10px] text-accent">
              REVIEWER BRIEF
              <span className="text-ink-faint">scan · 34s</span>
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink-muted">
              <li data-b="bullet" className="flex gap-2">
                <span className="text-accent">·</span> Rate fetch bypasses cache — latency risk on
                refund spikes
              </li>
              <li data-b="bullet" className="flex gap-2">
                <span className="text-accent">·</span> Ledger append is untested — add failure-path
                test
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
