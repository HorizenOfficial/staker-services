"use client";

import { useCallback, useMemo, useState } from "react";
import { getReadContracts } from "./contracts";
import { fetchUserDepositIds } from "./subgraph";
import { useLearnedDeposits } from "./learnedDeposits";
import { usePolling } from "./usePolling";

const POLL_MS = 20_000;

export interface DepositDetail {
  depositId: bigint;
  balance: bigint;
  earningPower: bigint;
  unclaimedRewards: bigint;
}

export interface DepositsState {
  deposits: DepositDetail[];
  loading: boolean;
  error: string | null; // set only on a hard failure (no data to show)
  subgraphDown: boolean;
  // True once the first load attempt (for the current address) has settled —
  // lets callers wait for a real deposit count before deciding anything
  // (e.g. whether to redirect away from a multi-deposit view).
  hasLoadedOnce: boolean;
  reload: () => Promise<void>;
}

// Deposit IDs come from the subgraph (not enumerable on-chain); per-deposit
// detail is read live from the chain via getDepositsInfo for freshness.
export function useDeposits(address: string | null): DepositsState {
  const { learned } = useLearnedDeposits();
  const [deposits, setDeposits] = useState<DepositDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subgraphDown, setSubgraphDown] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Deposit IDs learned from stake receipts this session (fresh before indexing).
  const learnedIds = useMemo(
    () => (address ? (learned[address.toLowerCase()] ?? []).map((s) => BigInt(s)) : []),
    [learned, address]
  );

  const load = useCallback(async () => {
    if (!address) {
      setDeposits([]);
      setHasLoadedOnce(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Subgraph is the primary ID source; learned IDs cover the indexing gap
      // and keep things working if the subgraph is momentarily down.
      let subgraphIds: bigint[] = [];
      let subgraphFailed = false;
      try {
        subgraphIds = await fetchUserDepositIds(address);
        setSubgraphDown(false);
      } catch {
        subgraphFailed = true;
        setSubgraphDown(true);
      }

      const ids = Array.from(
        new Set([...subgraphIds, ...learnedIds].map((b) => b.toString()))
      ).map((s) => BigInt(s));

      if (ids.length === 0) {
        setDeposits([]);
        // Only surface an error if we genuinely couldn't reach the ID source.
        if (subgraphFailed && learnedIds.length === 0)
          setError("Cannot load deposits — subgraph unavailable.");
        return;
      }

      const { staker } = getReadContracts();
      const [balances, , earningPowers, unclaimedRewards] =
        await staker.getDepositsInfo(ids);

      const detail = ids.map((id, i) => ({
        depositId: id,
        balance: balances[i] as bigint,
        earningPower: earningPowers[i] as bigint,
        unclaimedRewards: unclaimedRewards[i] as bigint,
      }));

      // Keep only positions that still matter: open balance, or rewards still
      // claimable after a full withdrawal.
      setDeposits(
        detail
          .filter((d) => d.balance > 0n || d.unclaimedRewards > 0n)
          .sort((a, b) => (a.depositId < b.depositId ? -1 : 1))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load deposits.");
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [address, learnedIds]);

  usePolling(load, POLL_MS, !!address);

  return { deposits, loading, error, subgraphDown, hasLoadedOnce, reload: load };
}
