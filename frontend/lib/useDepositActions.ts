"use client";

import { useCallback, useState } from "react";
import { parseEther } from "ethers";
import { useWallet } from "./wallet";
import { getSignedContracts } from "./contracts";
import { CONFIG } from "./config";
import { decodeStakeError } from "./errors";
import type { DepositDetail } from "./useDeposits";

export type ActionKind = "claim" | "claimAll" | "stakeMore" | "withdraw";
export type ActionPhase = "approving" | "claiming" | "pending";

export interface ActionState {
  kind: ActionKind | null;
  // depositId being acted on, or "all" for claimAll
  target: bigint | "all" | null;
  phase: ActionPhase | null;
  error: string | null;
}

const IDLE: ActionState = { kind: null, target: null, phase: null, error: null };

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
      try {
        const { staker } = require();
        setState({ kind: "claim", target: depositId, phase: "pending", error: null });
        const tx = await staker.claimReward(depositId);
        await tx.wait();
        setState(IDLE);
        return true;
      } catch (e) {
        setState({ kind: "claim", target: depositId, phase: null, error: decodeStakeError(e) });
        return false;
      }
    },
    [require]
  );

  const claimAll = useCallback(
    async (deposits: DepositDetail[]): Promise<boolean> => {
      const claimable = deposits.filter((d) => d.unclaimedRewards > 0n);
      if (claimable.length === 0) return true;
      try {
        const { staker } = require();
        for (const d of claimable) {
          setState({ kind: "claimAll", target: d.depositId, phase: "claiming", error: null });
          const tx = await staker.claimReward(d.depositId);
          await tx.wait();
        }
        setState(IDLE);
        return true;
      } catch (e) {
        setState({ kind: "claimAll", target: "all", phase: null, error: decodeStakeError(e) });
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
        if (allowance < amount) {
          setState({ kind: "stakeMore", target: depositId, phase: "approving", error: null });
          const approveTx = await token.approve(CONFIG.zenStaker, amount);
          await approveTx.wait();
        }

        setState({ kind: "stakeMore", target: depositId, phase: "pending", error: null });
        const tx = await staker.stakeMore(depositId, amount);
        await tx.wait();
        setState(IDLE);
        return true;
      } catch (e) {
        setState({ kind: "stakeMore", target: depositId, phase: null, error: decodeStakeError(e) });
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
      try {
        const { staker } = require();
        // Withdraw first, then claim: a full withdraw drops the deposit's
        // earning power to 0, so a claim immediately after captures every
        // accrued reward with no residual maturing between the two txs.
        setState({ kind: "withdraw", target: depositId, phase: "pending", error: null });
        const tx = await staker.withdraw(depositId, amount);
        await tx.wait();
        if (claimRewards) {
          setState({ kind: "withdraw", target: depositId, phase: "claiming", error: null });
          const claimTx = await staker.claimReward(depositId);
          await claimTx.wait();
        }
        setState(IDLE);
        return true;
      } catch (e) {
        setState({ kind: "withdraw", target: depositId, phase: null, error: decodeStakeError(e) });
        return false;
      }
    },
    [require]
  );

  const busy = state.phase !== null;

  return { state, busy, claim, claimAll, stakeMore, withdraw, reset };
}
