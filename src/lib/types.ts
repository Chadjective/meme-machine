// Shared types for the generator. Mirrors the compiled shape of
// data/corpus_v3.json (see specs/01_CORPUS_SCHEMA.md).

export type Family =
  | 'tech'
  | 'corporate'
  | 'science'
  | 'cosmic'
  | 'mystic'
  | 'psyche'
  | 'meaning'
  | 'internet'
  | 'contemplative'
  | 'indigenous';

/** A single vocabulary entry. `base` is verbs-only, `singular` is nouns-only. */
export interface Entry {
  word: string;
  def: string;
  syllables: number;
  energy?: string;
  usage?: string;
  pairsWellWith?: string[];
  weak?: boolean;
  base?: string; // verbs
  singular?: string; // nouns
}

export interface Register {
  family: Family;
  sensitive: boolean;
  entries: Entry[];
}

export interface Seed {
  text: string;
  category: string;
  domains?: string[];
  whyItWorks?: string;
}

export interface Template {
  id: string;
  type: string;
  template: string;
  mood: string;
}

export interface Corpus {
  version: string;
  builtFrom: string[];
  families: Family[];
  verbs: Record<string, Register>;
  modifiers: Record<string, Register>;
  nouns: Record<string, Register>;
  seeds: Seed[];
  templates: Template[];
  mixingGuide?: unknown[];
}

export type WordType = 'verb' | 'modifier' | 'noun';

/** An entry flattened out of its register, carrying register/family/type. */
export interface PoolWord {
  entry: Entry;
  register: string;
  family: Family;
  type: WordType;
}

/** A vocabulary word as placed into a rendered question (tap-for-definition). */
export interface QuestionWord {
  word: string; // surface form as it appears in the text
  def: string;
  energy?: string;
  type: WordType;
  register: string;
  family: Family;
}

export interface ScoreFactors {
  collision: number;
  rhythm: number;
  form: number;
}

export interface Question {
  text: string;
  words: QuestionWord[];
  templateId: string; // template id (e.g. "t12") or "seed"
  score: number; // internal comedy score S ∈ [0,1]; seeds = 1
  factors: ScoreFactors | null; // null for seeds
  isSeed: boolean;
  seedCategory?: string;
  mood?: string;
}
