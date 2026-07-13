// Share wrapper (Stage 4) — ported from Meme Streeps share.ts. Web Share API with
// file support, falling back to a download + clipboard caption on desktop.

import { renderTranscriptCard, type TranscriptData } from './canvas-card';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildCaption(data: TranscriptData): string {
  const answer = data.answer.trim() || '[declined to comment]';
  return [
    `"${data.question}"`,
    `A: ${answer}`,
    `Semantic Resonance: ${data.resonanceText} — ${data.verdictLine}`,
    'via meme-machine · chadjective.github.io/meme-machine',
  ].join('\n\n');
}

export type ShareResult = 'shared' | 'downloaded' | 'failed';

/** Render the transcript to a PNG and share it, falling back to download. */
export async function shareTranscript(data: TranscriptData): Promise<ShareResult> {
  let blob: Blob;
  try {
    blob = await renderTranscriptCard(data);
  } catch {
    return 'failed';
  }

  const filename = `meme-machine-${Date.now()}.png`;
  const file = new File([blob], filename, { type: 'image/png' });
  const caption = buildCaption(data);

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    const shareData: ShareData = { files: [file], text: caption, title: 'Meme Machine' };
    if (nav.canShare(shareData)) {
      try {
        await nav.share(shareData);
        return 'shared';
      } catch (err) {
        if ((err as Error).name === 'AbortError') return 'shared'; // user cancelled
        // otherwise fall through to download
      }
    }
  }

  triggerDownload(blob, filename);
  navigator.clipboard?.writeText?.(caption).catch(() => {
    /* clipboard optional; the download already succeeded */
  });
  return 'downloaded';
}
