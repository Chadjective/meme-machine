import { el } from './dom';

export type Screen = 'play' | 'daily' | 'gallery';

export interface NavHandle {
  root: HTMLElement;
  setActive: (screen: Screen) => void;
}

const TABS: { key: Screen; label: string }[] = [
  { key: 'play', label: 'Play' },
  { key: 'daily', label: 'Daily' },
  { key: 'gallery', label: 'Gallery' },
];

export function renderNav(active: Screen, onNavigate: (screen: Screen) => void): NavHandle {
  const root = el('nav', 'tabs');
  const buttons = new Map<Screen, HTMLButtonElement>();
  for (const tab of TABS) {
    const button = el('button', 'tab', tab.label);
    button.type = 'button';
    button.addEventListener('click', () => onNavigate(tab.key));
    buttons.set(tab.key, button);
    root.appendChild(button);
  }
  const setActive = (screen: Screen): void => {
    for (const [key, button] of buttons) button.classList.toggle('active', key === screen);
  };
  setActive(active);
  return { root, setActive };
}
