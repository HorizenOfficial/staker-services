"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { connectWallet } from "./contracts";
import { CONFIG } from "./config";
import { fetchTokenSymbol } from "./tokenSymbol";

interface WalletState {
  address: string | null;
  chainId: number | null;
  signer: JsonRpcSigner | null;
  connecting: boolean;
  error: string | null;
  isCorrectChain: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchChain: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []);
    if (accounts.length === 0) {
      setAddress(null);
      setSigner(null);
      return;
    }
    const net = await provider.getNetwork();
    const s = await provider.getSigner();
    setChainId(Number(net.chainId));
    setAddress(await s.getAddress());
    setSigner(s);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const s = await connectWallet();
      const net = await s.provider.getNetwork();
      setSigner(s);
      setAddress(await s.getAddress());
      setChainId(Number(net.chainId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    // Revoke the eth_accounts permission so the eager reconnect on next load
    // won't pick the account back up. Not all wallets support this — fall back
    // to just clearing local state.
    try {
      await window.ethereum?.request?.({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      /* unsupported — local state clear below is the fallback */
    }
    setAddress(null);
    setSigner(null);
  }, []);

  const switchChain = useCallback(async () => {
    if (!window.ethereum) return;
    const hexId = "0x" + CONFIG.chainId.toString(16);
    try {
      await window.ethereum.request?.({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexId }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to switch network.");
    }
  }, []);

  // Single startup RPC for the token symbol; cached for the process lifetime.
  useEffect(() => {
    fetchTokenSymbol();
  }, []);

  useEffect(() => {
    refresh();
    const eth = window.ethereum as unknown as {
      on?: (e: string, cb: (...a: unknown[]) => void) => void;
      removeListener?: (e: string, cb: (...a: unknown[]) => void) => void;
    };
    if (!eth?.on) return;
    const onAccounts = () => refresh();
    const onChain = () => refresh();
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [refresh]);

  const value = useMemo<WalletState>(
    () => ({
      address,
      chainId,
      signer,
      connecting,
      error,
      isCorrectChain: chainId === CONFIG.chainId,
      connect,
      disconnect,
      switchChain,
    }),
    [address, chainId, signer, connecting, error, connect, disconnect, switchChain]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
