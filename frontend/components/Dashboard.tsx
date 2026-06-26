"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { useGlobalState, useUserSummary, useLiveReward } from "@/lib/useDashboard";
import { useDeposits } from "@/lib/useDeposits";
import { useDepositActions, actionStepLabel } from "@/lib/useDepositActions";
import {
  addressUrl,
  dailyRate,
  estimateApr,
  formatEndTimeParts,
  formatPct,
  formatToken,
  tokenUrl,
} from "@/lib/format";
import { CONFIG } from "@/lib/config";
import { useTokenSymbol } from "@/lib/tokenSymbol";
import { StatCard } from "./StatCard";
import { ActionModal } from "./ActionModal";
import { StakeDialog } from "./StakeDialog";

// The token symbol, linked to its block-explorer token page. Falls back to
// plain text when no explorer is configured.
function TokenSymbolLink({ symbol }: { symbol: string }) {
  const href = tokenUrl(CONFIG.contractToken);
  if (!href) return <>{symbol}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "var(--hl-navy)", textDecoration: "underline" }}
    >
      {symbol}
    </a>
  );
}

// An address rendered in the shared navy style, linked to its block-explorer
// page. Falls back to plain text when no explorer is configured.
function ExplorerAddress({ address }: { address: string }) {
  const href = addressUrl(address);
  const style: React.CSSProperties = {
    color: "var(--hl-navy)",
    wordBreak: "break-all",
    textDecoration: href ? "underline" : "none",
  };
  if (!href) {
    return <span className="hl-address" style={style}>{address}</span>;
  }
  return (
    <a className="hl-address" href={href} target="_blank" rel="noopener noreferrer" style={style}>
      {address}
    </a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 14,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: "var(--hl-grey-text)",
        fontFamily: "var(--font-sans)",
        margin: "0 0 var(--hl-space-5)",
      }}
    >
      {children}
    </h2>
  );
}

// Stacks the distribution end date over the time (smaller), both centered, so
// the value never wraps mid-token the way a single locale string does.
function EndTime({ rewardEndTime }: { rewardEndTime: bigint }) {
  const parts = formatEndTimeParts(rewardEndTime);
  if (!parts) return <>—</>;
  return (
    <div style={{ textAlign: "center" }}>
      <div>{parts.date}</div>
      <div style={{ fontSize: 20, marginTop: 2 }}>{parts.time}</div>
    </div>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "var(--hl-space-5)",
};

const btnRow: React.CSSProperties = { display: "flex", gap: "var(--hl-space-3)", flexWrap: "wrap" };

// Shared width so Add Stake / Withdraw / Claim line up to the same length across cards.
const actionBtn: React.CSSProperties = { width: 140 };

export function Dashboard() {
  const { address, isCorrectChain, switchChain } = useWallet();
  const active = address && isCorrectChain ? address : null;
  const symbol = useTokenSymbol();

  const { data: global, error: globalError } = useGlobalState();
  const { data: user, reload: reloadUser } = useUserSummary(active);
  const { deposits, reload: reloadDeposits } = useDeposits(active);
  const actions = useDepositActions();

  const [dialog, setDialog] = useState<"stake" | "withdraw" | null>(null);

  // Open a dialog from a clean slate: a prior action's error (e.g. a rejected
  // claim) lives on the shared action state and would otherwise show in the
  // freshly-opened dialog before the new action has even started.
  const openDialog = useCallback(
    (which: "stake" | "withdraw") => {
      actions.reset();
      setDialog(which);
    },
    [actions]
  );

  // Single-position: one deposit drives Withdraw/Claim.
  const position = CONFIG.singlePosition ? deposits[0] ?? null : null;

  const liveUnclaimed = useLiveReward(
    user?.totalUnclaimed ?? null,
    global?.rewardRate ?? 0n,
    user?.totalEarningPower ?? 0n,
    global?.totalEarningPower ?? 0n,
    global?.rewardEndTime ?? 0n
  );

  const refresh = useCallback(() => {
    reloadUser();
    reloadDeposits();
  }, [reloadUser, reloadDeposits]);

  const claimingNow = actions.busy && actions.state.kind === "claim";
  const stepLabel = actionStepLabel(actions.state);

  const onClaim = useCallback(async () => {
    if (!position) return;
    const ok = await actions.claim(position.depositId);
    if (ok) refresh();
  }, [actions, position, refresh]);

  return (
    <div style={{ maxWidth: 980, width: "100%" }}>
      <h1 style={{ fontSize: 45, marginBottom: "var(--hl-space-2)" }}>Zen Staking Dashboard</h1>
      <p style={{ color: "var(--hl-grey-text)", margin: "0 0 var(--hl-space-10)" }}>
        Stake <TokenSymbolLink symbol={symbol} /> to earn {symbol} rewards. No lock-up - claim or withdraw any time.
      </p>

      {/* Protocol stats */}
      <SectionLabel>Protocol:</SectionLabel>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--hl-space-3)", marginBottom: "var(--hl-space-6)" }}>
        <span className="hl-label">Staking contract address: </span>
        <ExplorerAddress address={CONFIG.contractStaker} />
      </div>
      {globalError ? (
        <div className="hl-alert hl-alert-error">{globalError}</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--hl-space-5)", alignItems: "stretch" }}>
          {/* Standalone protocol headline stats. The hidden header spacer mirrors
              the distribution-window box's title (padding + heading + margin) so
              the four headline numbers line up when the cards sit side by side. */}
          <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column" }}>
            <div
              aria-hidden
              className="hl-stat-spacer"
              style={{
                paddingTop: "var(--hl-space-5)",
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 16,
                marginBottom: "var(--hl-space-5)",
                visibility: "hidden",
              }}
            >
              &nbsp;
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--hl-space-5)" }}>
              <StatCard label={`Total ${symbol} Staked`} value={global ? formatToken(global.totalStaked, 6) : "…"} unit={symbol} highlight />
              <StatCard label="Est. APR" value={global ? formatPct(estimateApr(global.rewardRate, global.totalStaked)) : "…"} hint="Based on the current rate" />
            </div>
          </div>
          {/* Reward rate + end time describe only the active distribution window;
              future top-ups can start a new one, so they're grouped under a label
              that makes their "current, not final" nature explicit. */}
          <div
            className="hl-card"
            style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", padding: "var(--hl-space-5)" }}
          >
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--hl-navy)",
                marginBottom: "var(--hl-space-5)",
              }}
            >
              Current distribution window:
            </div>
            <div
              style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--hl-space-5)" }}
            >
              <StatCard label="Reward Rate" value={global ? formatToken(dailyRate(global.rewardRate), 6) : "…"} unit={`${symbol} / day`} />
              <StatCard label="Distribution Ends" value={global ? <EndTime rewardEndTime={global.rewardEndTime} /> : "…"} />
            </div>
          </div>
        </div>
      )}

      {/* User position */}
      <div style={{ marginTop: "var(--hl-space-12)" }}>
        <SectionLabel>Your Position:</SectionLabel>
        {!address ? (
          <div className="hl-card" style={{ textAlign: "center", padding: "var(--hl-space-12)" }}>
            <p style={{ color: "var(--hl-grey-text)", margin: 0 }}>
              Connect your wallet to see your staking position.
            </p>
          </div>
        ) : !isCorrectChain ? (
          <div className="hl-alert hl-alert-warning" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--hl-space-5)", flexWrap: "wrap" }}>
            <span>Switch to the correct network to view your position.</span>
            <button className="hl-btn hl-btn-ghost hl-btn-sm" onClick={switchChain}>
              Switch network
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--hl-space-3)", marginBottom: "var(--hl-space-6)" }}>
              <span className="hl-label">Wallet address: </span>
              <ExplorerAddress address={address} />
            </div>

            {actions.state.error && !dialog && (
              <div className="hl-alert hl-alert-error" style={{ marginBottom: "var(--hl-space-5)" }}>
                {actions.state.error}
              </div>
            )}

            {/* Progress for the inline claim (the withdraw dialog shows its own). */}
            {actions.busy && !dialog && stepLabel && (
              <div className="hl-alert hl-alert-warning" style={{ marginBottom: "var(--hl-space-5)" }}>
                {stepLabel}…
              </div>
            )}

            <div style={grid}>
              <StatCard
                label={`My Staked ${symbol}`}
                value={user ? formatToken(user.totalStaked, 8) : "…"}
                unit={symbol}
                footer={
                  CONFIG.singlePosition ? (
                    <div style={btnRow}>
                      <button className="hl-btn hl-btn-primary hl-btn-sm" style={actionBtn} onClick={() => openDialog("stake")} disabled={actions.busy}>
                        Add Stake
                      </button>
                      <button
                        className="hl-btn hl-btn-primary hl-btn-sm"
                        style={actionBtn}
                        onClick={() => openDialog("withdraw")}
                        disabled={actions.busy || !position || position.balance === 0n}
                      >
                        Withdraw
                      </button>
                    </div>
                  ) : undefined
                }
              />

              {/* Earning power == staked amount under the identity calculator;
                  only meaningful in the multi-deposit model. */}
              {!CONFIG.singlePosition && (
                <StatCard label="My Earning Power" value={user ? formatToken(user.totalEarningPower) : "…"} />
              )}

              <StatCard
                label="Unclaimed Rewards"
                value={liveUnclaimed !== null ? formatToken(liveUnclaimed, 8) : user ? "—" : "…"}
                unit={symbol}
                hint={user?.totalUnclaimed === null ? "Subgraph unavailable" : "Updates live"}
                footer={
                  CONFIG.singlePosition ? (
                    <button
                      className="hl-btn hl-btn-primary hl-btn-sm"
                      style={actionBtn}
                      onClick={onClaim}
                      disabled={actions.busy || !position || position.unclaimedRewards === 0n}
                    >
                      {claimingNow ? "Claiming…" : "Claim"}
                    </button>
                  ) : undefined
                }
              />
            </div>

            {/* Multi-deposit model: management lives on the deposits page. */}
            {!CONFIG.singlePosition && (
              <div style={{ ...btnRow, marginTop: "var(--hl-space-8)" }}>
                <button className="hl-btn hl-btn-primary" onClick={() => openDialog("stake")}>
                  Add Stake
                </button>
                <Link href="/deposits" className="hl-btn hl-btn-ghost">
                  Manage Deposits
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      {dialog === "stake" && (
        <StakeDialog
          onClose={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
      {dialog === "withdraw" && position && (
        <ActionModal
          mode="withdraw"
          depositId={position.depositId}
          max={position.balance}
          maxLabel="Staked"
          unclaimed={position.unclaimedRewards}
          symbol={symbol}
          busy={actions.busy}
          phaseLabel={stepLabel}
          error={actions.state.error}
          onClose={() => {
            if (!actions.busy) {
              actions.reset();
              setDialog(null);
            }
          }}
          onConfirm={async (amount, claimRewards) => {
            const ok = await actions.withdraw(position.depositId, amount, claimRewards);
            if (ok) {
              setDialog(null);
              refresh();
            }
          }}
        />
      )}
    </div>
  );
}
