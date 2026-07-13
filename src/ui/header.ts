import { el } from './dom';

export interface HeaderHandle {
  root: HTMLElement;
  setCount: (n: number) => void;
}

/** Minimal top bar: wordmark + running question counter (old brief §Header). */
export function renderHeader(): HeaderHandle {
  const root = el('header', 'app-header');
  const brand = el('div', 'brand', 'MEME MACHINE');
  const count = el('div', 'qcount', 'Q #0');
  root.append(brand, count);
  return {
    root,
    setCount: (n) => {
      count.textContent = `Q #${n}`;
    },
  };
}
