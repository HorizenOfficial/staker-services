"use client";

import { useEffect, useState } from "react";
import { getReadContracts } from "./contracts";

// The staked/reward token symbol (e.g. "ZEN") is immutable for the life of the
// contract, so it is fetched once over RPC and kept in memory for the rest of
// the process. Every consumer shares the single in-flight promise / resolved
// value — there is no per-component RPC call. Used wherever the token name was
// previously hardcoded.

const FALLBACK_SYMBOL = "ZEN";

let cachedSymbol: string | null = null;
let inflight: Promise<string> | null = null;

// The symbol we know right now (cached value, or the fallback until the single
// startup call resolves). Safe for non-reactive reads.
export function getTokenSymbol(): string {
  return cachedSymbol ?? FALLBACK_SYMBOL;
}

// Resolve the symbol, making at most one RPC call for the whole process. The
// result is memoized in `cachedSymbol`; concurrent callers await the same
// promise. On failure the in-flight promise is cleared so a later call can
// retry, and the fallback is returned in the meantime.
export function fetchTokenSymbol(): Promise<string> {
  if (cachedSymbol !== null) return Promise.resolve(cachedSymbol);
  if (!inflight) {
    inflight = (async () => {
      try {
        const { token } = getReadContracts();
        const sym = String(await token.symbol());
        cachedSymbol = sym;
        return sym;
      } catch {
        inflight = null;
        return FALLBACK_SYMBOL;
      }
    })();
  }
  return inflight;
}

// React hook: returns the token symbol, re-rendering once the startup fetch
// resolves. Triggers the shared fetch on first mount if it hasn't run yet.
export function useTokenSymbol(): string {
  const [symbol, setSymbol] = useState<string>(getTokenSymbol());
  useEffect(() => {
    if (cachedSymbol !== null) {
      setSymbol(cachedSymbol);
      return;
    }
    let active = true;
    fetchTokenSymbol().then((s) => {
      if (active) setSymbol(s);
    });
    return () => {
      active = false;
    };
  }, []);
  return symbol;
}
