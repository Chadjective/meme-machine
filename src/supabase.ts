// Supabase client (Stage 6) — ported from Meme Streeps src/supabase.ts, which
// carries two hard-won fixes:
//   c9d9960 — never throw at module load when env vars are missing (that used to
//             crash every other top-level statement in main.ts on GitHub Pages).
//   b426152 — the stub must return a FRESH promise per call. An earlier version
//             overrode .then on a shared promise, which recursed into itself and
//             blew the stack on the very first vote.
//
// Votes are optional: with no env vars the app runs in local-only mode.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

interface StubError {
  code?: string;
  message: string;
}

interface ChainStub {
  from: (table: string) => {
    insert: (payload: unknown) => Promise<{ error: StubError | null }>;
  };
}

function makeStub(): ChainStub {
  return {
    from: () => ({
      // Fresh resolved promise every call — see b426152 above.
      insert: () => Promise.resolve({ error: null }),
    }),
  };
}

const client: SupabaseClient | ChainStub = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : makeStub();

export const supabase = client as SupabaseClient;
