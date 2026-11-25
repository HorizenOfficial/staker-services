// Shared, dependency-free definitions for the Horizen L3 staking-history
// snapshot: the per-address files the generator (dataimport/generate.ts) writes
// to public/l3-history/ and the frontend (lib/l3History.ts) reads back.
//
// Kept free of Next / React / ethers imports and of non-erasable TypeScript
// syntax so that Node can run it directly (type stripping) from the generator.

export type L3Network = "mainnet" | "testnet";

// Public folder (and URL prefix) holding one sub-folder per network.
export const L3_HISTORY_DIR = "l3-history";

// Per-address files are named after the owner address in lower case. The
// source data is lower case already; wallets usually report a checksummed
// address, so always normalise before building a path.
export function l3HistoryBaseName(address: string): string {
  return address.trim().toLowerCase();
}

export function l3HistoryPath(network: L3Network, address: string, ext: "json" | "csv"): string {
  return `${L3_HISTORY_DIR}/${network}/${l3HistoryBaseName(address)}.${ext}`;
}

export function l3HistoryReadmePath(network: L3Network): string {
  return `${L3_HISTORY_DIR}/${network}/README.md`;
}

// Column order of every row (identical to the source files).
export const L3_COLUMNS = [
  "date_utc",
  "timestamp_utc",
  "row_type",
  "owner",
  "deposit_id",
  "staked_change_zen",
  "rewards_accrued_zen",
  "rewards_claimed_zen",
  "staked_balance_zen",
  "unclaimed_rewards_zen",
  "rewards_cumulative_zen",
  "paid_to",
  "block",
  "tx_hash",
] as const;

export type L3RowType = "deposit" | "withdraw" | "claim" | "daily";

// One row, a list in the order of L3_COLUMNS. Amounts are exact decimal ZEN
// strings; null means "does not apply to this row type".
export type L3Row = (string | number | null)[];

export interface L3DepositSummary {
  createdBlock: number;
  createdTime: string;
  depositedZen: string;
  withdrawnZen: string;
  rewardsAccruedZen: string;
  rewardsClaimedZen: string;
  stakedAtEZen: string;
  unclaimedAtEZen: string;
}

export interface L3OwnerSummary {
  // Number of positions (deposit ids) the address held.
  positions: number;
  // Transactions, by type (a stake top-up counts as a deposit transaction).
  depositTxs: number;
  withdrawTxs: number;
  claimTxs: number;
  depositedZen: string;
  withdrawnZen: string;
  // All rewards accrued to the address's deposits over the whole history.
  rewardsEarnedZen: string;
  rewardsClaimedZen: string;
  // State at the chain's final block (paid out on Base by the wind-down).
  stakedAtCloseZen: string;
  unclaimedAtCloseZen: string;
  firstDay: string;
  lastDay: string;
}

export interface L3OwnerFile {
  meta: {
    chain: string;
    net: L3Network;
    staker: string;
    deployBlock: number;
    deployTime: string;
    E: number;
    ETime: string;
    sourceGenerated: string;
    conventions: string;
    windDown: string | null;
  };
  owner: string;
  summary: L3OwnerSummary;
  deposits: Record<string, L3DepositSummary>;
  columns: string[];
  rows: L3Row[];
}

// ---- Exact decimal ZEN <-> wei (18 decimals) ----

const DECIMALS = 18;

export function parseZen(value: string): bigint {
  const m = /^(-)?(\d+)(?:\.(\d{1,18}))?$/.exec(value.trim());
  if (!m) throw new Error(`invalid ZEN amount: ${JSON.stringify(value)}`);
  const [, sign, whole, frac = ""] = m;
  const wei = BigInt(whole) * 10n ** BigInt(DECIMALS) + BigInt(frac.padEnd(DECIMALS, "0"));
  return sign ? -wei : wei;
}

// Same convention as the source: exact, trailing zeros dropped, "0" for zero.
export function formatZen(wei: bigint): string {
  const neg = wei < 0n;
  const abs = neg ? -wei : wei;
  const base = 10n ** BigInt(DECIMALS);
  const whole = (abs / base).toString();
  const frac = (abs % base).toString().padStart(DECIMALS, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

// ---- Per-owner summary ----

const COL = Object.fromEntries(L3_COLUMNS.map((c, i) => [c, i])) as Record<(typeof L3_COLUMNS)[number], number>;

function amount(row: L3Row, col: (typeof L3_COLUMNS)[number]): bigint {
  const v = row[COL[col]];
  return v === null || v === "" ? 0n : parseZen(String(v));
}

// Builds the recap from the owner's rows, cross-checked against the per-deposit
// summary of the source. Throws if the two disagree (the generator relies on
// this to refuse writing inconsistent files).
export function summarizeOwner(
  owner: string,
  rows: L3Row[],
  deposits: Record<string, L3DepositSummary>,
): L3OwnerSummary {
  if (rows.length === 0) throw new Error(`${owner}: no rows`);
  let depositTxs = 0, withdrawTxs = 0, claimTxs = 0;
  let deposited = 0n, withdrawn = 0n, claimed = 0n, accrued = 0n;
  for (const r of rows) {
    if (r[COL.owner] !== owner) throw new Error(`${owner}: row of another owner ${r[COL.owner]}`);
    const depositId = String(r[COL.deposit_id]);
    if (!(depositId in deposits)) throw new Error(`${owner}: row of unknown deposit ${depositId}`);
    switch (r[COL.row_type] as L3RowType) {
      case "deposit":
        depositTxs++;
        deposited += amount(r, "staked_change_zen");
        break;
      case "withdraw":
        withdrawTxs++;
        withdrawn -= amount(r, "staked_change_zen");
        break;
      case "claim":
        claimTxs++;
        claimed += amount(r, "rewards_claimed_zen");
        break;
      case "daily":
        accrued += amount(r, "rewards_accrued_zen");
        break;
      default:
        throw new Error(`${owner}: unknown row_type ${r[COL.row_type]}`);
    }
  }

  const sum = (k: keyof L3DepositSummary) =>
    Object.values(deposits).reduce((acc, d) => acc + parseZen(String(d[k])), 0n);
  const stakedAtClose = sum("stakedAtEZen");
  const unclaimedAtClose = sum("unclaimedAtEZen");

  const checks: [string, bigint, bigint][] = [
    ["deposited", deposited, sum("depositedZen")],
    ["withdrawn", withdrawn, sum("withdrawnZen")],
    ["claimed", claimed, sum("rewardsClaimedZen")],
    ["accrued", accrued, sum("rewardsAccruedZen")],
    ["staked at close", deposited - withdrawn, stakedAtClose],
    ["accrued = claimed + unclaimed", accrued, claimed + unclaimedAtClose],
  ];
  for (const [name, fromRows, expected] of checks) {
    if (fromRows !== expected) {
      throw new Error(`${owner}: ${name} mismatch: rows ${formatZen(fromRows)} vs ${formatZen(expected)}`);
    }
  }

  const days = rows.map((r) => String(r[COL.date_utc])).sort();
  return {
    positions: Object.keys(deposits).length,
    depositTxs,
    withdrawTxs,
    claimTxs,
    depositedZen: formatZen(deposited),
    withdrawnZen: formatZen(withdrawn),
    rewardsEarnedZen: formatZen(accrued),
    rewardsClaimedZen: formatZen(claimed),
    stakedAtCloseZen: formatZen(stakedAtClose),
    unclaimedAtCloseZen: formatZen(unclaimedAtClose),
    firstDay: days[0],
    lastDay: days[days.length - 1],
  };
}
