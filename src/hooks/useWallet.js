"use client";

import {
  useCurrentAccount,
  useConnectWallet,
  useDisconnectWallet,
  useWallets,
} from "@onelabs/dapp-kit";
import { useCallback, useState, useEffect } from "react";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";

/**
 * Custom hook for managing wallet connection with @onelabs/dapp-kit
 * @returns {Object} Wallet connection state and utilities
 */
export function useWallet() {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connectWallet, isPending: isConnecting } = useConnectWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const [jwtToken, setJwtToken] = useState(null);

  const isConnected = !!account;
  const walletAddress = account?.address ?? null;

  // Load JWT from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("auth_token");
    if (stored) setJwtToken(stored);
  }, []);

  // Clear JWT when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      localStorage.removeItem("auth_token");
      setJwtToken(null);
    }
  }, [isConnected]);

  /**
   * Get JWT auth token - uses test-login for development
   * (signature verification is a placeholder in backend, test-login avoids nonce race conditions)
   */
  const getAuthToken = useCallback(async () => {
    if (!walletAddress) throw new Error("Wallet not connected");

    // Return cached token if still present
    const cached = localStorage.getItem("auth_token");
    if (cached) return cached;

    try {
      // Use test-login: skips nonce+signature flow (dev only)
      // Backend: POST /api/auth/test-login → { success, data: { accessToken } }
      const res = await apiPost("/api/auth/test-login", { address: walletAddress });
      const token = res.data?.accessToken ?? res.accessToken ?? res.token;

      if (!token) throw new Error("No token returned from backend");

      localStorage.setItem("auth_token", token);
      setJwtToken(token);
      return token;
    } catch (error) {
      console.error("Auth failed:", error);
      toast.error("Authentication failed. Please try again.");
      throw error;
    }
  }, [walletAddress]);

  /**
   * Connect to first available wallet
   */
  const connect = useCallback(() => {
    const wallet = wallets[0];
    if (!wallet) {
      toast.error("No OneChain wallet found. Please install a wallet.");
      return;
    }
    connectWallet({ wallet, chain: "onechain:testnet" });
  }, [wallets, connectWallet]);

  /**
   * Disconnect wallet and clear auth
   */
  const disconnect = useCallback(() => {
    localStorage.removeItem("auth_token");
    setJwtToken(null);
    disconnectWallet();
  }, [disconnectWallet]);

  return {
    // States
    isConnected,
    isConnecting,
    walletAddress,
    account,
    wallets,
    jwtToken,

    // Actions
    connect,
    disconnect,
    connectWallet,    // raw connect with specific wallet
    disconnectWallet, // raw disconnect
    getAuthToken,
  };
}
