"use client";

import { useEffect, useState } from "react";
import { CONFIG } from "./config";
import {
  l3HistoryBaseName,
  l3HistoryPath,
  l3HistoryReadmePath,
  type L3Network,
  type L3OwnerFile,
  type L3OwnerSummary,
} from "./l3HistoryFormat";

export interface L3History {
  network: L3Network;
  summary: L3OwnerSummary;
  // Same-origin URLs of the static files, and friendly names to save them as.
  jsonUrl: string;
  csvUrl: string;
  readmeUrl: string;
  fileBase: string;
  // True when the snapshot notes a wind-down payout on Base (mainnet).
  windDown: boolean;
}

// Fetches the static Horizen L3 snapshot of `address` (public/l3-history/).
// The network is derived from CHAIN_ID (CONFIG.l3HistoryNetwork). Resolves to
// null when the address has no L3 history (404) or the response is not a valid
// snapshot for this address — the section is optional, so failures hide it
// instead of surfacing an error.
export function useL3History(address: string | null): L3History | null {
  const network = CONFIG.l3HistoryNetwork;
  const [result, setResult] = useState<{ key: string; data: L3History | null } | null>(null);
  const key = address ? `${network}:${l3HistoryBaseName(address)}` : null;

  useEffect(() => {
    if (!address || !key) return;
    const controller = new AbortController();
    const owner = l3HistoryBaseName(address);
    const jsonUrl = `/${l3HistoryPath(network, owner, "json")}`;

    fetch(jsonUrl, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return null;
        // A missing file could come back as the SPA's HTML fallback with 200:
        // only accept a snapshot that is really this address's.
        const file = (await res.json().catch(() => null)) as L3OwnerFile | null;
        if (!file || file.owner !== owner || file.meta?.net !== network || !file.summary) return null;
        return {
          network,
          summary: file.summary,
          jsonUrl,
          csvUrl: `/${l3HistoryPath(network, owner, "csv")}`,
          readmeUrl: `/${l3HistoryReadmePath(network)}`,
          fileBase: `horizen-l3-${network === "testnet" ? "testnet-" : ""}staking-${owner}`,
          windDown: Boolean(file.meta.windDown),
        } satisfies L3History;
      })
      .catch(() => null)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      });

    return () => controller.abort();
  }, [network, address, key]);

  // Ignore a result fetched for a previous address.
  return result && result.key === key ? result.data : null;
}
