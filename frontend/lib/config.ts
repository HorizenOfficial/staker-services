// Runtime configuration, surfaced from the project .env via next.config.ts.

// The official ZEN mainnet chain id. Any other network the app targets is
// treated as a testnet environment (see TestnetBanner).
export const MAINNET_CHAIN_ID = 26514;

export const CONFIG = {
  rpc: process.env.NEXT_PUBLIC_RPC ?? "http://localhost:8545",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337"),
  zenStaker: process.env.NEXT_PUBLIC_ZEN_STAKER as string,
  zenToken: process.env.NEXT_PUBLIC_ZEN_TOKEN as string,
  subgraph: process.env.NEXT_PUBLIC_SUBGRAPH as string,
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL ?? "",
  // Default on: present a single aggregated position and route "stake" to
  // stakeMore on the existing deposit. Disable to expose the multi-deposit model.
  singlePosition: (process.env.NEXT_PUBLIC_SINGLE_POSITION ?? "true") !== "false",
} as const;
