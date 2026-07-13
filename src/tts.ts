// Text-to-speech (old brief §Text-to-Speech). rate .85, pitch .95, preferring a
// natural English voice. Voices load async in some browsers, so we cache them
// and refresh on `voiceschanged`.

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): void {
  if (ttsSupported()) cachedVoices = window.speechSynthesis.getVoices();
}

if (ttsSupported()) {
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = cachedVoices.length ? cachedVoices : ttsSupported() ? window.speechSynthesis.getVoices() : [];
  return voices.find(
    (v) => v.name.includes('Samantha') || v.name.includes('Google UK English') || v.lang.startsWith('en')
  );
}

export function speak(text: string, onEnd: () => void = () => {}): void {
  if (!ttsSupported()) {
    onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.pitch = 0.95;
  utterance.onend = () => onEnd();
  utterance.onerror = () => onEnd();
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
