"use client";

import { useCallback, useState } from "react";
import { formatUnits, parseEther } from "ethers";
import { useWallet } from "@/lib/wallet";
import { useStake } from "@/lib/useStake";
import { useDepositActions, actionStepLabel } from "@/lib/useDepositActions";
import { useLearnedDeposits } from "@/lib/learnedDeposits";
import { getReadContracts } from "@/lib/contracts";
import { formatToken, truncateAddress } from "@/lib/format";
import type { DepositDetail } from "@/lib/useDeposits";
import { usePolling } from "@/lib/usePolling";

const BALANCE_POLL_MS = 10_000;

type Tab = "stake" | "withdraw" | "claim";

// Maps each in-progress stake phase to its step number + label. Steps shift
// from 3/4 & 4/4 (approval required) down to 1/2 & 2/2 when the allowance
// already covers the amount, so the count always matches `totalSteps`.
function stakeStepInfo(status: string, totalSteps: number): { n: number; label: string } | null {
  const withApproval = totalSteps === 4;
  switch (status) {
    case "approve-wallet":
      return { n: 1, label: "Approve token spending in your wallet" };
    case "approve-pending":
      return { n: 2, label: "Waiting for the approval to confirm" };
    case "stake-wallet":
      return { n: withApproval ? 3 : 1, label: "Confirm the stake in your wallet" };
    case "stake-pending":
      return { n: withApproval ? 4 : 2, label: "Waiting for the stake to confirm" };
    default:
      return null;
  }
}

const posStat: React.CSSProperties = {
  background: "var(--hl-grey-light)",
  border: "1px solid var(--hl-grey)",
  borderRadius: "var(--hl-radius-sm)",
  padding: 18,
};

// Single-position dashboard card: display-only Staked/Unclaimed cells plus an
// inline Stake / Withdraw / Claim tab switcher (no dialogs), matching the
// redesigned mockup. Multi-deposit management stays dialog-based on /deposits.
export function PositionPanel({
  symbol,
  address,
  position,
  stakedBalance,
  liveUnclaimed,
  onRefresh,
}: {
  symbol: string;
  address: string;
  position: DepositDetail | null;
  // Total staked from getDepositorSummary — a pure on-chain aggregate that
  // needs no deposit-ID lookup, so it stays correct even when the subgraph
  // (and the learned-deposits cache) hasn't caught up with a just-created
  // deposit yet. Falls back to `position` while it's still loading.
  stakedBalance: bigint | null;
  liveUnclaimed: bigint | null;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<Tab>("stake");
  const unclaimedDisplay = liveUnclaimed ?? position?.unclaimedRewards ?? null;

  return (
    <div className="hl-card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--hl-space-6)",
          gap: "var(--hl-space-4)",
          flexWrap: "wrap",
        }}
      >
        <h2 className="hl-card-title">My position</h2>
        <span className="hl-addr-pill">{truncateAddress(address)}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "var(--hl-space-4)",
          marginBottom: "var(--hl-space-8)",
        }}
      >
        <div style={posStat}>
          <div className="hl-label" style={{ marginBottom: 12 }}>
            Staked
          </div>
          <div className="hl-mono" style={{ fontSize: 24, fontWeight: 500 }}>
            {formatToken(stakedBalance ?? position?.balance ?? 0n)}
          </div>
          <span className="hl-mono" style={{ fontSize: 12, color: "var(--hl-grey-text)" }}>
            {symbol}
          </span>
        </div>
        <div style={{ ...posStat, background: "var(--hl-gold-soft)", borderColor: "rgba(217,163,68,.35)" }}>
          <div className="hl-label" style={{ marginBottom: 12, color: "rgba(217,163,68,.75)" }}>
            Unclaimed rewards
          </div>
          <div className="hl-mono" style={{ fontSize: 24, fontWeight: 500, color: "var(--hl-gold-bright)" }}>
            {unclaimedDisplay !== null ? formatToken(unclaimedDisplay, 6) : "—"}
          </div>
          <span className="hl-mono" style={{ fontSize: 12, color: "var(--hl-grey-text)" }}>
            {symbol}
          </span>
        </div>
      </div>

      <div className="hl-tabs" role="tablist" aria-label="Staking actions">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "stake"}
          className={`hl-tab${tab === "stake" ? " active" : ""}`}
          onClick={() => setTab("stake")}
        >
          Stake
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "withdraw"}
          className={`hl-tab${tab === "withdraw" ? " active" : ""}`}
          onClick={() => setTab("withdraw")}
        >
          Withdraw
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "claim"}
          className={`hl-tab${tab === "claim" ? " active" : ""}`}
          onClick={() => setTab("claim")}
        >
          Claim
        </button>
      </div>

      <div style={{ marginTop: "var(--hl-space-6)" }}>
        {tab === "stake" && <StakePanel symbol={symbol} position={position} onDone={onRefresh} />}
        {tab === "withdraw" && <WithdrawPanel symbol={symbol} position={position} onDone={onRefresh} />}
        {tab === "claim" && (
          <ClaimPanel symbol={symbol} position={position} unclaimedDisplay={unclaimedDisplay} onDone={onRefresh} />
        )}
      </div>
    </div>
  );
}

function StakePanel({
  symbol,
  position,
  onDone,
}: {
  symbol: string;
  position: DepositDetail | null;
  onDone: () => void;
}) {
  const { address } = useWallet();
  const { status, error, totalSteps, stake, reset } = useStake();
  const { add: learnDeposit } = useLearnedDeposits();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<bigint | null>(null);

  const loadBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }
    try {
      const { token } = getReadContracts();
      const b = (await token.balanceOf(address)) as bigint;
      setBalance(b);
    } catch {
      // keep the last known balance on a transient read failure
    }
  }, [address]);

  usePolling(loadBalance, BALANCE_POLL_MS);

  const step = stakeStepInfo(status, totalSteps);
  const busy = step !== null;

  let amountError: string | null = null;
  if (amount) {
    try {
      const parsed = parseEther(amount);
      if (parsed <= 0n) amountError = "Enter an amount greater than zero.";
      else if (balance !== null && parsed > balance) amountError = "Amount exceeds your balance.";
    } catch {
      amountError = "Invalid amount.";
    }
  }
  const canSubmit = !!address && !!amount && !amountError && !busy;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const outcome = await stake(amount, position?.depositId ?? null);
    if (outcome.ok) {
      if (outcome.depositId != null && address) learnDeposit(address, outcome.depositId);
      setAmount("");
      reset();
      onDone();
      loadBalance();
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="hl-amount-box">
        <input
          inputMode="decimal"
          placeholder="0.00"
          aria-label={`Amount of ${symbol} to stake`}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value.replace(/[^0-9.]/g, ""));
            if (status !== "idle") reset();
          }}
          disabled={busy}
          autoFocus
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
          {balance !== null && (
            <span className="hl-mono" style={{ fontSize: 12, color: "var(--hl-grey-text)", whiteSpace: "nowrap" }}>
              Wallet {formatToken(balance)} {symbol}
            </span>
          )}
          <button type="button" className="hl-max-btn" onClick={() => balance !== null && setAmount(formatUnits(balance, 18))}>
            MAX
          </button>
        </div>
      </div>
      {amountError && <p style={{ color: "var(--hl-error)", fontSize: 13, marginTop: 8 }}>{amountError}</p>}

      <button type="submit" className="hl-btn hl-btn-primary" style={{ width: "100%", marginTop: "var(--hl-space-5)" }} disabled={!canSubmit}>
        {busy ? "Processing…" : position ? "Add to Stake" : "Stake " + symbol}
      </button>
      <p style={{ fontSize: 12.5, color: "var(--hl-grey-text)", textAlign: "center", marginTop: "var(--hl-space-4)" }}>
        Rewards accrue continuously and never expire.
      </p>

      {step && (
        <div className="hl-alert hl-alert-warning" style={{ marginTop: "var(--hl-space-5)" }}>
          Step {step.n}/{totalSteps}: {step.label}…
        </div>
      )}
      {status === "error" && error && (
        <div className="hl-alert hl-alert-error" style={{ marginTop: "var(--hl-space-5)" }}>
          {error}
        </div>
      )}
    </form>
  );
}

function WithdrawPanel({
  symbol,
  position,
  onDone,
}: {
  symbol: string;
  position: DepositDetail | null;
  onDone: () => void;
}) {
  const actions = useDepositActions();
  const [amount, setAmount] = useState("");
  const [claimRewards, setClaimRewards] = useState((position?.unclaimedRewards ?? 0n) > 0n);
  const max = position?.balance ?? 0n;
  const stepLabel = actionStepLabel(actions.state);

  let amountError: string | null = null;
  if (amount) {
    try {
      const parsed = parseEther(amount);
      if (parsed <= 0n) amountError = "Enter an amount greater than zero.";
      else if (parsed > max) amountError = "Amount exceeds staked balance.";
    } catch {
      amountError = "Invalid amount.";
    }
  }
  const canSubmit = !!position && !!amount && !amountError && !actions.busy;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !position) return;
    const ok = await actions.withdraw(position.depositId, parseEther(amount), claimRewards);
    if (ok) {
      setAmount("");
      onDone();
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="hl-amount-box">
        <input
          inputMode="decimal"
          placeholder="0.00"
          aria-label={`Amount of ${symbol} to withdraw`}
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          disabled={actions.busy || !position}
          autoFocus
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
          <span className="hl-mono" style={{ fontSize: 12, color: "var(--hl-grey-text)", whiteSpace: "nowrap" }}>
            Staked {formatToken(max)} {symbol}
          </span>
          <button type="button" className="hl-max-btn" onClick={() => setAmount(formatUnits(max, 18))} disabled={!position}>
            MAX
          </button>
        </div>
      </div>
      {amountError && <p style={{ color: "var(--hl-error)", fontSize: 13, marginTop: 8 }}>{amountError}</p>}

      {position && position.unclaimedRewards > 0n && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "var(--hl-space-4)", fontSize: 14, color: "var(--hl-grey-text)" }}>
          <input
            type="checkbox"
            checked={claimRewards}
            onChange={(e) => setClaimRewards(e.target.checked)}
            disabled={actions.busy}
            style={{ accentColor: "var(--hl-gold)" }}
          />
          Claim pending rewards too (separate tx)
        </label>
      )}

      <button type="submit" className="hl-btn hl-btn-primary" style={{ width: "100%", marginTop: "var(--hl-space-5)" }} disabled={!canSubmit}>
        {actions.busy ? "Processing…" : "Withdraw " + symbol}
      </button>
      <p style={{ fontSize: 12.5, color: "var(--hl-grey-text)", textAlign: "center", marginTop: "var(--hl-space-4)" }}>
        Withdrawn {symbol} is sent straight to your wallet — no lock-up.
      </p>

      {stepLabel && (
        <div className="hl-alert hl-alert-warning" style={{ marginTop: "var(--hl-space-5)" }}>
          {stepLabel}…
        </div>
      )}
      {actions.state.error && (
        <div className="hl-alert hl-alert-error" style={{ marginTop: "var(--hl-space-5)" }}>
          {actions.state.error}
        </div>
      )}
    </form>
  );
}

function ClaimPanel({
  symbol,
  position,
  unclaimedDisplay,
  onDone,
}: {
  symbol: string;
  position: DepositDetail | null;
  unclaimedDisplay: bigint | null;
  onDone: () => void;
}) {
  const actions = useDepositActions();
  const stepLabel = actionStepLabel(actions.state);
  const canClaim = !!position && !actions.busy && (position?.unclaimedRewards ?? 0n) > 0n;

  const onClaim = async () => {
    if (!position) return;
    const ok = await actions.claim(position.depositId);
    if (ok) onDone();
  };

  return (
    <div>
      <div className="hl-claim-box">
        <div className="hl-label" style={{ color: "rgba(217,163,68,.75)", marginBottom: 12 }}>
          Rewards ready to claim
        </div>
        <div className="hl-claim-amount">{unclaimedDisplay !== null ? formatToken(unclaimedDisplay, 6) : "—"}</div>
        <span className="hl-mono" style={{ fontSize: 12, color: "var(--hl-grey-text)", display: "block", marginTop: 8 }}>
          {symbol}
        </span>
      </div>

      <button className="hl-btn hl-btn-gold" style={{ width: "100%", marginTop: "var(--hl-space-5)" }} onClick={onClaim} disabled={!canClaim}>
        {actions.busy ? "Claiming…" : "Claim rewards"}
      </button>
      <p style={{ fontSize: 12.5, color: "var(--hl-grey-text)", textAlign: "center", marginTop: "var(--hl-space-4)" }}>
        Claiming sends rewards to your connected wallet. Unclaimed rewards keep accruing.
      </p>

      {stepLabel && (
        <div className="hl-alert hl-alert-warning" style={{ marginTop: "var(--hl-space-5)" }}>
          {stepLabel}…
        </div>
      )}
      {actions.state.error && (
        <div className="hl-alert hl-alert-error" style={{ marginTop: "var(--hl-space-5)" }}>
          {actions.state.error}
        </div>
      )}
    </div>
  );
}
