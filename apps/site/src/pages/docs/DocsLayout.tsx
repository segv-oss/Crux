import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const nav = [
  { to: '/docs/getting-started', label: 'Getting Started' },
  { to: '/docs/cockpit', label: 'The Cockpit' },
  { to: '/docs/ai-briefs', label: 'AI Reviewer Briefs' },
  { to: '/docs/integrations', label: 'Integrations' },
];

export default function DocsLayout() {
  return (
    <main className="pt-16">
      <div className="container-x grid gap-12 py-14 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mono-label">Documentation</p>
          <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2 lg:flex-col" aria-label="Docs">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm transition-colors ${
                    isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <Suspense fallback={null}>
          <div className="docs-prose max-w-[68ch]">
            <Outlet />
          </div>
        </Suspense>
      </div>
    </main>
  );
}
