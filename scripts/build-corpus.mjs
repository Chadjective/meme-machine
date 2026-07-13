// build-corpus.mjs — compiles corpus_v3.json from vocabulary_v2.json + enrichment_v1.json
// Run: node scripts/build-corpus.mjs
// Deterministic. Data lives in /data; this script only joins, derives, and validates.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const v2 = JSON.parse(readFileSync(join(ROOT, 'data/vocabulary_v2.json'), 'utf8'));
const enr = JSON.parse(readFileSync(join(ROOT, 'data/enrichment_v1.json'), 'utf8'));

// ---------------------------------------------------------------------------
// Register → family map (drives the collision matrix; see specs/02_GENERATOR_DESIGN.md)
// ---------------------------------------------------------------------------
const FAMILIES = {
  verbs: {
    process: 'tech', movement: 'science', perception: 'contemplative',
    transformation: 'science', alchemical: 'mystic', semiotic: 'meaning',
    evolutionary: 'science', startup: 'corporate', selfHelp: 'psyche',
  },
  modifiers: {
    crypto: 'tech', physics: 'science', ancient: 'mystic', semiotics: 'meaning',
    alchemy: 'mystic', astronomy: 'science', astrology: 'mystic', chemistry: 'science',
    startup: 'corporate', selfHelp: 'psyche', darwinism: 'science', zeitgeist: 'internet',
    indigenous: 'indigenous', corporate: 'corporate', cosmic: 'cosmic',
  },
  nouns: {
    infrastructure: 'tech', geometry: 'science', phenomena: 'science',
    abstractions: 'meaning', alchemical: 'mystic', astronomical: 'cosmic',
    startup: 'corporate', selfHelp: 'psyche',
  },
};

// Registers excluded from the random collision pool (seeds only) pending curation call.
const SENSITIVE_REGISTERS = new Set(['modifiers.indigenous']);

// Words kept but down-weighted: too plain to read as register-marked out of context.
const WEAK_WORDS = new Set([
  'fit', 'direct', 'fixed', 'stable', 'lean', 'based', 'mid', 'apex', 'binary',
  'solar', 'lunar', 'polar', 'aligned', 'grounded', 'adapted', 'evolved', 'selected',
  'mutated', 'healing', 'competing', 'adapting', 'sensing', 'framing', 'projecting',
  'multiplying', 'separating', 'fields', 'networks', 'frameworks', 'vibrations',
]);

// V1-only words absent from v2 — restored with their V1 definitions.
const ADDITIONS = {
  modifiers: {
    cosmic: [
      { word: 'precession', def: "Slow wobble of Earth's axis (26,000 year cycle)" },
      { word: 'subduction', def: 'One plate diving under another' },
      { word: 'magnetospheric', def: "Relating to Earth's magnetic shield" },
      { word: 'perigean', def: 'Closest point to Earth in orbit' },
    ],
    zeitgeist: [
      { word: 'tariffed', def: 'Subject to import/export taxes' },
      { word: 'sanctioned', def: 'Officially penalized/restricted' },
      { word: 'climate-anxious', def: 'Worried about environmental collapse' },
    ],
    corporate: [
      { word: 'horizontalized', def: 'Expanded across parallel markets' },
    ],
  },
  nouns: {
    infrastructure: [{ word: 'sandboxes', def: 'Isolated testing environments' }],
    geometry: [
      { word: 'lemmas', def: 'Helper theorems, stepping stones' },
      { word: 'corollaries', def: 'Consequences of theorems' },
    ],
    phenomena: [
      { word: 'interference', def: 'Wave patterns combining' },
      { word: 'transients', def: 'Brief, passing phenomena' },
    ],
    abstractions: [
      { word: 'valences', def: 'Attractive or repulsive qualities' },
      { word: 'basins', def: 'Regions draining to common point' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Verb gerund → base map (explicit; templates need "Those who [VERB:base]…")
// ---------------------------------------------------------------------------
const VERB_BASE = {
  optimizing: 'optimize', parsing: 'parse', indexing: 'index', instantiating: 'instantiate',
  amortizing: 'amortize', tokenizing: 'tokenize', forking: 'fork', pruning: 'prune',
  hashing: 'hash', compiling: 'compile', deprecating: 'deprecate', serializing: 'serialize',
  scaffolding: 'scaffold', throttling: 'throttle', sharding: 'shard', caching: 'cache',
  validating: 'validate', iterating: 'iterate', bootstrapping: 'bootstrap', debugging: 'debug',
  hovering: 'hover', oscillating: 'oscillate', cascading: 'cascade', orbiting: 'orbit',
  tessellating: 'tessellate', refracting: 'refract', precipitating: 'precipitate',
  percolating: 'percolate', dilating: 'dilate', converging: 'converge', diffracting: 'diffract',
  spiraling: 'spiral', undulating: 'undulate', coalescing: 'coalesce', bifurcating: 'bifurcate',
  migrating: 'migrate', accreting: 'accrete', ebbing: 'ebb', surging: 'surge', drifting: 'drift',
  discerning: 'discern', intuiting: 'intuit', apprehending: 'apprehend', beholding: 'behold',
  presencing: 'presence', contemplating: 'contemplate', disclosing: 'disclose', attuning: 'attune',
  registering: 'register', grokking: 'grok', scrying: 'scry', channeling: 'channel',
  witnessing: 'witness', invoking: 'invoke', divining: 'divine', decoding: 'decode',
  sensing: 'sense', recognizing: 'recognize', interpreting: 'interpret', surveying: 'survey',
  sublimating: 'sublimate', crystallizing: 'crystallize', decanting: 'decant',
  transmuting: 'transmute', metabolizing: 'metabolize', calcifying: 'calcify',
  liquefying: 'liquefy', catalyzing: 'catalyze', synthesizing: 'synthesize',
  fermenting: 'ferment', distilling: 'distill', oxidizing: 'oxidize', ionizing: 'ionize',
  polymerizing: 'polymerize', annealing: 'anneal', calcining: 'calcine',
  coagulating: 'coagulate', dissolving: 'dissolve', mutating: 'mutate', adapting: 'adapt',
  purifying: 'purify', conjoining: 'conjoin', separating: 'separate', mortifying: 'mortify',
  vivifying: 'vivify', fixating: 'fixate', volatilizing: 'volatilize', multiplying: 'multiply',
  projecting: 'project', tincturing: 'tincture',
  signifying: 'signify', encoding: 'encode', connoting: 'connote', denoting: 'denote',
  symbolizing: 'symbolize', glossing: 'gloss', interpolating: 'interpolate', framing: 'frame',
  referencing: 'reference', contextualizing: 'contextualize',
  selecting: 'select', speciating: 'speciate', radiating: 'radiate', extincting: 'extinct',
  'co-evolving': 'co-evolve', regressing: 'regress', diverging: 'diverge', competing: 'compete',
  symbioting: 'symbiote', proliferating: 'proliferate',
  pivoting: 'pivot', scaling: 'scale', disrupting: 'disrupt', shipping: 'ship',
  grinding: 'grind', fundraising: 'fundraise', 'acqui-hiring': 'acqui-hire',
  sunsetting: 'sunset', 'growth-hacking': 'growth-hack', monetizing: 'monetize',
  manifesting: 'manifest', actualizing: 'actualize', integrating: 'integrate',
  grounding: 'ground', embodying: 'embody', aligning: 'align', surrendering: 'surrender',
  triggering: 'trigger', healing: 'heal', transcending: 'transcend',
};

// ---------------------------------------------------------------------------
// Noun plural → singular (rules + overrides; templates need attributive "[NOUN:sing]")
// ---------------------------------------------------------------------------
const NOUN_SINGULAR_OVERRIDES = {
  matrices: 'matrix', nebulae: 'nebula', supernovae: 'supernova', equilibria: 'equilibrium',
  spectra: 'spectrum', 'prima materia': 'prima materia', scaffolding: 'scaffolding',
  turbulence: 'turbulence', interference: 'interference',
  "philosopher's stones": "philosopher's stone", 'inner children': 'inner child',
  MVPs: 'MVP',
};
function singularize(w) {
  if (NOUN_SINGULAR_OVERRIDES[w]) return NOUN_SINGULAR_OVERRIDES[w];
  if (/ies$/.test(w)) return w.replace(/ies$/, 'y');
  if (/(ch|sh|x|z|ss)es$/.test(w)) return w.replace(/es$/, '');
  if (/s$/.test(w)) return w.replace(/s$/, '');
  return w; // mass nouns pass through
}

function syllables(text) {
  return text
    .toLowerCase()
    .split(/[\s-]+/)
    .reduce((sum, w) => {
      const groups = w.replace(/e$/, '').match(/[aeiouy]+/g);
      return sum + Math.max(1, groups ? groups.length : 1);
    }, 0);
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const report = { enriched: 0, unenriched: [], orphanEnrichment: [], added: [], warnings: [] };

function buildSection(kind) {
  const out = {};
  const enrMap = enr[kind] || {};
  const seen = new Set();
  const source = structuredClone(v2[kind]);

  // splice in V1-only additions
  for (const [reg, words] of Object.entries(ADDITIONS[kind] || {})) {
    for (const w of words) {
      if (!source[reg].some((e) => e.word === w.word)) {
        source[reg].push(w);
        report.added.push(`${kind}.${reg}.${w.word}`);
      }
    }
  }

  for (const [reg, entries] of Object.entries(source)) {
    const family = FAMILIES[kind][reg];
    if (!family) report.warnings.push(`no family for ${kind}.${reg}`);
    out[reg] = {
      family,
      sensitive: SENSITIVE_REGISTERS.has(`${kind}.${reg}`),
      entries: entries.map((e) => {
        const extra = enrMap[e.word];
        if (extra) { report.enriched++; seen.add(e.word); }
        else report.unenriched.push(`${kind}.${reg}.${e.word}`);
        const entry = {
          word: e.word,
          def: e.def,
          syllables: syllables(e.word),
          ...(WEAK_WORDS.has(e.word) ? { weak: true } : {}),
          ...(extra?.energy ? { energy: extra.energy } : {}),
          ...(extra?.usage ? { usage: extra.usage } : {}),
          ...(extra?.pairsWellWith ? { pairsWellWith: extra.pairsWellWith } : {}),
        };
        if (kind === 'verbs') {
          entry.base = VERB_BASE[e.word] ?? null;
          if (!entry.base) report.warnings.push(`missing base form: ${e.word}`);
        }
        if (kind === 'nouns') entry.singular = singularize(e.word);
        return entry;
      }),
    };
  }
  for (const w of Object.keys(enrMap)) {
    if (!seen.has(w)) report.orphanEnrichment.push(`${kind}.${w}`);
  }
  return out;
}

const verbs = buildSection('verbs');
const modifiers = buildSection('modifiers');
const nouns = buildSection('nouns');

// Seeds: v2 seeds + V1 annotations merged by normalized text; V1-only seeds appended.
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const annByText = new Map(enr.seedAnnotations.map((a) => [norm(a.text), a]));
const seeds = v2.seedPhrases.map((s) => {
  const a = annByText.get(norm(s.text));
  if (a) annByText.delete(norm(s.text));
  return { ...s, ...(a ? { domains: a.domains, whyItWorks: a.whyItWorks } : {}) };
});
for (const a of annByText.values()) {
  seeds.push({ text: a.text, category: 'classic-v1', domains: a.domains, whyItWorks: a.whyItWorks });
}

// Templates: V1 set is the superset and already slot-annotated ([VERB:ger] etc.)
const templates = enr.templatesV1.map((t, i) => ({ id: `t${String(i + 1).padStart(2, '0')}`, ...t }));

const corpus = {
  version: '3.0',
  builtFrom: ['vocabulary_v2.json', 'enrichment_v1.json'],
  families: ['tech', 'corporate', 'science', 'cosmic', 'mystic', 'psyche', 'meaning', 'internet', 'contemplative', 'indigenous'],
  verbs,
  modifiers,
  nouns,
  seeds,
  templates,
  mixingGuide: enr.mixingGuide,
};

writeFileSync(join(ROOT, 'data/corpus_v3.json'), JSON.stringify(corpus, null, 2));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const count = (sec) => Object.values(sec).reduce((n, r) => n + r.entries.length, 0);
console.log(`corpus_v3.json written`);
console.log(`verbs: ${count(verbs)}  modifiers: ${count(modifiers)}  nouns: ${count(nouns)}`);
console.log(`seeds: ${seeds.length} (${seeds.filter((s) => s.whyItWorks).length} annotated)  templates: ${templates.length}`);
console.log(`enriched entries: ${report.enriched}  unenriched: ${report.unenriched.length}`);
console.log(`V1-only words restored: ${report.added.length}`);
if (report.orphanEnrichment.length) console.log(`ORPHAN enrichment (no v2 match): ${report.orphanEnrichment.join(', ')}`);
if (report.warnings.length) console.log(`WARNINGS:\n  ${report.warnings.join('\n  ')}`);
console.log(`\nSample derived forms (spot-check):`);
for (const g of ['tessellating', 'grokking', 'symbioting', 'acqui-hiring', 'presencing']) {
  console.log(`  ${g} → ${VERB_BASE[g]}`);
}
for (const n of ['matrices', 'ontologies', 'phase transitions', 'equilibria', 'turbulence', 'cascades']) {
  console.log(`  ${n} → ${singularize(n)}`);
}
