import { renderToString } from 'react-dom/server';
import { Footer } from '../src/components/Footer';
import { Navbar } from '../src/components/Navbar';
import { LandingPage } from '../src/pages/LandingPage';

export function render(): string {
  return renderToString(
    <>
      <Navbar />
      <LandingPage />
      <Footer />
    </>,
  );
}
