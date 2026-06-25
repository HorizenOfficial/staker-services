"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

// Deposit IDs learned from stake receipts during this session, keyed by
// lowercased owner address. These let the UI know about a just-created deposit
// immediately — before the subgraph indexes it — and survive subgraph downtime.
type LearnedMap = Record<string, string[]>;

interface LearnedDepositsCtx {
  learned: LearnedMap;
  add: (address: string, id: bigint) => void;
}

const Ctx = createContext<LearnedDepositsCtx | null>(null);

export function LearnedDepositsProvider({ children }: { children: React.ReactNode }) {
  const [learned, setLearned] = useState<LearnedMap>({});

  const add = useCallback((address: string, id: bigint) => {
    const key = address.toLowerCase();
    const idStr = id.toString();
    setLearned((prev) => {
      const cur = prev[key] ?? [];
      if (cur.includes(idStr)) return prev;
      return { ...prev, [key]: [...cur, idStr] };
    });
  }, []);

  const value = useMemo(() => ({ learned, add }), [learned, add]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLearnedDeposits(): LearnedDepositsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLearnedDeposits must be used within LearnedDepositsProvider");
  return ctx;
}
