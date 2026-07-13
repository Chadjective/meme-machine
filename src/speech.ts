// Voice input via the Web Speech API (old brief: "type or voice-input an
// answer"). Not in the standard DOM lib, so we describe the minimal surface we
// use and degrade gracefully where it's unsupported (e.g. Firefox).

interface SpeechResultAlternative {
  transcript: string;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<SpeechResultAlternative>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function voiceInputSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/** Start dictation; `onText` receives the accumulating transcript. Returns stop(). */
export function startDictation(onText: (text: string) => void, onEnd: () => void): () => void {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    onEnd();
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (event) => {
    let text = '';
    for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
    onText(text);
  };
  rec.onend = () => onEnd();
  rec.onerror = () => onEnd();
  rec.start();
  return () => rec.stop();
}
