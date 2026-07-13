import './style.css';
import { initApp } from './app';

initApp();

// Register the service worker for offline support (production only — in `vite
// dev` it would fight HMR; `vite preview` still exercises it). BASE_URL is
// '/meme-machine/' in production, so the SW scope tracks the deploy path.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
}
