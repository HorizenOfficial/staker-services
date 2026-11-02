import { describe, expect, it } from "vitest";
import { parseUnits } from "ethers";
import snapshot from "./data/horizenL3StakingSnapshot.json";
import { findLegacyL3Position } from "./legacyL3Snapshot";

describe("findLegacyL3Position", () => {
  it("finds an address case-insensitively and parses 18-decimal amounts", () => {
    // Data-driven so the test survives snapshot regeneration.
    const entry = snapshot.addresses.find((a) => a.staked !== "0")!;
    const pos = findLegacyL3Position(snapshot, entry.address.toLowerCase());
    expect(pos).not.toBeNull();
    expect(pos!.staked).toBe(parseUnits(entry.staked, 18));
    expect(pos!.unclaimedRewards).toBe(parseUnits(entry.unclaimedRewards, 18));
    expect(pos!.blockHeight).toBe(snapshot.blockHeight);
  });

  it("returns null for an unknown address", () => {
    expect(findLegacyL3Position(snapshot, "0x000000000000000000000000000000000000dEaD")).toBeNull();
  });

  it("returns null when both amounts are zero", () => {
    const snap = {
      blockHeight: 1,
      blockTimestamp: "2026-10-28T00:00:00.000Z",
      addresses: [{ address: "0xAbC0000000000000000000000000000000000001", staked: "0", unclaimedRewards: "0" }],
    };
    expect(findLegacyL3Position(snap, "0xabc0000000000000000000000000000000000001")).toBeNull();
  });
});
