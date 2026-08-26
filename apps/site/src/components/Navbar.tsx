import { GITHUB_URL } from '@/lib/utils';
import { ArrowRight, GithubLogo } from '@phosphor-icons/react';

const links = [
  { href: '/#problem', label: 'Problem' },
  { href: '/#cockpit', label: 'Cockpit' },
  { href: '/#briefs', label: 'Briefs' },
  { href: '/docs/getting-started', label: 'Docs' },
  { href: 'http://localhost:5174', label: 'Launch Cockpit' },
];

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg/70 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <a href="/" className="flex items-center gap-2.5" aria-label="Crux home">
          <img src="/crux-logo.webp" alt="" className="h-7 w-7 rounded-md" />
          <span className="text-lg font-semibold tracking-tight">Crux</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Crux on GitHub"
            className="hidden h-9 w-9 items-center justify-center rounded-[10px] border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink sm:flex"
          >
            <GithubLogo size={17} weight="fill" />
          </a>
          <a
            href="/docs/getting-started"
            className="flex h-9 items-center gap-1.5 rounded-[10px] bg-ink px-3.5 text-sm font-medium text-bg transition-transform active:scale-[0.98]"
          >
            Get started
            <ArrowRight size={14} weight="bold" />
          </a>
        </div>
      </div>
    </header>
  );
}
