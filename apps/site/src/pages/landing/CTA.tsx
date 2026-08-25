import { GITHUB_URL } from '@/lib/utils';
import { ArrowRight, GithubLogo } from '@phosphor-icons/react';

export function CTA() {
  return (
    <section id="cta" className="relative overflow-hidden border-t border-line py-32 md:py-44">
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 15%, var(--color-bg) 75%)',
        }}
        aria-hidden="true"
      />
      <div className="container-x relative text-center">
        <h2 data-c className="text-5xl tracking-tighter text-balance sm:text-6xl lg:text-7xl">
          Stop switching. <span className="text-accent">Start shipping.</span>
        </h2>
        <p data-c className="mx-auto mt-6 max-w-[46ch] leading-relaxed text-ink-muted">
          Free for small teams. Open source forever.
        </p>
        <div data-c className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/docs/getting-started"
            className="flex h-11 items-center gap-2 rounded-[10px] bg-ink px-5 text-sm font-medium text-bg transition-transform active:scale-[0.98]"
          >
            Get started
            <ArrowRight size={15} weight="bold" />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center gap-2 rounded-[10px] border border-line px-5 text-sm font-medium text-ink transition-colors hover:border-line-strong"
          >
            <GithubLogo size={16} weight="fill" />
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
