"use client";

import { formatToken } from "@/lib/format";
import type { DepositDetail } from "@/lib/useDeposits";

const posStat: React.CSSProperties = {
  background: "var(--hl-grey-light)",
  borderRadius: "var(--hl-radius-sm)",
  padding: 20,
};

// Single-position dashboard card: display-only Staked/Unclaimed cells. The
// staking actions (stake / withdraw / claim) are not exposed here.
// The outer "My position" card and header live in Dashboard, shared across
// the connect / wrong-network / connected states.
export function PositionPanel({
  symbol,
  position,
  stakedBalance,
  liveUnclaimed,
}: {
  symbol: string;
  position: DepositDetail | null;
  // Total staked from getDepositorSummary — a pure on-chain aggregate that
  // needs no deposit-ID lookup, so it stays correct even when the subgraph
  // (and the learned-deposits cache) hasn't caught up with a just-created
  // deposit yet. Falls back to `position` while it's still loading.
  stakedBalance: bigint | null;
  liveUnclaimed: bigint | null;
}) {
  const unclaimedDisplay = liveUnclaimed ?? position?.unclaimedRewards ?? null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "var(--hl-space-4)",
      }}
    >
      <div style={posStat}>
        <div className="hl-label" style={{ marginBottom: 12 }}>
          Staked
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, marginBottom: 6, color: "var(--hl-navy-hover)" }}>
          {formatToken(stakedBalance ?? position?.balance ?? 0n)}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--hl-grey-text)" }}>{symbol}</span>
      </div>
      <div style={posStat}>
        <div className="hl-label" style={{ marginBottom: 12 }}>
          Unclaimed rewards
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, marginBottom: 6, color: "var(--hl-gold-bright)" }}>
          {unclaimedDisplay !== null ? formatToken(unclaimedDisplay, 6) : "—"}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--hl-grey-text)" }}>{symbol}</span>
      </div>
    </div>
  );
}
