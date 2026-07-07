import { formatUnits } from "ethers";
import { CONFIG } from "./config";

export function truncateAddress(addr: string): string {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function explorerBase(): string | null {
  return CONFIG.explorerUrl ? CONFIG.explorerUrl.replace(/\/+$/, "") : null;
}

// Block-explorer link for a contract/account address (null if unconfigured).
export function addressUrl(addr: string): string | null {
  const base = explorerBase();
  return base && addr ? `${base}/address/${addr}` : null;
}

// Block-explorer link for a token (Blockscout-style token page).
export function tokenUrl(addr: string): string | null {
  const base = explorerBase();
  return base && addr ? `${base}/token/${addr}` : null;
}

// Format a bigint token amount (18 decimals) to a trimmed, readable string.
export function formatToken(value: bigint, maxFractionDigits = 4): string {
  const full = formatUnits(value, 18);
  const [whole, frac = ""] = full.split(".");
  const trimmed = frac.slice(0, maxFractionDigits).replace(/0+$/, "");
  const withGroups = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return trimmed ? `${withGroups}.${trimmed}` : withGroups;
}

const DAYS_PER_YEAR = 365n;

// Trailing annual rate: annualizes the actual amount notified via
// RewardNotifiedEvent over the trailing 24h (across all reward sources), as a
// share of total staked. Reflects real recent activity rather than the
// current instantaneous on-chain rate. Returns a percentage, or null when
// there is nothing staked.
export function estimateTrailingApr(trailingDailyAmount: bigint, totalStaked: bigint): number | null {
  if (totalStaked === 0n) return null;
  const annual = trailingDailyAmount * DAYS_PER_YEAR;
  // scale to keep precision, then divide back to a float percentage
  const bps = (annual * 1_000_000n) / totalStaked; // millionths
  return (Number(bps) / 1_000_000) * 100;
}

export function formatPct(pct: number | null, digits = 2): string {
  return pct === null ? "—" : `${pct.toFixed(digits)}%`;
}

// USD value of a token amount at the given spot price, grouped and rounded to
// whole dollars (this is a display estimate, not a precise conversion).
export function formatUsd(tokenAmount: bigint, priceUsd: number): string {
  const amount = Number(formatUnits(tokenAmount, 18)) * priceUsd;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
