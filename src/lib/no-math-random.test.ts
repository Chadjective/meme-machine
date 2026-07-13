import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Spec 02 §6/§9: no bare Math.random anywhere in lib code — all randomness must
// flow through the injected rng so daily mode and tests stay deterministic.
describe('determinism guard', () => {
  it('no lib source uses Math.random', () => {
    const libDir = dirname(fileURLToPath(import.meta.url));
    const offenders: string[] = [];
    for (const file of readdirSync(libDir)) {
      if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
      // Match actual calls (Math.random(...)), not prose mentions in comments.
      if (/Math\.random\s*\(/.test(readFileSync(join(libDir, file), 'utf8'))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
