import { initLanding } from '@/animations';
import { useEffect } from 'react';
import { Briefs } from './landing/Briefs';
import { CTA } from './landing/CTA';
import { Cockpit } from './landing/Cockpit';
import { Hero } from './landing/Hero';
import { Integrations } from './landing/Integrations';
import { ProblemScene } from './landing/ProblemScene';
import { Sandbox } from './landing/Sandbox';

export function LandingPage() {
  useEffect(() => initLanding(), []);

  return (
    <main>
      <Hero />
      <ProblemScene />
      <Cockpit />
      <Briefs />
      <Sandbox />
      <Integrations />
      <CTA />
    </main>
  );
}
