// Generates the per-address Horizen L3 staking-history files served by the
// frontend from public/l3-history/<network>/ (see dataimport/README.md).
//
//   npm run l3-history             # regenerate both networks
//   npm run l3-history -- --check  # verify the committed files are up to date
//   npm run l3-history -- --net testnet
//
// Runs on plain Node (>= 22.18 / 24, native type stripping): no build step and
// no extra dependency. Refuses to write anything if the source fails a check.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  L3_COLUMNS,
  L3_HISTORY_DIR,
  formatZen,
  l3HistoryBaseName,
  parseZen,
  summarizeOwner,
  type L3DepositSummary,
  type L3Network,
  type L3OwnerFile,
  type L3OwnerSummary,
  type L3Row,
} from "../lib/l3HistoryFormat.ts";

const HERE = import.meta.dirname;
const SOURCE_DIR = join(HERE, "source");
const PUBLIC_DIR = join(HERE, "..", "public", L3_HISTORY_DIR);
const README_TEMPLATE = join(HERE, "l3-history-README.template.md");

// Per-network wording. The wind-down note (where the stake and unclaimed
// rewards at the final block went) is known for mainnet only.
const NETWORKS: Record<L3Network, { chain: string; windDown: string | null }> = {
  mainnet: {
    chain: "Horizen L3",
    windDown:
      "The stake and the unclaimed rewards at the chain's final block were paid out on Base by the wind-down " +
      "distribution of 2026-11-20 (Base transaction " +
      "0x6a5373e35e8e328c667fd3ea6ac259cf0e41ba5c88fae52667ae37e1ec45219a), to the owner's own address unless it " +
      "was held back or redirected. Those payments are Base transactions and are not rows of these files.",
  },
  testnet: {
    chain: "Horizen L3 testnet",
    windDown: null,
  },
};

interface SourceDeposit extends L3DepositSummary {
  owner: string;
}

interface SourceFile {
  meta: {
    net: string;
    staker: string;
    deployBlock: number;
    deployTime: string;
    E: number;
    ETime: string;
    generated: string;
    deposits: number;
    owners: number;
    rows: number;
    rowsByType: Record<string, number>;
    totals: Record<string, string>;
    conventions: string;
  };
  columns: string[];
  deposits: Record<string, SourceDeposit>;
  rowsByOwner: Record<string, L3Row[]>;
}

function fail(msg: string): never {
  throw new Error(msg);
}

function readCsvByOwner(path: string): { header: string; byOwner: Map<string, string[]> } {
  const text = readFileSync(path, "utf8");
  if (text.includes("\r") || text.includes('"')) fail(`${path}: unexpected CR or quote, the parser assumes plain CSV`);
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const header = lines.shift() ?? fail(`${path}: empty`);
  if (header !== L3_COLUMNS.join(",")) fail(`${path}: unexpected header ${header}`);
  const ownerCol = L3_COLUMNS.indexOf("owner");
  const byOwner = new Map<string, string[]>();
  for (const line of lines) {
    const fields = line.split(",");
    if (fields.length !== L3_COLUMNS.length) fail(`${path}: ${fields.length} fields in line ${line}`);
    const owner = fields[ownerCol];
    if (!byOwner.has(owner)) byOwner.set(owner, []);
    byOwner.get(owner)!.push(line);
  }
  return { header, byOwner };
}

// Rows one per line; everything else indented. Deterministic, diff-friendly.
function serialize(file: L3OwnerFile): string {
  const placeholder = "__ROWS__";
  const head = JSON.stringify({ ...file, rows: placeholder }, null, 2);
  const rows = "[\n" + file.rows.map((r) => "    " + JSON.stringify(r)).join(",\n") + "\n  ]";
  return head.replace(JSON.stringify(placeholder), rows) + "\n";
}

function buildReadme(network: L3Network, meta: SourceFile["meta"]): string {
  const { chain, windDown } = NETWORKS[network];
  const values: Record<string, string> = {
    CHAIN: chain,
    STAKER: meta.staker,
    DEPLOY_BLOCK: String(meta.deployBlock),
    DEPLOY_TIME: meta.deployTime,
    E: String(meta.E),
    E_TIME: meta.ETime,
    WIND_DOWN: windDown ? `\n${windDown}\n` : "",
  };
  return readFileSync(README_TEMPLATE, "utf8").replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    k in values ? values[k] : fail(`README template: unknown placeholder ${k}`),
  );
}

// Returns the full set of output files (relative path -> content) for one network.
function buildNetwork(network: L3Network): Map<string, string> {
  const dir = join(SOURCE_DIR, network);
  const src = JSON.parse(readFileSync(join(dir, "staking-history.json"), "utf8")) as SourceFile;
  const { header, byOwner: csvByOwner } = readCsvByOwner(join(dir, "staking-history.csv"));
  const { meta } = src;

  if (meta.net !== network) fail(`${network}: source meta.net is ${meta.net}`);
  if (src.columns.join(",") !== L3_COLUMNS.join(",")) fail(`${network}: unexpected columns ${src.columns}`);

  // Deposits grouped by owner (source owners are lower case).
  const depositsByOwner = new Map<string, Record<string, L3DepositSummary>>();
  for (const [id, { owner, ...rest }] of Object.entries(src.deposits)) {
    if (!depositsByOwner.has(owner)) depositsByOwner.set(owner, {});
    depositsByOwner.get(owner)![id] = rest;
  }

  const owners = Object.keys(src.rowsByOwner).sort();
  const sameSet = (a: Iterable<string>) => [...a].sort().join() === owners.join();
  if (!sameSet(csvByOwner.keys())) fail(`${network}: CSV and JSON owners differ`);
  if (!sameSet(depositsByOwner.keys())) fail(`${network}: deposit owners and row owners differ`);
  if (owners.length !== meta.owners) fail(`${network}: ${owners.length} owners, meta says ${meta.owners}`);
  if (Object.keys(src.deposits).length !== meta.deposits) fail(`${network}: deposit count differs from meta`);

  const out = new Map<string, string>();
  const totals = { deposited: 0n, withdrawn: 0n, earned: 0n, claimed: 0n, staked: 0n, unclaimed: 0n };
  const rowsByType: Record<string, number> = {};
  let rowCount = 0;

  for (const owner of owners) {
    if (owner !== l3HistoryBaseName(owner) || !/^0x[0-9a-f]{40}$/.test(owner)) fail(`${network}: bad owner ${owner}`);
    const rows = src.rowsByOwner[owner];
    const csvLines = csvByOwner.get(owner)!;

    // The CSV must be the exact same rows, in the same order, as the JSON.
    if (csvLines.length !== rows.length) fail(`${network} ${owner}: ${csvLines.length} CSV lines vs ${rows.length} rows`);
    rows.forEach((r, i) => {
      const asCsv = r.map((v) => (v === null ? "" : String(v))).join(",");
      if (asCsv !== csvLines[i]) fail(`${network} ${owner}: CSV line ${i} differs from the JSON row`);
    });

    const deposits = depositsByOwner.get(owner)!;
    const summary: L3OwnerSummary = summarizeOwner(owner, rows, deposits);

    totals.deposited += parseZen(summary.depositedZen);
    totals.withdrawn += parseZen(summary.withdrawnZen);
    totals.earned += parseZen(summary.rewardsEarnedZen);
    totals.claimed += parseZen(summary.rewardsClaimedZen);
    totals.staked += parseZen(summary.stakedAtCloseZen);
    totals.unclaimed += parseZen(summary.unclaimedAtCloseZen);
    for (const r of rows) rowsByType[String(r[2])] = (rowsByType[String(r[2])] ?? 0) + 1;
    rowCount += rows.length;

    const file: L3OwnerFile = {
      meta: {
        chain: NETWORKS[network].chain,
        net: network,
        staker: meta.staker,
        deployBlock: meta.deployBlock,
        deployTime: meta.deployTime,
        E: meta.E,
        ETime: meta.ETime,
        sourceGenerated: meta.generated,
        conventions: meta.conventions,
        windDown: NETWORKS[network].windDown,
      },
      owner,
      summary,
      deposits,
      columns: [...L3_COLUMNS],
      rows,
    };
    out.set(`${owner}.json`, serialize(file));
    out.set(`${owner}.csv`, [header, ...csvLines].join("\n") + "\n");
  }

  // Whole-dataset checks against the source's own totals.
  const t = meta.totals;
  const globalChecks: [string, bigint, string][] = [
    ["depositedZen", totals.deposited, t.depositedZen],
    ["withdrawnZen", totals.withdrawn, t.withdrawnZen],
    ["rewardsAccruedZen", totals.earned, t.rewardsAccruedZen],
    ["rewardsClaimedZen", totals.claimed, t.rewardsClaimedZen],
    ["stakedAtEZen", totals.staked, t.stakedAtEZen],
    ["rewardsUnclaimedAtEZen", totals.unclaimed, t.rewardsUnclaimedAtEZen],
  ];
  for (const [name, got, want] of globalChecks) {
    if (got !== parseZen(want)) fail(`${network}: total ${name} ${formatZen(got)} vs meta ${want}`);
  }
  if (rowCount !== meta.rows) fail(`${network}: ${rowCount} rows, meta says ${meta.rows}`);
  for (const [type, n] of Object.entries(meta.rowsByType)) {
    if ((rowsByType[type] ?? 0) !== n) fail(`${network}: ${rowsByType[type] ?? 0} ${type} rows, meta says ${n}`);
  }

  out.set("README.md", buildReadme(network, meta));
  console.log(
    `${network}: ${owners.length} owners, ${rowCount} rows, earned ${formatZen(totals.earned)} ZEN — all checks passed`,
  );
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const netIdx = args.indexOf("--net");
  const networks: L3Network[] =
    netIdx >= 0 ? [args[netIdx + 1] as L3Network] : (Object.keys(NETWORKS) as L3Network[]);
  for (const n of networks) if (!(n in NETWORKS)) fail(`unknown network ${n} (mainnet | testnet)`);

  let stale = 0;
  for (const network of networks) {
    const files = buildNetwork(network);
    const dir = join(PUBLIC_DIR, network);

    if (check) {
      const existing = existsSync(dir) ? readdirSync(dir) : [];
      for (const name of existing) {
        if (!files.has(name)) {
          console.error(`${network}: unexpected file ${name}`);
          stale++;
        }
      }
      for (const [name, content] of files) {
        const path = join(dir, name);
        if (!existsSync(path) || readFileSync(path, "utf8") !== content) {
          console.error(`${network}: ${name} is missing or out of date`);
          stale++;
        }
      }
      continue;
    }

    // The folder is fully owned by this script: rebuild it from scratch so no
    // stale file survives.
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const [name, content] of files) writeFileSync(join(dir, name), content);
    console.log(`${network}: wrote ${files.size} files to ${dir}`);
  }

  if (check && stale > 0) {
    console.error(`${stale} file(s) out of date — run: npm run l3-history`);
    process.exit(1);
  }
}

main();
