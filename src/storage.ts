// localStorage persistence (old brief §Storage). Keys match the brief so a
// future gallery/Stage 5 reads the same data. All access is guarded so private
// mode / disabled storage degrades to no-ops instead of throwing.

export interface AnswerRecord {
  id: number;
  question: string;
  answer: string;
  timestamp: string;
}

const KEYS = {
  answers: 'meme_answers',
  playerName: 'meme_player_name',
  questionCount: 'meme_question_count',
} as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — degrade silently */
  }
}

export function getAnswers(): AnswerRecord[] {
  const raw = read(KEYS.answers);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnswerRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveAnswer(questionText: string, answer: string): void {
  const answers = getAnswers();
  answers.push({ id: Date.now(), question: questionText, answer, timestamp: new Date().toISOString() });
  write(KEYS.answers, JSON.stringify(answers));
}

export function getQuestionCount(): number {
  const n = parseInt(read(KEYS.questionCount) ?? '0', 10);
  return Number.isFinite(n) ? n : 0;
}

export function incrementQuestionCount(): number {
  const n = getQuestionCount() + 1;
  write(KEYS.questionCount, String(n));
  return n;
}

export function getPlayerName(): string | null {
  return read(KEYS.playerName);
}

export function setPlayerName(name: string): void {
  write(KEYS.playerName, name);
}
