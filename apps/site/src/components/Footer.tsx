import { GITHUB_URL } from '@/lib/utils';
import { GithubLogo } from '@phosphor-icons/react';

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="container-x flex flex-col gap-10 py-14 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <img src="/crux-logo.webp" alt="" className="h-7 w-7 rounded-md" />
            <span className="text-lg font-semibold tracking-tight">Crux</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            The point where pull requests, tasks, and team discussions meet.
          </p>
        </div>
        <div className="flex gap-16">
          <div>
            <p className="mono-label">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="/#cockpit" className="text-ink-muted transition-colors hover:text-ink">
                  The Cockpit
                </a>
              </li>
              <li>
                <a href="/#briefs" className="text-ink-muted transition-colors hover:text-ink">
                  Reviewer Briefs
                </a>
              </li>
              <li>
                <a href="/#sandbox" className="text-ink-muted transition-colors hover:text-ink">
                  Sandbox
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="mono-label">Resources</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="/docs/getting-started"
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-ink-muted transition-colors hover:text-ink"
                >
                  <GithubLogo size={14} />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={`${GITHUB_URL}/releases`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  Releases
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-ink-faint sm:flex-row sm:justify-between">
          <p>MIT licensed. Built in the open.</p>
          <p>© 2026 SEGv</p>
        </div>
      </div>
    </footer>
  );
}
