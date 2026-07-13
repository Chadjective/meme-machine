import './style.css';

// Stage 0 placeholder. The real app (question card, generator, share) lands in
// Stages 2–4; this just proves the shell deploys, styles load, and the service
// worker registers so offline reload works.
const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <main class="shell">
    <p class="eyebrow">chadjective · meme-machine</p>
    <h1 class="wordmark">MEME<br />MACHINE</h1>
    <p class="tagline">
      A semantic resonance generator.<br />
      Colliding incompatible vocabularies since 2026.
    </p>
    <p class="status"><span class="dot"></span> Stage&nbsp;0 · scaffold live</p>
  </main>
`;

// Register the service worker for offline support. import.meta.env.BASE_URL is
// '/meme-machine/' in production (and '/' in dev), so the SW scope always tracks
// the deploy path. Only register for production builds — in `vite dev` the SW
// would fight HMR, but `vite preview` (a production build) still exercises it.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
}
