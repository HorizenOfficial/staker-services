# Horizen L3 staking-history snapshot

The ZEN staking program first ran on the Horizen L3, which has since been retired. This folder turns the
L3's final staking record (deposits, withdrawals, claims, daily accrued rewards) into **one static file per
address**. The History page uses these files to show users their L3 activity and let them download it.

## Source data

Copied unchanged from the (private) wind-down repo
[HorizenOfficial/horizen-winddown](https://github.com/HorizenOfficial/horizen-winddown), commit `3089fa0`:

| Here | Upstream |
|---|---|
| `source/mainnet/staking-history.{json,csv}` | `docs-typescript/staking-history-mainnet-30504979/` |
| `source/mainnet/source-readme.md` | `docs/staking-history-mainnet-30504979/readme.md` (full format description) |
| `source/testnet/staking-history.{json,csv}` | `docs-typescript/staking-history-testnet-32462836/` |

The data is final: it ends at the L3's last block (mainnet 30504979, testnet 32462836), so it should never
need refreshing. Don't edit it by hand. If upstream ever reissues it, copy the new files over and regenerate.

## Output

`npm run l3-history` (runs `generate.ts`) writes to `public/l3-history/<network>/`:

| File | Content |
|---|---|
| `<address>.json` | `meta` (chain, staker, deploy/final block and time, conventions, wind-down note), `owner`, `summary`, the owner's `deposits`, `columns`, `rows` |
| `<address>.csv` | the owner's lines of the source CSV, byte-for-byte, with the header |
| `README.md` | format description for users, rendered from `l3-history-README.template.md` |

- `<address>` is the owner address **in lower case**, not hashed. The data is public on-chain, and a hash
  can't restrict access on static hosting because anyone can compute it, so it would add nothing.
  Callers must lower-case wallet addresses (which are usually checksummed) before building a path. Use
  `l3HistoryPath()` in `lib/l3HistoryFormat.ts`.
- `summary` is computed by the script, using BigInt arithmetic on the exact 18-decimal amounts:
  `positions`, `depositTxs` (stakes and top-ups), `withdrawTxs`, `claimTxs`, `depositedZen`,
  `withdrawnZen`, `rewardsEarnedZen`, `rewardsClaimedZen`, `stakedAtCloseZen`, `unclaimedAtCloseZen`,
  `firstDay`, `lastDay`.
- Amounts stay exact decimal strings everywhere. They are never converted to JS numbers.
- Whole-dataset totals and the source's internal `rpcHost` are **not** published. Each file only contains its
  owner's data.
- The output is generated once and **committed**. The Cloudflare build doesn't run the script.

Size: mainnet has 275 owners (550 files plus README, about 11 MB). Testnet has 8 owners (16 files plus README,
about 0.4 MB). The largest single file is about 150 KB. All of this is well within Cloudflare Pages' limits
(20k files, 25 MiB per file).

## Checks

The script refuses to write anything unless all of these hold:

- the CSV and JSON have the same owners and, for each owner, the same rows in the same order;
- for each owner, the per-row sums (deposited, withdrawn, claimed, accrued) equal the per-deposit totals
  in `deposits`, and deposited - withdrawn = staked at close, and earned = claimed + unclaimed;
- across all owners, the totals equal the source's `meta.totals`, and the owner, deposit and row counts
  equal `meta`.

## Usage

```bash
cd frontend
npm run l3-history                 # regenerate both networks (rebuilds public/l3-history/<net>/ from scratch)
npm run l3-history -- --net testnet
npm run l3-history -- --check      # exit 1 if the committed files differ from a fresh generation (CI-friendly)
```

The script runs on plain Node 24, which runs TypeScript directly, so it needs no build step or extra
dependency. It imports `lib/l3HistoryFormat.ts`, which is shared with the frontend and must therefore stay
free of Next, React and ethers imports and of non-erasable TypeScript syntax (enums, parameter properties).
This is also why `tsconfig.json` enables `allowImportingTsExtensions`.

## Frontend

- **Which network.** The folder is always derived from `CHAIN_ID` (`CONFIG.l3HistoryNetwork` in
  `lib/config.ts`): 8453 (Base) and 26514 (ZEN mainnet) mean mainnet, anything else (testnets, devnet)
  means testnet. There is no separate setting. Some addresses appear in both snapshots, so a new
  production chain id must be added to that mapping.
- **Loading.** `lib/l3History.ts` (`useL3History`) fetches `<address>.json`. A 404, a response that isn't
  JSON, or a file for a different owner or network all count as "no L3 history".
- **Display.** `components/L3HistorySection.tsx` is a card at the bottom of the History page, shown only
  when data exists. It needs a connected wallet but not the right chain, because the data is static. It shows
  "Deposits", "Claims", "Rewards earned" and "Staked at L3 closure", a note about the Base wind-down payout
  (mainnet only), and download links for the CSV, the JSON and the README. The links use the `download`
  attribute and save as `horizen-l3-[testnet-]staking-<address>.<ext>`.
- **No explorer links.** L3 transaction hashes aren't linked because the L3 explorer is gone.
