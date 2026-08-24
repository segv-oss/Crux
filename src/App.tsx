import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { CockpitPage } from './pages/CockpitPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/cockpit" element={<CockpitPage />} />
    </Routes>
  );
}
