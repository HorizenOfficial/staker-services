"use client";

import { useCallback, useState } from "react";
import { parseEther } from "ethers";
import { useWallet } from "./wallet";
import { getSignedContracts } from "./contracts";
import { CONFIG } from "./config";
import { decodeStakeError } from "./errors";
import type { DepositDetail } from "./useDeposits";

export type ActionKind = "claim" | "claimAll" | "stakeMore" | "withdraw";

// A single step of a multi-tx action. Each on-chain tx is two steps: a
// wallet-confirm followed by waiting for the mined confirmation.
export interface ActionStep {
  n: number; // 1-based step index
  total: number; // total steps for this run
  label: string;
}

export interface ActionState {
  kind: ActionKind | null;
  // depositId being acted on, or "all" for claimAll
  target: bigint | "all" | null;
  step: ActionStep | null;
  error: string | null;
}

const IDLE: ActionState = { kind: null, target: null, step: null, error: null };

// "Step 1/2: …" string for display, or null when idle.
export function actionStepLabel(state: ActionState): string | null {
  if (!state.step) return null;
  const { n, total, label } = state.step;
  return `Step ${n}/${total}: ${label}`;
}

export function useDepositActions() {
  const { signer, address } = useWallet();
  const [state, setState] = useState<ActionState>(IDLE);

  const reset = useCallback(() => setState(IDLE), []);

  const require = useCallback(() => {
    if (!signer || !address) throw new Error("Connect your wallet first.");
    return getSignedContracts(signer);
  }, [signer, address]);

  const claim = useCallback(
    async (depositId: bigint): Promise<boolean> => {
      const at = (n: number, label: string): ActionState => ({
        kind: "claim",
        target: depositId,
        step: { n, total: 2, label },
        error: null,
      });
      try {
        const { staker } = require();
        setState(at(1, "Confirm the claim in your wallet"));
        const tx = await staker.claimReward(depositId);
        setState(at(2, "Waiting for the claim to confirm"));
        await tx.wait();
        setState(IDLE);
        return true;
      } catch (e) {
        setState({ kind: "claim", target: depositId, step: null, error: decodeStakeError(e) });
        return false;
      }
    },
    [require]
  );

  const claimAll = useCallback(
    async (deposits: DepositDetail[]): Promise<boolean> => {
      const claimable = deposits.filter((d) => d.unclaimedRewards > 0n);
      if (claimable.length === 0) return true;
      // Two steps per deposit: confirm + wait.
      const total = claimable.length * 2;
      try {
        const { staker } = require();
        let n = 0;
        for (let i = 0; i < claimable.length; i++) {
          const d = claimable[i];
          const pos = `claim ${i + 1}/${claimable.length}`;
          setState({
            kind: "claimAll",
            target: d.depositId,
            step: { n: ++n, total, label: `Confirm ${pos} in your wallet` },
            error: null,
          });
          const tx = await staker.claimReward(d.depositId);
          setState({
            kind: "claimAll",
            target: d.depositId,
            step: { n: ++n, total, label: `Waiting for ${pos} to confirm` },
            error: null,
          });
          await tx.wait();
        }
        setState(IDLE);
        return true;
      } catch (e) {
        setState({ kind: "claimAll", target: "all", step: null, error: decodeStakeError(e) });
        return false;
      }
    },
    [require]
  );

  const stakeMore = useCallback(
    async (depositId: bigint, amountStr: string): Promise<boolean> => {
      try {
        const { staker, token } = require();
        const amount = parseEther(amountStr);

        const allowance: bigint = await token.allowance(address!, CONFIG.zenStaker);
        const needsApproval = allowance < amount;
        const total = needsApproval ? 4 : 2;
        const at = (n: number, label: string): ActionState => ({
          kind: "stakeMore",
          target: depositId,
          step: { n, total, label },
          error: null,
        });

        if (needsApproval) {
          setState(at(1, "Approve token spending in your wallet"));
          const approveTx = await token.approve(CONFIG.zenStaker, amount);
          setState(at(2, "Waiting for the approval to confirm"));
          await approveTx.wait();
        }

        setState(at(needsApproval ? 3 : 1, "Confirm the stake in your wallet"));
        const tx = await staker.stakeMore(depositId, amount);
        setState(at(needsApproval ? 4 : 2, "Waiting for the stake to confirm"));
        await tx.wait();
        setState(IDLE);
        return true;
      } catch (e) {
        setState({ kind: "stakeMore", target: depositId, step: null, error: decodeStakeError(e) });
        return false;
      }
    },
    [require, address]
  );

  const withdraw = useCallback(
    async (
      depositId: bigint,
      amount: bigint,
      claimRewards: boolean
    ): Promise<boolean> => {
      // Withdraw is 2 steps; an optional reward claim adds 2 more.
      const total = claimRewards ? 4 : 2;
      const at = (n: number, label: string): ActionState => ({
        kind: "withdraw",
        target: depositId,
        step: { n, total, label },
        error: null,
      });
      try {
        const { staker } = require();
        // Withdraw first, then claim: a full withdraw drops the deposit's
        // earning power to 0, so a claim immediately after captures every
        // accrued reward with no residual maturing between the two txs.
        setState(at(1, "Confirm the withdrawal in your wallet"));
        const tx = await staker.withdraw(depositId, amount);
        setState(at(2, "Waiting for the withdrawal to confirm"));
        await tx.wait();
        if (claimRewards) {
          setState(at(3, "Confirm the claim in your wallet"));
          const claimTx = await staker.claimReward(depositId);
          setState(at(4, "Waiting for the claim to confirm"));
          await claimTx.wait();
        }
        setState(IDLE);
        return true;
      } catch (e) {
        setState({ kind: "withdraw", target: depositId, step: null, error: decodeStakeError(e) });
        return false;
      }
    },
    [require]
  );

  const busy = state.step !== null;

  return { state, busy, claim, claimAll, stakeMore, withdraw, reset };
}
