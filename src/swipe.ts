// Swipe gesture (Stage 6) — ported from Meme Streeps src/swipe.ts, keeping its
// axis-lock discrimination (so a vertical scroll is never hijacked as a vote) and
// its thresholds, but rebuilt on Pointer Events with pointer capture.
//
// Why: the original attached mousemove/mouseup to `document` on every init. Meme
// Streeps had one long-lived card so it didn't matter; here a fresh card mounts
// per question, so those listeners would accumulate. Pointer capture keeps every
// listener on the card itself and cleans up with it.
//
// Pair this with `touch-action: pan-y` on the card: the browser keeps vertical
// scrolling, and horizontal drags come to us.

export type VoteDirection = 'hired' | 'resume_on_file';

export interface SwipeCallbacks {
  onVote: (direction: VoteDirection) => void;
}

const VOTE_THRESHOLD = 70; // px of travel before a drag counts as a vote
const LOCK_THRESHOLD = 10; // px before we commit to an axis
const ROTATION_FACTOR = 0.06;

export function initSwipe(cardEl: HTMLElement, callbacks: SwipeCallbacks): void {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let dragging = false;
  let axis: 'h' | 'v' | null = null;

  const badgeLeft = cardEl.querySelector<HTMLElement>('.swipe-badge--left');
  const badgeRight = cardEl.querySelector<HTMLElement>('.swipe-badge--right');

  function setBadges(dx: number): void {
    if (badgeLeft) badgeLeft.style.opacity = dx < -10 ? String(Math.min(Math.abs(dx) / VOTE_THRESHOLD, 1)) : '0';
    if (badgeRight) badgeRight.style.opacity = dx > 10 ? String(Math.min(dx / VOTE_THRESHOLD, 1)) : '0';
  }

  function reset(): void {
    dragging = false;
    axis = null;
    cardEl.classList.remove('dragging');
    cardEl.style.transform = '';
    setBadges(0);
  }

  function onStart(x: number, y: number): void {
    if (cardEl.classList.contains('voted')) return; // already flying off
    dragging = true;
    axis = null;
    startX = x;
    startY = y;
    currentX = 0;
    cardEl.classList.add('dragging');
  }

  function onMove(x: number, y: number): void {
    if (!dragging) return;
    const dx = x - startX;
    const dy = y - startY;

    if (!axis) {
      if (Math.abs(dx) > LOCK_THRESHOLD) axis = 'h';
      else if (Math.abs(dy) > LOCK_THRESHOLD) axis = 'v';
      else return;
    }
    if (axis !== 'h') return; // vertical drag — leave it to the page

    currentX = dx;
    cardEl.style.transform = `translateX(${dx}px) rotate(${dx * ROTATION_FACTOR}deg)`;
    setBadges(dx);
  }

  function onEnd(): void {
    if (!dragging) return;
    const travelled = axis === 'h' ? currentX : 0;
    reset();
    if (travelled <= -VOTE_THRESHOLD) callbacks.onVote('resume_on_file');
    else if (travelled >= VOTE_THRESHOLD) callbacks.onVote('hired');
    // else: transform already cleared, so the card snaps back via CSS transition
  }

  cardEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cardEl.setPointerCapture(e.pointerId);
    onStart(e.clientX, e.clientY);
  });
  cardEl.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
  cardEl.addEventListener('pointerup', (e) => {
    if (cardEl.hasPointerCapture(e.pointerId)) cardEl.releasePointerCapture(e.pointerId);
    onEnd();
  });
  cardEl.addEventListener('pointercancel', () => reset()); // browser took over (page scroll)
}
