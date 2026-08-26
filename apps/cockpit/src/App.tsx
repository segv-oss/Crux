import { CockpitPage } from '@/pages/CockpitPage';
import { PrsPage } from '@/pages/PrsPage';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/prs" replace />} />
        <Route path="/prs" element={<PrsPage />} />
        <Route path="/prs/:repoId/:prId" element={<CockpitPage />} />
        <Route path="*" element={<Navigate to="/prs" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
