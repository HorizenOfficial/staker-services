import type { NextConfig } from "next";

// The project .env uses un-prefixed names (RPC, ZEN_STAKER, ...). Wallet/contract
// calls run in the browser, so we surface the needed values to the client bundle
// here instead of renaming the .env. Next.js loads .env into process.env before
// evaluating this config.
const nextConfig: NextConfig = {
  // Static export: the app is a fully client-side dApp (chain via ethers,
  // subgraph via GraphQL, writes signed by the wallet), so `next build`
  // produces a static `out/` folder deployable to any static host (Cloudflare
  // Pages). `next dev` ignores this, so local devnet runs are unaffected.
  output: "export",
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_RPC: process.env.RPC,
    NEXT_PUBLIC_CHAIN_ID: process.env.CHAIN_ID,
    NEXT_PUBLIC_CONTRACT_STAKER: process.env.CONTRACT_STAKER,
    NEXT_PUBLIC_CONTRACT_TOKEN: process.env.CONTRACT_TOKEN,
    NEXT_PUBLIC_SUBGRAPH: process.env.SUBGRAPH,
    NEXT_PUBLIC_EXPLORER_URL: process.env.EXPLORER_URL,
    NEXT_PUBLIC_SINGLE_POSITION: process.env.SINGLE_POSITION,
  },
};

export default nextConfig;
