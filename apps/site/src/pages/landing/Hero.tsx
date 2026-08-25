import { GITHUB_URL } from '@/lib/utils';
import { ArrowRight, GithubLogo } from '@phosphor-icons/react';

export function Hero() {
  return (
    <section id="hero" className="relative min-h-[100dvh] overflow-hidden pt-16">
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div className="bg-fade absolute inset-0" aria-hidden="true" />
      <div className="container-x relative grid min-h-[calc(100dvh-4rem)] items-center gap-14 pb-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p data-h className="mono-label flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Open source · Real-time collaboration
          </p>
          <h1 className="mt-6 text-5xl leading-[1.04] tracking-tighter sm:text-6xl lg:text-7xl">
            <span data-h className="block">
              Every thread.
            </span>
            <span data-h className="block">
              One point of <span className="text-accent">focus</span>.
            </span>
          </h1>
          <p data-h className="mt-6 max-w-[44ch] text-lg leading-relaxed text-ink-muted">
            Pull requests, tasks, and team discussions. Unified in one real-time cockpit.
          </p>
          <div data-h className="mt-9 flex flex-wrap items-center gap-3">
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
        <div className="relative mx-auto aspect-square w-full max-w-[380px] lg:max-w-[500px]">
          <div className="orbit absolute inset-0" aria-hidden="true">
            <span className="absolute top-[6%] left-[54%] h-1.5 w-1.5 rounded-full bg-zinc-600" />
            <span className="absolute right-[10%] bottom-[20%] h-1.5 w-1.5 rounded-full bg-zinc-500" />
            <span
              className="absolute bottom-[8%] left-[16%] h-1.5 w-1.5 rounded-full bg-accent"
              style={{ animation: 'crux-pulse 3s ease-in-out infinite' }}
            />
          </div>
          <div data-mark className="relative h-full w-full will-change-transform">
            <span
              data-mark-ring
              className="pointer-events-none absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent opacity-0"
              aria-hidden="true"
            />
            <img
              data-mark-img
              src="/crux-logo.webp"
              alt="Crux mark"
              className="h-full w-full cursor-pointer select-none"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
