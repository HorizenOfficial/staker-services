"use client";

import { useEffect, useMemo, useState } from "react";
import { parseUnits } from "ethers";

// Static snapshot of the old Horizen L3 ZenStaker (taken after the winddown),
// listing each address's staked balance and unclaimed rewards. These amounts
// were migrated to the same address on Base. The JSON is loaded lazily via a
// dynamic import, so it ships as a separate chunk fetched only by the pages
// that use it.

export interface LegacyL3Position {
  staked: bigint;
  unclaimedRewards: bigint;
  blockHeight: number;
  blockTimestamp: Date;
}

interface SnapshotFile {
  blockHeight: number;
  blockTimestamp: string;
  addresses: { address: string; staked: string; unclaimedRewards: string }[];
}

// Exported for tests: resolves the position for an address, or null when the
// address isn't in the snapshot or has nothing (0 staked and 0 unclaimed).
export function findLegacyL3Position(snapshot: SnapshotFile, address: string): LegacyL3Position | null {
  const target = address.toLowerCase();
  const entry = snapshot.addresses.find((a) => a.address.toLowerCase() === target);
  if (!entry) return null;
  const staked = parseUnits(entry.staked, 18);
  const unclaimedRewards = parseUnits(entry.unclaimedRewards, 18);
  if (staked === 0n && unclaimedRewards === 0n) return null;
  return {
    staked,
    unclaimedRewards,
    blockHeight: snapshot.blockHeight,
    blockTimestamp: new Date(snapshot.blockTimestamp),
  };
}

let snapshotPromise: Promise<SnapshotFile> | null = null;

function loadSnapshot(): Promise<SnapshotFile> {
  snapshotPromise ??= import("./data/horizenL3StakingSnapshot.json").then((m) => m.default as SnapshotFile);
  return snapshotPromise;
}

// The connected address's old Horizen L3 position, or null if it had none
// (or while the snapshot chunk is still loading).
export function useLegacyL3Position(address: string | null): LegacyL3Position | null {
  const [snapshot, setSnapshot] = useState<SnapshotFile | null>(null);
  const needed = address !== null;

  useEffect(() => {
    if (!needed) return;
    let cancelled = false;
    loadSnapshot()
      .then((snap) => {
        if (!cancelled) setSnapshot(snap);
      })
      .catch(() => {
        // Snapshot chunk failed to load: skip the section rather than break the page.
        snapshotPromise = null;
      });
    return () => {
      cancelled = true;
    };
  }, [needed]);

  return useMemo(
    () => (snapshot && address ? findLegacyL3Position(snapshot, address) : null),
    [snapshot, address],
  );
}
