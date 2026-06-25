"use client";

import { useCallback, useState } from "react";
import { Contract, Interface, parseEther } from "ethers";
import { useWallet } from "./wallet";
import { getSignedContracts } from "./contracts";
import { CONFIG } from "./config";
import { ZEN_STAKER_ABI } from "./abi";
import { decodeStakeError } from "./errors";

export type StakeStatus =
  | "idle"
  | "approving" // approve tx
  | "staking" // stake tx submitted, awaiting confirmation
  | "success"
  | "error";

interface StakeResult {
  status: StakeStatus;
  txHash: string | null;
  depositId: bigint | null;
  error: string | null;
  // Create a new deposit, or — when existingDepositId is given — add to it via
  // stakeMore. Both paths approve the token if needed, then stake.
  stake: (amount: string, existingDepositId?: bigint | null) => Promise<void>;
  reset: () => void;
}

function parseDepositId(logs: readonly { topics: string[]; data: string }[]): bigint | null {
  const iface = new Interface(ZEN_STAKER_ABI);
  for (const log of logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "StakeDeposited") return parsed.args[1] as bigint;
    } catch {
      /* not our event */
    }
  }
  return null;
}

export function useStake(): StakeResult {
  const { signer, address } = useWallet();
  const [status, setStatus] = useState<StakeStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [depositId, setDepositId] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setDepositId(null);
    setError(null);
  }, []);

  const stake = useCallback(
    async (amountStr: string, existingDepositId?: bigint | null) => {
      if (!signer || !address) {
        setError("Connect your wallet first.");
        setStatus("error");
        return;
      }
      setError(null);
      setDepositId(null);
      setTxHash(null);

      try {
        const amount = parseEther(amountStr);
        // v1: delegation is not surfaced — delegatee & claimer default to self.
        const self = address;
        const { staker, token } = getSignedContracts(signer);

        // approve-if-needed: the ZEN token is a LayerZero OFT without EIP-2612
        // permit, so staking always goes through a standard ERC-20 approval.
        const allowance: bigint = await token.allowance(address, CONFIG.zenStaker);
        if (allowance < amount) {
          setStatus("approving");
          const approveTx = await token.approve(CONFIG.zenStaker, amount);
          await approveTx.wait();
        }

        setStatus("staking");
        // Increase an existing position via stakeMore, otherwise open a new one.
        if (existingDepositId != null) {
          const tx = await staker.stakeMore(existingDepositId, amount);
          setTxHash(tx.hash);
          await tx.wait();
          setDepositId(existingDepositId);
          setStatus("success");
          return;
        }

        const stakerWrite = staker as Contract;
        const tx = await stakerWrite["stake(uint256,address)"](amount, self);
        setTxHash(tx.hash);
        const receipt = await tx.wait();
        setDepositId(parseDepositId(receipt?.logs ?? []));
        setStatus("success");
      } catch (e) {
        setError(decodeStakeError(e));
        setStatus("error");
      }
    },
    [signer, address]
  );

  return { status, txHash, depositId, error, stake, reset };
}
