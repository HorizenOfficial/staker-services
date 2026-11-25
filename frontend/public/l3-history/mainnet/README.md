# Your staking history on Horizen L3

These files are your record of the ZEN staking program on Horizen L3: every staking transaction of your
address and every day's accrued rewards of the ZenStaker `0x6bf7cf29a8bce11aa62cf593d165c244fa4d3e31`, from the contract's deployment
(block 21317419, 2026-07-22 10:05:02 UTC) to the chain's final state (block 30504979, 2026-11-05 18:11:02 UTC).

They were extracted from the chain itself before its nodes and block explorer were retired. Transaction hashes
and block numbers are kept as a record; they can no longer be looked up on an L3 explorer.

The stake and the unclaimed rewards at the chain's final block were paid out on Base by the wind-down distribution of 2026-11-20 (Base transaction 0x6a5373e35e8e328c667fd3ea6ac259cf0e41ba5c88fae52667ae37e1ec45219a), to the owner's own address unless it was held back or redirected. Those payments are Base transactions and are not rows of these files.

## Files

- `<address>.csv`: one table, one line per row described below. Import it into a spreadsheet and filter by
  `row_type` (and by `deposit_id` if you held more than one deposit).
- `<address>.json`: the same rows, plus a recap of your address (`summary`), a per-deposit recap
  (`deposits`) and the snapshot's metadata (`meta`).

## Rows

| `row_type` | One row per | Source |
|---|---|---|
| `deposit` | stake or top-up transaction | `StakeDeposited` event |
| `withdraw` | withdrawal transaction | `StakeWithdrawn` event |
| `claim` | reward claim transaction | `RewardClaimed` event |
| `daily` | deposit and UTC calendar day | `deposits(id)` and `unclaimedReward(id)` read at the day's last block |

A `daily` row is the state at the last block of that UTC day (timestamp 23:59:59; on the last day, the chain's
final state). It is written for every day on which the deposit holds stake or unclaimed rewards at the end of the
day, or accrued rewards during it. The contract logs no event when rewards accrue, so the day's accrual is derived
from two reads:

    rewards_accrued_zen = unclaimed at the end of the day - unclaimed at the end of the previous day + claimed during the day

## Columns

| Column | Filled on | Meaning |
|---|---|---|
| `date_utc` | all | UTC calendar day, `YYYY-MM-DD` |
| `timestamp_utc` | all | UTC time of the row's block, `YYYY-MM-DD HH:MM:SS` |
| `row_type` | all | `deposit`, `withdraw`, `claim` or `daily` |
| `owner` | all | owner of the deposit (your address, lower case) |
| `deposit_id` | all | the staker's deposit id; one owner can hold several deposits |
| `staked_change_zen` | deposit, withdraw | amount staked (positive) or withdrawn (negative) |
| `rewards_accrued_zen` | daily | rewards the deposit earned during that day |
| `rewards_claimed_zen` | claim | rewards paid out by the claim |
| `staked_balance_zen` | deposit, withdraw, daily | stake in the deposit after the event / at the end of the day |
| `unclaimed_rewards_zen` | daily | rewards earned and not yet claimed, at the end of the day |
| `rewards_cumulative_zen` | daily | all rewards the deposit earned up to the end of the day |
| `paid_to` | claim | address the claim was paid to (the deposit's claimer; your address) |
| `block` | all | L3 block number |
| `tx_hash` | deposit, withdraw, claim | L3 transaction hash |

Amounts are exact decimal ZEN (18 decimals, trailing zeros dropped); a spreadsheet shows about 15 significant
digits. An empty CSV cell (`null` in the JSON) means the column does not apply to that row type.

## JSON structure

| Key | Content |
|---|---|
| `meta` | chain, network, staker address, deployment and final block / time, source generation time, conventions, wind-down note |
| `owner` | your address, lower case |
| `summary` | recap of your address, see below |
| `deposits` | per deposit id: `createdBlock`, `createdTime`, `depositedZen`, `withdrawnZen`, `rewardsAccruedZen`, `rewardsClaimedZen`, `stakedAtEZen`, `unclaimedAtEZen` (`E` = the chain's final block) |
| `columns` | the column names, in order |
| `rows` | the rows, each a list in the order of `columns` |

`summary` fields:

| Field | Meaning |
|---|---|
| `positions` | number of deposits (deposit ids) you held |
| `depositTxs`, `withdrawTxs`, `claimTxs` | number of stake (including top-up), withdrawal and claim transactions |
| `depositedZen`, `withdrawnZen` | total staked and total withdrawn |
| `rewardsEarnedZen` | all rewards your deposits earned (sum of `rewards_accrued_zen`) |
| `rewardsClaimedZen` | rewards you claimed on L3 |
| `stakedAtCloseZen`, `unclaimedAtCloseZen` | stake and unclaimed rewards at the chain's final block |
| `firstDay`, `lastDay` | first and last UTC day with a row |

## Reading it

- Rewards earned in a period: the sum of `rewards_accrued_zen` over the `daily` rows in that period.
- Balance on a date: `staked_balance_zen` and `unclaimed_rewards_zen` of the `daily` row of that date.
- Over the whole history, per deposit: earned = claimed + unclaimed at the final block, and
  staked - withdrawn = stake at the final block.
