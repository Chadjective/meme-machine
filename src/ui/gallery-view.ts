// Gallery screen (Stage 5). Lists saved transcripts newest-first with a per-entry
// re-share and delete. Built with textContent (never innerHTML) — answers are
// free user text.

import { el } from './dom';
import { getGalleryEntries, removeGalleryEntry, type GalleryEntry } from '../gallery';
import { LABELS } from '../lib/analytics';

export interface GalleryHandlers {
  onShare: (entry: GalleryEntry) => void;
}

export function renderGalleryView(handlers: GalleryHandlers): HTMLElement {
  const wrap = el('div', 'gallery');
  const head = el('div', 'gallery-head');
  const count = el('span', 'gallery-count');
  head.appendChild(count);
  const list = el('div', 'gallery-list');
  const empty = el('p', 'gallery-empty', LABELS.galleryEmpty);
  wrap.append(head, list, empty);

  const refresh = (): void => {
    const n = list.children.length;
    count.textContent = `${n} transcript${n === 1 ? '' : 's'}`;
    empty.hidden = n !== 0;
    list.hidden = n === 0;
  };

  for (const entry of getGalleryEntries()) {
    const tile = buildTile(entry);
    tile.querySelector<HTMLButtonElement>('.g-share')!.addEventListener('click', () => handlers.onShare(entry));
    tile.querySelector<HTMLButtonElement>('.g-delete')!.addEventListener('click', () => {
      removeGalleryEntry(entry.id);
      tile.remove();
      refresh();
    });
    list.appendChild(tile);
  }
  refresh();
  return wrap;
}

function buildTile(entry: GalleryEntry): HTMLElement {
  const tile = el('article', 'g-item');

  const top = el('div', 'g-top');
  if (entry.mode === 'daily') top.appendChild(el('span', 'g-badge', 'daily'));
  top.appendChild(el('span', 'g-res', entry.resonanceText));
  tile.appendChild(top);

  tile.appendChild(el('p', 'g-q', entry.question));

  const answer = el('p', 'g-a');
  answer.append(el('span', 'g-a-label', 'A '), document.createTextNode(entry.answer));
  tile.appendChild(answer);

  tile.appendChild(el('p', 'g-verdict', entry.verdictLine));

  const row = el('div', 'g-row');
  const share = el('button', 'btn ghost small', '⤴ Share');
  share.type = 'button';
  share.classList.add('g-share');
  const del = el('button', 'btn ghost small', 'Delete');
  del.type = 'button';
  del.classList.add('g-delete');
  row.append(share, del);
  tile.appendChild(row);

  return tile;
}
