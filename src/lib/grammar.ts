// Slot grammar (spec 02 §4). Typed slot fill — never naive string surgery.
//   [VERB:ger]  → entry.word       [VERB:base] → entry.base
//   [MODIFIER]/[MODIFIER2] → entry.word
//   [NOUN]/[NOUN2] → entry.word    [NOUN:sing] → entry.singular
//   [SECTOR] / [QUARTER] → structural pools (not vocabulary words)
// Also handles a/an by vowel *sound*, sentence-initial capitalization (proper
// nouns keep their caps), and lemma keys for the per-question dedup gate.

import type { Entry, PoolWord, QuestionWord, Template, WordType } from './types';

// ── Template parsing ─────────────────────────────────────────────────────────

export interface SlotPart {
  type: 'slot';
  kind: 'VERB' | 'MODIFIER' | 'NOUN' | 'SECTOR' | 'QUARTER';
  index: 1 | 2; // [MODIFIER2]/[NOUN2] → 2
  variant?: 'ger' | 'base' | 'sing';
  raw: string;
}
export interface LiteralPart {
  type: 'literal';
  text: string;
}
export type Part = SlotPart | LiteralPart;

const SLOT_RE = /\[(VERB|MODIFIER|NOUN|SECTOR|QUARTER)(2)?(?::(ger|base|sing))?\]/g;

export function parseTemplate(tpl: string): Part[] {
  const parts: Part[] = [];
  const re = new RegExp(SLOT_RE.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tpl)) !== null) {
    if (m.index > last) parts.push({ type: 'literal', text: tpl.slice(last, m.index) });
    parts.push({
      type: 'slot',
      kind: m[1] as SlotPart['kind'],
      index: m[2] ? 2 : 1,
      variant: m[3] as SlotPart['variant'] | undefined,
      raw: m[0],
    });
    last = m.index + m[0].length;
  }
  if (last < tpl.length) parts.push({ type: 'literal', text: tpl.slice(last) });
  return parts;
}

/** What a template needs — drives what the generator draws and how it scores. */
export interface TemplateShape {
  parts: Part[];
  hasVerb: boolean;
  verbVariant: 'ger' | 'base' | null;
  hasModifier2: boolean;
  hasNoun2: boolean;
  nounSingular: boolean; // primary noun uses [NOUN:sing]
  hasSector: boolean;
  hasQuarter: boolean;
  phaseScaffolded: boolean; // template text contains "phase" (spec 02 §3)
}

export function analyzeTemplate(t: Template): TemplateShape {
  const parts = parseTemplate(t.template);
  const slots = parts.filter((p): p is SlotPart => p.type === 'slot');
  const verb = slots.find((s) => s.kind === 'VERB');
  const primaryNoun = slots.find((s) => s.kind === 'NOUN' && s.index === 1);
  return {
    parts,
    hasVerb: !!verb,
    verbVariant: verb ? verb.variant === 'base' ? 'base' : 'ger' : null,
    hasModifier2: slots.some((s) => s.kind === 'MODIFIER' && s.index === 2),
    hasNoun2: slots.some((s) => s.kind === 'NOUN' && s.index === 2),
    nounSingular: primaryNoun?.variant === 'sing',
    hasSector: slots.some((s) => s.kind === 'SECTOR'),
    hasQuarter: slots.some((s) => s.kind === 'QUARTER'),
    phaseScaffolded: /\bphase\b/i.test(t.template),
  };
}

// ── Article agreement (a/an) ─────────────────────────────────────────────────

/** Words that begin with a /ju/ ("you") sound take "a" despite a vowel letter. */
function startsWithJuSound(w: string): boolean {
  return /^(uni|use|usu|uti|ubiq|u[bcdfgklmnprstvwxz][aeiou]|eu|ewe)/i.test(w);
}

export function articleFor(word: string): 'a' | 'an' {
  const first = word[0]?.toLowerCase() ?? '';
  const vowel = 'aeiou'.includes(first);
  if (vowel && !startsWithJuSound(word)) return 'an';
  return 'a'; // consonants (no silent-h words in the corpus) and /ju/ words
}

function matchArticleCase(article: 'a' | 'an', original: string): string {
  return /^[A-Z]/.test(original) ? article[0].toUpperCase() + article.slice(1) : article;
}

function capitalizeSentenceStart(text: string): string {
  return text.replace(/^(\s*)([a-z])/, (_all, sp: string, ch: string) => sp + ch.toUpperCase());
}

// ── Rendering ────────────────────────────────────────────────────────────────

export interface Fill {
  verb?: PoolWord;
  modifier: PoolWord;
  noun: PoolWord;
  modifier2?: PoolWord;
  noun2?: PoolWord;
  sector?: string;
  quarter?: number;
}

function toWord(w: PoolWord, surface: string): QuestionWord {
  return {
    word: surface,
    def: w.entry.def,
    energy: w.entry.energy,
    type: w.type,
    register: w.register,
    family: w.family,
  };
}

function surfaceAndWord(slot: SlotPart, fill: Fill): { surface: string; word?: QuestionWord } {
  switch (slot.kind) {
    case 'VERB': {
      const w = fill.verb!;
      const surface = slot.variant === 'base' ? w.entry.base ?? w.entry.word : w.entry.word;
      return { surface, word: toWord(w, surface) };
    }
    case 'MODIFIER': {
      const w = slot.index === 2 ? fill.modifier2! : fill.modifier;
      return { surface: w.entry.word, word: toWord(w, w.entry.word) };
    }
    case 'NOUN': {
      const w = slot.index === 2 ? fill.noun2! : fill.noun;
      const surface = slot.variant === 'sing' ? w.entry.singular ?? w.entry.word : w.entry.word;
      return { surface, word: toWord(w, surface) };
    }
    case 'SECTOR':
      return { surface: fill.sector ?? '' };
    case 'QUARTER':
      return { surface: String(fill.quarter ?? 1) };
  }
}

/** Render a template with a fill into final text + the ordered list of vocab words. */
export function renderQuestion(template: Template, fill: Fill): { text: string; words: QuestionWord[] } {
  const parts = parseTemplate(template.template);
  const words: QuestionWord[] = [];
  let out = '';
  for (const part of parts) {
    if (part.type === 'literal') {
      out += part.text;
      continue;
    }
    const { surface, word } = surfaceAndWord(part, fill);
    // Fix an article that immediately precedes this filled slot (e.g. "a" → "an").
    const art = out.match(/(?:^|\s)(a|an)(\s)$/i);
    if (art) {
      const corrected = matchArticleCase(articleFor(surface), art[1]);
      out = out.slice(0, out.length - art[1].length - art[2].length) + corrected + art[2];
    }
    out += surface;
    if (word) words.push(word);
  }
  return { text: capitalizeSentenceStart(out), words };
}

// ── Lemma keys (dedup gate, spec 02 §4.2) ────────────────────────────────────

function stem(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/(ization|isation|izing|ising|ized|ised|ings|ing|edly|ed|es|ian|ic|al|s)$/, '');
}

/** Normalized stem for a word, using stored base/singular first (verbs/nouns). */
export function lemmaKey(w: { entry: Entry; type: WordType }): string {
  const root =
    w.type === 'verb' ? w.entry.base ?? w.entry.word : w.type === 'noun' ? w.entry.singular ?? w.entry.word : w.entry.word;
  return stem(root);
}
