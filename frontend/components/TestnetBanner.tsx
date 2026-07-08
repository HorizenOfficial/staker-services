"use client";

import { CONFIG, MAINNET_CHAIN_ID } from "@/lib/config";

// Full-width strip under the top bar, shown whenever the app targets any
// network other than ZEN mainnet. Based on the configured chain id (the network
// the dApp talks to), so it is correct even before a wallet is connected.
export function TestnetBanner() {
  if (CONFIG.chainId === MAINNET_CHAIN_ID) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="hl-mono"
      style={{
        background: "transparent",
        color: "var(--hl-gold-bright)",
        textAlign: "center",
        padding: "10px clamp(20px, 4vw, 28px)",
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: 1.2,
        textTransform: "uppercase",
      }}
    >
      You are in testnet environment!
    </div>
  );
}
