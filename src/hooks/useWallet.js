"use client";

import {
  useCurrentAccount,
  useConnectWallet,
  useDisconnectWallet,
  useWallets,
  useSignPersonalMessage,
} from "@onelabs/dapp-kit";
import { useCallback, useState, useEffect, useRef } from "react";
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
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [jwtToken, setJwtToken] = useState(null);
  const authInFlight = useRef(null);

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
   * Get JWT auth token via nonce → wallet sign → backend verify flow
   */
  const getAuthToken = useCallback(async () => {
    if (!walletAddress) throw new Error("Wallet not connected");

    // Return cached token if still present
    const cached = localStorage.getItem("auth_token");
    if (cached) return cached;

    // Deduplicate concurrent auth calls
    if (authInFlight.current) return authInFlight.current;

    authInFlight.current = (async () => {
      try {
        // Step 1: Get nonce from backend
        const nonceRes = await apiPost("/api/auth/nonce", { address: walletAddress });
        const { message } = nonceRes.data ?? nonceRes;

        if (!message) throw new Error("No sign message returned from backend");

        // Step 2: Sign the message with wallet
        const { signature, bytes } = await signPersonalMessage({
          message: new TextEncoder().encode(message),
        });

        // Step 3: Send signature to backend for verification
        const connectRes = await apiPost("/api/auth/connect", {
          address: walletAddress,
          signature,
          message,
        });

        const token =
          connectRes.data?.accessToken ??
          connectRes.accessToken ??
          connectRes.data?.token ??
          connectRes.token;

        if (!token) throw new Error("No token returned from backend");

        localStorage.setItem("auth_token", token);
        setJwtToken(token);
        return token;
      } catch (error) {
        console.error("Auth failed:", error);
        toast.error("Authentication failed. Please try again.");
        throw error;
      } finally {
        authInFlight.current = null;
      }
    })();

    return authInFlight.current;
  }, [walletAddress, signPersonalMessage]);

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
