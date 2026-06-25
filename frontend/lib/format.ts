import { formatUnits } from "ethers";
import { CONFIG } from "./config";

const SECONDS_PER_DAY = 86_400n;
const SECONDS_PER_YEAR = 31_536_000n;

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

// rewardRate is ZEN/second (wei). Daily emission = rate * 86400.
export function dailyRate(rewardRate: bigint): bigint {
  return rewardRate * SECONDS_PER_DAY;
}

// Reward token == staked token (ZEN), so APR = annual emission / total staked.
// Returns a percentage number, or null when there is nothing staked.
export function estimateApr(rewardRate: bigint, totalStaked: bigint): number | null {
  if (totalStaked === 0n) return null;
  const annual = rewardRate * SECONDS_PER_YEAR;
  // scale to keep precision, then divide back to a float percentage
  const bps = (annual * 1_000_000n) / totalStaked; // millionths
  return (Number(bps) / 1_000_000) * 100;
}

export function formatPct(pct: number | null, digits = 2): string {
  return pct === null ? "—" : `${pct.toFixed(digits)}%`;
}

// rewardEndTime is a unix-seconds bigint; 0 means "not started".
export function formatEndTime(rewardEndTime: bigint): string {
  if (rewardEndTime === 0n) return "—";
  return new Date(Number(rewardEndTime) * 1000).toLocaleString();
}

// Date and time split onto separate fields so the UI can stack them on two
// lines. Returns null when the distribution has not started.
export function formatEndTimeParts(
  rewardEndTime: bigint,
): { date: string; time: string } | null {
  if (rewardEndTime === 0n) return null;
  const d = new Date(Number(rewardEndTime) * 1000);
  return { date: d.toLocaleDateString(), time: d.toLocaleTimeString() };
}
