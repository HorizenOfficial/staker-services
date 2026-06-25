"use client";

import { useCallback, useEffect, useState } from "react";
import { getReadProvider } from "./contracts";
import { fetchSubgraphMeta } from "./subgraph";

const POLL_MS = 20_000;
// Normal graph-node lag on a 2s-block devnet is a couple of blocks; flag only
// a meaningful gap to avoid false positives.
const BEHIND_THRESHOLD = 8;

export type SubgraphHealth =
  | { status: "checking" }
  | { status: "ok"; behind: number }
  | { status: "stale"; behind: number } // indexed head trails the chain
  | { status: "desynced"; ahead: number } // indexed head is AHEAD of the chain → chain was reset
  | { status: "errors" } // graph-node reported indexing errors
  | { status: "unreachable" }; // can't query the subgraph

export function useSubgraphHealth(): SubgraphHealth {
  const [health, setHealth] = useState<SubgraphHealth>({ status: "checking" });

  const check = useCallback(async () => {
    let subgraphBlock: number;
    let hasErrors: boolean;
    try {
      const meta = await fetchSubgraphMeta();
      subgraphBlock = meta.block;
      hasErrors = meta.hasIndexingErrors;
    } catch {
      setHealth({ status: "unreachable" });
      return;
    }
    if (hasErrors) {
      setHealth({ status: "errors" });
      return;
    }

    let chainBlock: number;
    try {
      chainBlock = await getReadProvider().getBlockNumber();
    } catch {
      // Reached the subgraph but not the chain — can't compare; treat as ok.
      setHealth({ status: "ok", behind: 0 });
      return;
    }

    if (subgraphBlock > chainBlock) {
      setHealth({ status: "desynced", ahead: subgraphBlock - chainBlock });
    } else if (chainBlock - subgraphBlock > BEHIND_THRESHOLD) {
      setHealth({ status: "stale", behind: chainBlock - subgraphBlock });
    } else {
      setHealth({ status: "ok", behind: chainBlock - subgraphBlock });
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [check]);

  return health;
}
