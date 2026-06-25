"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUnits, parseEther } from "ethers";
import { useWallet } from "@/lib/wallet";
import { useStake } from "@/lib/useStake";
import { useDeposits } from "@/lib/useDeposits";
import { useLearnedDeposits } from "@/lib/learnedDeposits";
import { getReadContracts } from "@/lib/contracts";
import { CONFIG } from "@/lib/config";
import { formatToken } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  approving: "Confirm the approval…",
  staking: "Confirming transaction…",
};

// The stake form, chrome-free so it can live inside a dialog. Handles
// create-or-increase (single-position); staking always uses approve + stake.
export function StakeForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const { address, isCorrectChain } = useWallet();
  const { status, error, depositId, stake, reset } = useStake();
  const { add: learnDeposit } = useLearnedDeposits();

  const active = address && isCorrectChain ? address : null;
  const { deposits } = useDeposits(active);
  const existing = CONFIG.singlePosition && deposits.length > 0 ? deposits[0] : null;
  const isIncrease = !!existing;

  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<bigint | null>(null);
  const [symbol, setSymbol] = useState("ZEN");

  const loadBalance = useCallback(async () => {
    if (!address) return;
    try {
      const { token } = getReadContracts();
      const [bal, sym] = await Promise.all([token.balanceOf(address), token.symbol()]);
      setBalance(bal as bigint);
      setSymbol(sym as string);
    } catch {
      /* ignore */
    }
  }, [address]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    if (status === "success") {
      if (depositId != null && address) learnDeposit(address, depositId);
      onSuccess?.();
    }
  }, [status, depositId, address, learnDeposit, onSuccess]);

  const busy = status === "approving" || status === "staking";

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
  const canSubmit = !!active && !!amount && !amountError && !busy;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) stake(amount, existing?.depositId ?? null);
  };

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--hl-space-2)" }}>
        <label className="hl-label" htmlFor="stake-amount">Amount</label>
        {balance !== null && (
          <button
            type="button"
            className="hl-label"
            style={{ background: "none", border: 0, cursor: "pointer", color: "var(--hl-navy)", textDecoration: "underline" }}
            onClick={() => setAmount(formatUnits(balance, 18))}
          >
            Balance: {formatToken(balance)} {symbol} · Max
          </button>
        )}
      </div>

      <input
        id="stake-amount"
        className="hl-input"
        inputMode="decimal"
        placeholder="0.0"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value.replace(/[^0-9.]/g, ""));
          if (status !== "idle") reset();
        }}
        disabled={busy}
        autoFocus
      />
      {amountError && <p style={{ color: "var(--hl-error)", fontSize: 13, marginTop: 8 }}>{amountError}</p>}

      <div style={{ display: "flex", gap: "var(--hl-space-4)", marginTop: "var(--hl-space-8)" }}>
        {onCancel && (
          <button type="button" className="hl-btn hl-btn-ghost" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="submit" className="hl-btn hl-btn-primary" style={{ flex: 1 }} disabled={!canSubmit}>
          {busy ? "Processing…" : isIncrease ? "Add to Stake" : "Stake"}
        </button>
      </div>

      {busy && (
        <div className="hl-alert hl-alert-warning" style={{ marginTop: "var(--hl-space-5)" }}>
          {STATUS_LABEL[status]}
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
