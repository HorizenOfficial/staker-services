import { describe, expect, it } from "vitest";
import {
  formatZen,
  l3HistoryPath,
  l3HistoryReadmePath,
  parseZen,
  summarizeOwner,
  type L3DepositSummary,
  type L3Row,
} from "./l3HistoryFormat";

describe("parseZen / formatZen", () => {
  it("round-trips exact 18-decimal amounts", () => {
    for (const v of ["0", "10", "0.00000000000000001", "-0.1", "12499.999999999999999853"]) {
      expect(formatZen(parseZen(v))).toBe(v);
    }
  });

  it("drops trailing zeros", () => {
    expect(formatZen(parseZen("1.500"))).toBe("1.5");
    expect(formatZen(10n ** 18n)).toBe("1");
  });

  it("rejects malformed amounts", () => {
    expect(() => parseZen("1e3")).toThrow();
    expect(() => parseZen("0.0000000000000000001")).toThrow(); // 19 decimals
  });
});

describe("paths", () => {
  it("names files after the lower-case address", () => {
    expect(l3HistoryPath("mainnet", "0xAbCDEF0000000000000000000000000000000001", "json")).toBe(
      "l3-history/mainnet/0xabcdef0000000000000000000000000000000001.json",
    );
    expect(l3HistoryReadmePath("testnet")).toBe("l3-history/testnet/README.md");
  });
});

describe("summarizeOwner", () => {
  const owner = "0x0e7c80ef580d359d7b5f123dd95c28834b753bbb";
  const row = (date: string, type: string, id: number, cols: Partial<Record<number, string>>): L3Row => {
    const r: L3Row = [date, `${date} 00:00:00`, type, owner, id, null, null, null, null, null, null, null, 1, null];
    for (const [i, v] of Object.entries(cols)) r[Number(i)] = v ?? null;
    return r;
  };
  const rows: L3Row[] = [
    row("2026-07-12", "deposit", 4, { 5: "10", 8: "10" }),
    row("2026-07-12", "daily", 4, { 6: "0.5", 8: "10", 9: "0.5", 10: "0.5" }),
    row("2026-07-13", "claim", 4, { 7: "0.5", 11: owner }),
    row("2026-07-14", "withdraw", 4, { 5: "-4", 8: "6" }),
    row("2026-07-14", "daily", 4, { 6: "0.25", 8: "6", 9: "0.25", 10: "0.75" }),
  ];
  const deposits: Record<string, L3DepositSummary> = {
    "4": {
      createdBlock: 1,
      createdTime: "2026-07-12 00:00:00",
      depositedZen: "10",
      withdrawnZen: "4",
      rewardsAccruedZen: "0.75",
      rewardsClaimedZen: "0.5",
      stakedAtEZen: "6",
      unclaimedAtEZen: "0.25",
    },
  };

  it("counts transactions and sums amounts", () => {
    expect(summarizeOwner(owner, rows, deposits)).toEqual({
      positions: 1,
      depositTxs: 1,
      withdrawTxs: 1,
      claimTxs: 1,
      depositedZen: "10",
      withdrawnZen: "4",
      rewardsEarnedZen: "0.75",
      rewardsClaimedZen: "0.5",
      stakedAtCloseZen: "6",
      unclaimedAtCloseZen: "0.25",
      firstDay: "2026-07-12",
      lastDay: "2026-07-14",
    });
  });

  it("throws when rows and the deposit recap disagree", () => {
    const bad = { "4": { ...deposits["4"], rewardsAccruedZen: "0.7" } };
    expect(() => summarizeOwner(owner, rows, bad)).toThrow(/accrued mismatch/);
  });
});
