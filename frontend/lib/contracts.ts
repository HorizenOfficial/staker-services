import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  JsonRpcSigner,
} from "ethers";
import { CONFIG } from "./config";
import { ZEN_STAKER_ABI, ZEN_TOKEN_ABI } from "./abi";

// Read-only provider for view calls (no wallet required).
export function getReadProvider(): JsonRpcProvider {
  return new JsonRpcProvider(CONFIG.rpc);
}

export function getReadContracts() {
  const provider = getReadProvider();
  return {
    staker: new Contract(CONFIG.contractStaker, ZEN_STAKER_ABI, provider),
    token: new Contract(CONFIG.contractToken, ZEN_TOKEN_ABI, provider),
  };
}

declare global {
  interface Window {
    ethereum?: import("ethers").Eip1193Provider;
  }
}

// Connect MetaMask (or any EIP-1193 provider) and return a signer.
export async function connectWallet(): Promise<JsonRpcSigner> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No EIP-1193 wallet found. Please install MetaMask.");
  }
  const browserProvider = new BrowserProvider(window.ethereum);
  await browserProvider.send("eth_requestAccounts", []);
  return browserProvider.getSigner();
}

export function getSignedContracts(signer: JsonRpcSigner) {
  return {
    staker: new Contract(CONFIG.contractStaker, ZEN_STAKER_ABI, signer),
    token: new Contract(CONFIG.contractToken, ZEN_TOKEN_ABI, signer),
  };
}
