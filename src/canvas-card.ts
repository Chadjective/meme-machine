// Share card renderer (Stage 4) — ported from Meme Streeps canvas-meme.ts, with
// the meme layout replaced by an "interview transcript" dossier. 1080×1350 PNG
// (Instagram portrait 4:5): Q in Crimson Pro, A in Space Mono, a SEMANTIC
// RESONANCE % stamp, and a meme-machine footer.

/**
 * At most ONE attribution source per artifact (spec 03 §4 S6 / [L24]) — a persona
 * line and a misattribution byline must never stack into a compound fabricated
 * attribution. Modelling it as a union rather than two optional fields makes that
 * illegal state unrepresentable instead of merely tested-against.
 */
export type Attribution =
  | { kind: 'persona'; name: string } // "Interviewer: The Burned-Out Founder"
  | { kind: 'byline'; text: string }; // "— a question in the style of X, probably"

export interface TranscriptData {
  question: string;
  answer: string;
  resonanceText: string; // e.g. "87.3%"
  verdictLine: string;
  attribution?: Attribution;
}

const W = 1080;
const H = 1350;

const BG0 = '#0a0a0f';
const BG1 = '#1a1a2e';
const BG2 = '#0f0f1a';
const CORAL = '#e94560';
const PURPLE = '#7b68ee';
const CYAN = '#00d9ff';
const INK = '#e8e8f0';
const MUTED = '#8a8aa0';
const LINE = 'rgba(255,255,255,0.10)';

const SERIF = '"Crimson Pro", Georgia, serif';
const MONO = '"Space Mono", ui-monospace, monospace';

async function ensureFonts(): Promise<void> {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`600 58px ${SERIF}`),
      document.fonts.load(`italic 400 32px ${SERIF}`),
      document.fonts.load(`700 108px ${SERIF}`),
      document.fonts.load(`700 30px ${MONO}`),
      document.fonts.load(`400 32px ${MONO}`),
    ]);
    await document.fonts.ready;
  } catch {
    /* fall back to system serif/mono */
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Greedy word-wrap using measureText with the currently-set font. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Draw wrapped text from a top-baseline; clamp to maxLines with an ellipsis. */
function drawParagraph(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  topY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const lines = wrapLines(ctx, text, maxWidth);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines && shown.length > 0) {
    let last = shown[shown.length - 1];
    while (last.length > 0 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    shown[shown.length - 1] = `${last.replace(/\s+\S*$/, '')}…`;
  }
  let y = topY;
  for (const line of shown) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function setSpacing(ctx: CanvasRenderingContext2D, value: string): void {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = value;
}

/**
 * The disclaimer, escalating when a name is on the card: an artifact carrying an
 * attribution has to say *in the pixels* that the quote isn't real. Exported so
 * the share caption says the same thing as the image.
 * Placeholder wording — Fable owns the final copy [F14].
 */
export function satireMarker(data: Pick<TranscriptData, 'attribution'>): string {
  return data.attribution ? 'AI-GENERATED SATIRE · NOT A REAL QUOTE' : 'AI-GENERATED SATIRE';
}

export async function renderTranscriptCard(data: TranscriptData): Promise<Blob> {
  await ensureFonts();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  const PAD = 96;
  const contentW = W - PAD * 2;

  // Background gradient + faint top glow.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, BG0);
  bg.addColorStop(0.55, BG1);
  bg.addColorStop(1, BG2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, -120, 80, W / 2, -120, 900);
  glow.addColorStop(0, 'rgba(123,104,238,0.18)');
  glow.addColorStop(1, 'rgba(123,104,238,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Document frame.
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  roundRect(ctx, 28, 28, W - 56, H - 56, 26);
  ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  // Header: label + CONFIDENTIAL pill.
  setSpacing(ctx, '3px');
  ctx.font = `700 28px ${MONO}`;
  ctx.fillStyle = CORAL;
  ctx.fillText('INTERVIEW TRANSCRIPT', PAD, 82);
  setSpacing(ctx, '0px');

  const conf = 'CONFIDENTIAL';
  ctx.font = `700 24px ${MONO}`;
  setSpacing(ctx, '2px');
  const confW = ctx.measureText(conf).width;
  const pillW = confW + 40;
  const pillH = 46;
  const pillX = W - PAD - pillW;
  const pillY = 70;
  ctx.fillStyle = 'rgba(233,69,96,0.14)';
  roundRect(ctx, pillX, pillY, pillW, pillH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(233,69,96,0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, pillX, pillY, pillW, pillH, 10);
  ctx.stroke();
  ctx.fillStyle = CORAL;
  ctx.textBaseline = 'middle';
  ctx.fillText(conf, pillX + 20, pillY + pillH / 2 + 1);
  ctx.textBaseline = 'top';
  setSpacing(ctx, '0px');

  // Divider.
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, 150);
  ctx.lineTo(W - PAD, 150);
  ctx.stroke();

  // Q block.
  ctx.font = `700 28px ${MONO}`;
  ctx.fillStyle = CORAL;
  ctx.fillText('Q.', PAD, 206);
  ctx.font = `600 56px ${SERIF}`;
  ctx.fillStyle = INK;
  const yAfterQ = drawParagraph(ctx, data.question, PAD, 250, contentW, 68, 5);

  // Attribution (at most one — see the Attribution union). A byline reads as a
  // hedge on the QUESTION ("in the style of"), never as a quote from the person.
  let cursor = yAfterQ;
  if (data.attribution) {
    ctx.font = `italic 400 30px ${SERIF}`;
    ctx.fillStyle = MUTED;
    const line =
      data.attribution.kind === 'byline'
        ? data.attribution.text
        : `Interviewer: ${data.attribution.name}`;
    cursor = drawParagraph(ctx, line, PAD, cursor + 14, contentW, 38, 2);
  }

  // A block.
  const aLabelY = cursor + 34;
  ctx.font = `700 28px ${MONO}`;
  ctx.fillStyle = CYAN;
  ctx.fillText('A.', PAD, aLabelY);
  const aTop = aLabelY + 50;
  const aMaxBottom = 918;
  const aLineHeight = 46;
  const aMaxLines = Math.max(2, Math.min(9, Math.floor((aMaxBottom - aTop) / aLineHeight)));
  const hasAnswer = data.answer.trim().length > 0;
  ctx.font = hasAnswer ? `400 31px ${MONO}` : `italic 400 30px ${SERIF}`;
  ctx.fillStyle = hasAnswer ? INK : MUTED;
  drawParagraph(
    ctx,
    hasAnswer ? data.answer.trim() : '[ the candidate declined to comment ]',
    PAD,
    aTop,
    contentW,
    aLineHeight,
    aMaxLines
  );

  // Resonance stamp box.
  const boxY = 968;
  const boxH = 250;
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  roundRect(ctx, PAD, boxY, contentW, boxH, 18);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  roundRect(ctx, PAD, boxY, contentW, boxH, 18);
  ctx.stroke();
  // Coral accent bar.
  ctx.fillStyle = CORAL;
  roundRect(ctx, PAD, boxY + 24, 6, boxH - 48, 3);
  ctx.fill();

  // Big % (gradient), left column.
  ctx.font = `700 104px ${SERIF}`;
  const pct = data.resonanceText;
  const pctW = ctx.measureText(pct).width;
  const pctX = PAD + 48;
  const pctGrad = ctx.createLinearGradient(pctX, 0, pctX + pctW, 0);
  pctGrad.addColorStop(0, CORAL);
  pctGrad.addColorStop(0.55, PURPLE);
  pctGrad.addColorStop(1, CYAN);
  ctx.fillStyle = pctGrad;
  ctx.fillText(pct, pctX, boxY + 78);

  // Label + verdict, right column.
  const rightX = pctX + pctW + 56;
  const rightW = W - PAD - 40 - rightX;
  setSpacing(ctx, '3px');
  ctx.font = `700 22px ${MONO}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('SEMANTIC RESONANCE', rightX, boxY + 52);
  setSpacing(ctx, '0px');
  ctx.font = `italic 400 29px ${SERIF}`;
  ctx.fillStyle = INK;
  drawParagraph(ctx, data.verdictLine, rightX, boxY + 92, rightW, 40, 3);

  // Satire marker — baked into the PIXELS, not the app chrome, because this card
  // travels without the app and a screenshot loses any framing that lived in the
  // UI (spec 03 §4 S5). Wording is a placeholder pending Fable [F14].
  ctx.textAlign = 'center';
  setSpacing(ctx, '2px');
  ctx.font = `700 20px ${MONO}`;
  ctx.fillStyle = 'rgba(233,69,96,0.8)';
  ctx.fillText(satireMarker(data), W / 2, H - 124);

  // Footer.
  setSpacing(ctx, '1px');
  ctx.font = `400 24px ${MONO}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('meme-machine · chadjective.github.io/meme-machine', W / 2, H - 82);
  ctx.textAlign = 'left';
  setSpacing(ctx, '0px');

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      'image/png',
      0.95
    );
  });
}
