// Proper-noun linter (spec 03 §4 S7 / [L21] / [O1]).
//
// The invariant: NO real living people, and NO real companies/brands/products,
// may appear anywhere in the corpus. Every new V2 mode amplifies how often corpus
// content is generated, screenshotted and shared, so this is enforced at ONE
// choke-point — the corpus build — and re-asserted by a unit test so a hand-edited
// corpus_v3.json can't slip past either.
//
// The allowlist below is the audited result of the shipped corpus (Liam signed
// off). Everything on it is a *register adjective*, not a reference to a person or
// a brand: eponymous mathematics ("Riemannian" names a geometry, not Bernhard
// Riemann), a civilisation/era, an esoteric tradition, or a non-brand modernism.
//
// Adding a capitalized word that isn't here FAILS THE BUILD. That is deliberate:
// the next person to add "Musk-pilled" or "Goldman-adjacent" has to come argue for
// it, and the answer is no.

/** Capitalized tokens permitted in the corpus. Keep grouped + justified. */
export const ALLOWED_PROPER_NOUNS = new Set([
  // Eponymous maths/science — the term names a field, not the (long-dead) person.
  'Bayesian',
  'Darwinian',
  'Gaussian',
  'Hamiltonian',
  'Hermitian',
  'Lagrangian',
  'Lorentzian',
  'Markovian',
  'Ptolemaic',
  'Pythagorean',
  'Riemannian',
  // Civilisations, eras, places. ("Byzantine" is also the standard CS fault-
  // tolerance term — it earns its place twice.)
  'Akkadian',
  'Byzantine',
  'Chaldean',
  'Pharaonic',
  'Sumerian',
  'Templar',
  'Vedic',
  // Esoteric / mystery traditions. These satirise the CORPORATE APPROPRIATION of
  // the mystical, never the tradition itself (spec 03 §4 S10).
  'Delphic',
  'Druidic',
  'Eleusinian',
  'Gnostic',
  'Hermetic',
  'Kabbalistic',
  'Masonic',
  'Mithraic',
  'Orphic',
  'Rosicrucian',
  'Saturnian',
  'Zoroastrian',
  // Modern, non-brand.
  'AI-generated',
  'MVPs',
  'Series-A',
]);

const SENTENCE_END = /[.!?…]$/;

/** Strip surrounding punctuation, keeping internal hyphens/apostrophes. */
function bare(token) {
  return token.replace(/^[^A-Za-z]+/, '').replace(/[^A-Za-z'-]+$/, '');
}

/**
 * Scan a piece of prose for capitalized tokens that aren't allowlisted.
 * Skips sentence-initial words (capitalisation there is grammar, not a proper
 * noun) and template slot tokens like `[MODIFIER]` / `Q[QUARTER]`.
 */
function scanText(text, where, out) {
  if (!text) return;
  const tokens = text.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    if (raw.includes('[') || raw.includes(']')) continue; // slot token
    const word = bare(raw);
    if (!word || !/^[A-Z]/.test(word)) continue;
    // A lone capital is never a name — it's "Q3", an initial, or a stray letter.
    if (word.length < 2) continue;
    // Sentence-initial: first word, or the previous token ended a sentence.
    if (i === 0 || SENTENCE_END.test(tokens[i - 1])) continue;
    if (ALLOWED_PROPER_NOUNS.has(word)) continue;
    out.push({ word, where });
  }
}

/**
 * Lint a compiled corpus. Returns an array of {word, where} violations —
 * empty means the no-real-names invariant holds.
 */
export function lintProperNouns(corpus) {
  const out = [];
  for (const kind of ['verbs', 'modifiers', 'nouns']) {
    for (const [register, reg] of Object.entries(corpus[kind] ?? {})) {
      for (const entry of reg.entries) {
        // Entry words are single tokens: any capital is a proper noun claim.
        if (/^[A-Z]/.test(entry.word) && !ALLOWED_PROPER_NOUNS.has(bare(entry.word))) {
          out.push({ word: entry.word, where: `${kind}.${register}` });
        }
      }
    }
  }
  for (const seed of corpus.seeds ?? []) scanText(seed.text, `seed:${seed.category ?? '?'}`, out);
  for (const t of corpus.templates ?? []) scanText(t.template, `template:${t.id ?? '?'}`, out);
  return out;
}
