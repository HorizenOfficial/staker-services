"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { useGlobalState, useUserSummary, useLiveReward } from "@/lib/useDashboard";
import { useDeposits } from "@/lib/useDeposits";
import { useDepositActions } from "@/lib/useDepositActions";
import {
  dailyRate,
  estimateApr,
  formatEndTimeParts,
  formatPct,
  formatToken,
} from "@/lib/format";
import { CONFIG } from "@/lib/config";
import { StatCard } from "./StatCard";
import { ActionModal } from "./ActionModal";
import { StakeDialog } from "./StakeDialog";

const PHASE_LABEL: Record<string, string> = {
  approving: "Confirm the approval…",
  claiming: "Claiming rewards…",
  pending: "Awaiting confirmation…",
};

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
  const { address, isCorrectChain } = useWallet();
  const active = address && isCorrectChain ? address : null;

  const { data: global, error: globalError } = useGlobalState();
  const { data: user, reload: reloadUser } = useUserSummary(active);
  const { deposits, reload: reloadDeposits } = useDeposits(active);
  const actions = useDepositActions();

  const [dialog, setDialog] = useState<"stake" | "withdraw" | null>(null);

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
  const phaseLabel = actions.state.phase ? PHASE_LABEL[actions.state.phase] : null;

  const onClaim = useCallback(async () => {
    if (!position) return;
    const ok = await actions.claim(position.depositId);
    if (ok) refresh();
  }, [actions, position, refresh]);

  return (
    <div style={{ maxWidth: 980, width: "100%" }}>
      <h1 style={{ fontSize: 45, marginBottom: "var(--hl-space-2)" }}>Zen Staking Dashboard</h1>
      <p style={{ color: "var(--hl-grey-text)", margin: "0 0 var(--hl-space-10)" }}>
        Stake ZEN to earn ZEN rewards. No lock-up - claim or withdraw any time.
      </p>

      {/* Protocol stats */}
      <SectionLabel>Protocol</SectionLabel>
      {globalError ? (
        <div className="hl-alert hl-alert-error">{globalError}</div>
      ) : (
        <div style={grid}>
          <StatCard label="Total ZEN Staked" value={global ? formatToken(global.totalStaked) : "…"} unit="ZEN" highlight />
          <StatCard label="Reward Rate" value={global ? formatToken(dailyRate(global.rewardRate)) : "…"} unit="ZEN / day" />
          <StatCard label="Est. APR" value={global ? formatPct(estimateApr(global.rewardRate, global.totalStaked)) : "…"} hint="Based on the current rate" />
          <StatCard label="Distribution Ends" value={global ? <EndTime rewardEndTime={global.rewardEndTime} /> : "…"} />
        </div>
      )}

      {/* User position */}
      <div style={{ marginTop: "var(--hl-space-12)" }}>
        <SectionLabel>Your Position</SectionLabel>
        {!address ? (
          <div className="hl-card" style={{ textAlign: "center", padding: "var(--hl-space-12)" }}>
            <p style={{ color: "var(--hl-grey-text)", margin: 0 }}>
              Connect your wallet to see your staking position.
            </p>
          </div>
        ) : !isCorrectChain ? (
          <div className="hl-alert hl-alert-warning">Switch to the correct network to view your position.</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--hl-space-3)", marginBottom: "var(--hl-space-6)" }}>
              <span className="hl-label">Wallet address: </span>
              <span className="hl-address" style={{ color: "var(--hl-navy)", wordBreak: "break-all" }}>{address}</span>
            </div>

            {actions.state.error && !dialog && (
              <div className="hl-alert hl-alert-error" style={{ marginBottom: "var(--hl-space-5)" }}>
                {actions.state.error}
              </div>
            )}

            <div style={grid}>
              <StatCard
                label="My Staked ZEN"
                value={user ? formatToken(user.totalStaked) : "…"}
                unit="ZEN"
                footer={
                  CONFIG.singlePosition ? (
                    <div style={btnRow}>
                      <button className="hl-btn hl-btn-primary hl-btn-sm" style={actionBtn} onClick={() => setDialog("stake")} disabled={actions.busy}>
                        Add Stake
                      </button>
                      <button
                        className="hl-btn hl-btn-primary hl-btn-sm"
                        style={actionBtn}
                        onClick={() => setDialog("withdraw")}
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
                value={liveUnclaimed !== null ? formatToken(liveUnclaimed, 6) : user ? "—" : "…"}
                unit="ZEN"
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
                <button className="hl-btn hl-btn-primary" onClick={() => setDialog("stake")}>
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
          symbol="ZEN"
          busy={actions.busy}
          phaseLabel={phaseLabel}
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
