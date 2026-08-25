export function Sandbox() {
  const cmd = 'crux sandbox open 482';

  return (
    <section id="sandbox" className="scroll-mt-24 pb-28 md:pb-36">
      <div className="container-x">
        <div className="grid items-center gap-12 overflow-hidden rounded-[16px] border border-line bg-surface p-8 md:grid-cols-2 md:p-12">
          <div data-s="copy">
            <p className="mono-label flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" />
              Sandbox · in the works
            </p>
            <h2 className="mt-5 text-3xl tracking-tighter text-balance sm:text-4xl">
              Test the PR. Not your patience.
            </h2>
            <p className="mt-4 max-w-[46ch] leading-relaxed text-ink-muted">
              One-click, production-like environments for every pull request. No local setup, no
              stale branches, no "trust me, it works".
            </p>
          </div>
          <div className="rounded-[12px] border border-line bg-bg p-4 font-mono text-xs">
            <p className="flex items-center gap-2 border-b border-line pb-3 text-ink-faint">
              <span className="h-2 w-2 rounded-full bg-surface-2" />
              guest · sandbox
            </p>
            <p className="mt-4 text-ink">
              <span className="text-accent">$</span>{' '}
              {cmd
                .split('')
                .map((ch, i) => ({ ch, id: `${i}-${ch}` }))
                .map(({ ch, id }) => (
                  <span key={id} data-s="char">
                    {ch}
                  </span>
                ))}
              <span className="caret" />
            </p>
            <p data-s="out" className="mt-2 text-ok">
              ● environment ready · 41s · 3 users synced
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
