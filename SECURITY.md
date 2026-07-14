# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

A bug bounty program covering the Horizen staking system runs on
[Immunefi](https://immunefi.com/).

<!-- TODO: replace with the public Immunefi program link once published -->

For reports outside the bounty scope — or before the program page is live —
use GitHub's private vulnerability reporting on this repository
(*Security → Report a vulnerability*).

## Scope

| Period | Scope |
|---|---|
| Jul 15 – Jul 27, 2026 | **Testnet** deployment (Horizen Testnet, chain ID 2651420) |
| From Jul 27, 2026 | Extended to the **mainnet** deployment (Horizen, chain ID 26514) |

- **Staking dApp** — this repository (`frontend/`), deployed at
  https://staking-testnet.horizen.io
- **Staking contracts & subgraph** — https://github.com/HorizenOfficial/staker
- **In-scope testnet contract addresses** — see
  [`frontend/.env.testnet`](frontend/.env.testnet)

The authoritative scope, impacts, rewards, and rules of engagement are defined
on the Immunefi program page; where this file and the program page differ, the
program page wins.

## Rules of engagement

- **Proof-of-concept execution is local-only.** Run PoCs against a local node
  or a local fork of testnet/mainnet state (e.g. Anvil/Foundry/Hardhat).
  Broadcasting exploit transactions to **any public network — testnet
  included — is prohibited**: a public transaction is public disclosure of the
  exploit and can be replayed by anyone. Reading public state and forking it
  locally is fine.
- For frontend findings, run the dApp locally against a local chain (see
  [README — Local development](README.md#local-development)) or limit the
  demonstration to client-side behavior with no on-chain writes.

## Notes on this repository's attack surface

- The dApp is a **fully client-side static export** — no backend, server, or
  edge runtime. Server-side web vulnerabilities (SSRF, middleware bypass,
  React Server Component or image-optimization issues) do not apply to the
  deployed site.
- Subgraph staleness or unavailability is surfaced to users by a health banner
  by design, and write paths never depend on the subgraph — data staleness
  alone is not a vulnerability.
- Third-party infrastructure (Base, Caldera rollup infra, LayerZero, Goldsky,
  Cloudflare Pages, CoinGecko) is out of scope for this repository.
