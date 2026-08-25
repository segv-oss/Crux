import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { LandingPage } from '@/pages/LandingPage';
import { StrictMode, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

const DocsLayout = lazy(() => import('@/pages/docs/DocsLayout'));
const GettingStarted = lazy(() => import('@/pages/docs/content/getting-started.mdx'));
const CockpitDoc = lazy(() => import('@/pages/docs/content/cockpit.mdx'));
const AiBriefs = lazy(() => import('@/pages/docs/content/ai-briefs.mdx'));
const IntegrationsDoc = lazy(() => import('@/pages/docs/content/integrations.mdx'));

function ScrollToTop() {
  const { pathname } = useLocation();
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function mount() {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element not found');

  const tree = (
    <StrictMode>
      <BrowserRouter>
        <ScrollToTop />
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs" element={<DocsLayout />}>
            <Route index element={<Navigate to="/docs/getting-started" replace />} />
            <Route path="getting-started" element={<GettingStarted />} />
            <Route path="cockpit" element={<CockpitDoc />} />
            <Route path="ai-briefs" element={<AiBriefs />} />
            <Route path="integrations" element={<IntegrationsDoc />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </StrictMode>
  );

  createRoot(rootEl).render(tree);
}
