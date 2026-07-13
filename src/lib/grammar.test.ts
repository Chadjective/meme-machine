import { describe, it, expect } from 'vitest';
import { parseTemplate, analyzeTemplate, articleFor, renderQuestion, lemmaKey } from './grammar';
import type { PoolWord, Template } from './types';

const tpl = (id: string, template: string): Template => ({ id, type: 'x', template, mood: 'x' });

const verb = (word: string, base: string, syllables = 3): PoolWord => ({
  entry: { word, def: 'd', syllables, base },
  register: 'process',
  family: 'tech',
  type: 'verb',
});
const mod = (word: string, syllables = 3, extra: Partial<PoolWord['entry']> = {}): PoolWord => ({
  entry: { word, def: 'd', syllables, ...extra },
  register: 'ancient',
  family: 'mystic',
  type: 'modifier',
});
const noun = (word: string, singular: string, syllables = 3): PoolWord => ({
  entry: { word, def: 'd', syllables, singular },
  register: 'infrastructure',
  family: 'tech',
  type: 'noun',
});

describe('parseTemplate()', () => {
  it('splits literals and typed slots in order', () => {
    const parts = parseTemplate('Tell me [VERB:ger] [MODIFIER] [NOUN]...');
    const slots = parts.filter((p) => p.type === 'slot');
    expect(slots.map((s) => (s.type === 'slot' ? `${s.kind}${s.index}:${s.variant ?? ''}` : ''))).toEqual([
      'VERB1:ger',
      'MODIFIER1:',
      'NOUN1:',
    ]);
  });

  it('distinguishes second-pair and singular slots', () => {
    const parts = parseTemplate('[MODIFIER] [NOUN] and [MODIFIER2] [NOUN2]');
    const slots = parts.filter((p) => p.type === 'slot');
    expect(slots.map((s) => (s.type === 'slot' ? `${s.kind}${s.index}` : ''))).toEqual([
      'MODIFIER1',
      'NOUN1',
      'MODIFIER2',
      'NOUN2',
    ]);
  });
});

describe('analyzeTemplate()', () => {
  it('reads verb variant, singular, and two-pair shape', () => {
    const s08 = analyzeTemplate(tpl('t08', 'How might you approach [VERB:ger] in a [MODIFIER] [NOUN:sing] environment?'));
    expect(s08.hasVerb).toBe(true);
    expect(s08.verbVariant).toBe('ger');
    expect(s08.nounSingular).toBe(true);

    const s09 = analyzeTemplate(tpl('t09', 'If [MODIFIER] [NOUN] were to [VERB:base], what would you do?'));
    expect(s09.verbVariant).toBe('base');

    const s19 = analyzeTemplate(tpl('t19', 'What is the relationship between [MODIFIER] [NOUN] and [MODIFIER2] [NOUN2]?'));
    expect(s19.hasModifier2 && s19.hasNoun2).toBe(true);
    expect(s19.hasVerb).toBe(false);

    const s28 = analyzeTemplate(tpl('t28', 'Experts warn of [MODIFIER] [NOUN] [VERB:ger] by Q[QUARTER].'));
    expect(s28.hasQuarter).toBe(true);
  });
});

describe('articleFor()', () => {
  it('an before vowel sounds', () => {
    expect(articleFor('esoteric')).toBe('an');
    expect(articleFor('ontology')).toBe('an');
    expect(articleFor('umbral')).toBe('an');
  });
  it('a before consonants and /ju/ words', () => {
    expect(articleFor('Byzantine')).toBe('a');
    expect(articleFor('Euclidean')).toBe('a'); // /ju/
    expect(articleFor('unicorn')).toBe('a'); // /ju/
  });
});

describe('renderQuestion()', () => {
  it('fixes the article by the following word’s sound', () => {
    const t08 = tpl('t08', 'How might you approach [VERB:ger] in a [MODIFIER] [NOUN:sing] environment?');
    const vowel = renderQuestion(t08, { verb: verb('parsing', 'parse'), modifier: mod('esoteric'), noun: noun('ontologies', 'ontology') });
    expect(vowel.text).toContain('in an esoteric ontology environment');

    const cons = renderQuestion(t08, { verb: verb('parsing', 'parse'), modifier: mod('Byzantine'), noun: noun('ontologies', 'ontology') });
    expect(cons.text).toContain('in a Byzantine ontology environment');
  });

  it('uses base and singular surfaces from the typed slots', () => {
    const t09 = tpl('t09', 'If [MODIFIER] [NOUN] were to [VERB:base], what would you do?');
    const out = renderQuestion(t09, { verb: verb('parsing', 'parse'), modifier: mod('Hermetic'), noun: noun('pipelines', 'pipeline') });
    expect(out.text).toContain('were to parse,');
  });

  it('capitalizes a sentence-initial slot but preserves proper-noun caps mid-sentence', () => {
    const t23 = tpl('t23', '[MODIFIER] [NOUN] is just [VERB:ger] with extra steps.');
    const lower = renderQuestion(t23, { modifier: mod('esoteric'), noun: noun('protocols', 'protocol'), verb: verb('parsing', 'parse') });
    expect(lower.text.startsWith('Esoteric ')).toBe(true);

    const t03 = tpl('t03', 'How would you describe your relationship with [MODIFIER] [NOUN]?');
    const mid = renderQuestion(t03, { modifier: mod('Byzantine'), noun: noun('ontologies', 'ontology') });
    expect(mid.text).toContain('with Byzantine ontologies');
    const midLower = renderQuestion(t03, { modifier: mod('esoteric'), noun: noun('ontologies', 'ontology') });
    expect(midLower.text).toContain('with esoteric ontologies'); // stays lowercase mid-sentence
  });

  it('collects the vocab words in order with surfaces and defs', () => {
    const t01 = tpl('t01', 'Tell me about [VERB:ger] [MODIFIER] [NOUN].');
    const out = renderQuestion(t01, { verb: verb('tessellating', 'tessellate'), modifier: mod('Byzantine'), noun: noun('ontologies', 'ontology') });
    expect(out.words.map((w) => `${w.type}:${w.word}`)).toEqual(['verb:tessellating', 'modifier:Byzantine', 'noun:ontologies']);
  });
});

describe('lemmaKey()', () => {
  it('collapses inflections of the same root across parts of speech', () => {
    const asVerb = lemmaKey({ entry: { word: 'triggering', def: '', syllables: 3, base: 'trigger' }, type: 'verb' });
    const asMod = lemmaKey({ entry: { word: 'triggered', def: '', syllables: 2 }, type: 'modifier' });
    expect(asVerb).toBe(asMod);
  });
  it('uses stored singular for nouns', () => {
    expect(lemmaKey({ entry: { word: 'ontologies', def: '', syllables: 4, singular: 'ontology' }, type: 'noun' })).toBe(
      lemmaKey({ entry: { word: 'ontology', def: '', syllables: 4, singular: 'ontology' }, type: 'noun' })
    );
  });
});
