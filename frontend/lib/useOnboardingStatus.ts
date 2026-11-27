"use client";

import { useCallback, useState } from "react";
import { getReadProvider } from "./contracts";
import { usePolling } from "./usePolling";

const POLL_MS = 15_000;

// Drives the hero onboarding checklist ("Bridge ETH from Ethereum" / "Stake")
// — the bridge step reads as done once the wallet holds ETH on the target
// chain, independent of the "staked" flag which the dashboard already tracks
// via the subgraph/chain summary.
export function useOnboardingStatus(address: string | null) {
  const [hasEth, setHasEth] = useState(false);

  const load = useCallback(async () => {
    if (!address) {
      setHasEth(false);
      return;
    }
    try {
      const ethBalance = await getReadProvider().getBalance(address);
      setHasEth(ethBalance > 0n);
    } catch {
      // keep the last known state on a transient read failure
    }
  }, [address]);

  usePolling(load, POLL_MS);

  return { hasEth };
}
