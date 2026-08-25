import '@/styles/global.css';

const path = window.location.pathname;

if (import.meta.env.DEV) {
  void import('./app').then((m) => m.mount());
} else if (path === '/' || path === '/index.html') {
  void import('./animations').then((m) => m.initLanding());
} else {
  void import('./app').then((m) => m.mount());
}
