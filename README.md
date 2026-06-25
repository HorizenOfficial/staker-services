# Horizen Staking Services

This repo contains services to support the official Horizen Staking program.
Based on the official staker contracts: https://github.com/HorizenLabs/staker 

## Repository content

-   [frontend/](frontend/)

    Frontend WEB UX dApp<br/>
    Next.js 16 + React 19<br/>
    Users are identified via MetaMask connection<br/>

    The frontend reads indexed/historical data from the ZenStaker subgraph
    (see `https://github.com/HorizenLabs/staker/subgraphs/`) and live data (unclaimed rewards, global state)
    plus all write transactions directly from the chain via ethers v6.
    No custom backend service is used.

See [claude.md](claude.md) for further info.

## Local development

```bash
cd frontend
cp .env.template .env   # points at the local devnet by default
npm install
npm run dev             # http://localhost:3000
```

## Deployment (Cloudflare Pages)

The frontend is a **fully client-side dApp** and is published as a **static
export**: `next build` (with `output: "export"`) emits a static `out/` folder
served as static assets — no server or edge runtime needed.

### Build settings (Cloudflare Pages → project)

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npx next build` |
| Build output directory | `out` |
| Framework preset | Next.js (Static HTML Export) — or "None" with the fields above |

### Environment variables

Set these in the Cloudflare Pages project (the build inlines them into the
bundle). Cloudflare lets you use **different values per environment**
(Production vs Preview) — e.g. mainnet on the production branch, testnet on
previews. The "testnet environment" banner shows automatically whenever
`CHAIN_ID` is not the ZEN mainnet id (`26514`).

| Variable | Description | Example (devnet) |
|---|---|---|
| `RPC` | JSON-RPC endpoint — **public HTTPS, CORS-enabled** | `https://rpc.example.com` |
| `CHAIN_ID` | Target chain id (`26514` = ZEN mainnet) | `26514` |
| `CONTRACT_STAKER` | Staker contract address (ERC1967 proxy) | `0x…` |
| `CONTRACT_TOKEN` | ZEN token (ERC-20) address | `0x…` |
| `SUBGRAPH` | Public subgraph GraphQL endpoint | `https://…/subgraphs/name/zen-staker` |
| `EXPLORER_URL` | Block-explorer base URL (for tx/address links) | `https://explorer.example.com` |
| `SINGLE_POSITION` | Single aggregated position UX (`true`/`false`) | `true` |
| `NODE_VERSION` | Build Node version (Next 16 needs ≥ 20) | `20` |

> ⚠️ `RPC` and `SUBGRAPH` must be **public HTTPS** URLs reachable from the
> browser. A site served over HTTPS cannot call `http://localhost` (mixed
> content is blocked), so the local-devnet values do not work once deployed.

### Branch model

Cloudflare deploys one **production branch** (the dApp's main domain +
`*.pages.dev`); every other branch pushed to GitHub gets its own **preview**
URL. The production branch is configurable any time under
*Settings → Builds → Branch control*.


