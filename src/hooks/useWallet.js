"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useState, useRef } from "react";
import { CHAIN_SYMBOLS, WALLET_CHECK_DELAY } from "@/constants";
import { toast } from "sonner";

/**
 * Custom hook for managing wallet connection with Privy
 * @returns {Object} Wallet connection state and utilities
 */
export function useWallet() {
  const { ready, authenticated, user, getAccessToken, createWallet } = usePrivy();
  const { wallets } = useWallets();
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [embeddedWallet, setEmbeddedWallet] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState("ETH");
  const [walletError, setWalletError] = useState(null);
  const [walletDisconnected, setWalletDisconnected] = useState(false);
  const createWalletAttempted = useRef(false);
  const walletCheckTimeout = useRef(null);

  useEffect(() => {
    if (!ready || !authenticated) {
      setWalletAddress(null);
      setEmbeddedWallet(null);
      setWalletError(null);
      createWalletAttempted.current = false;
      if (walletCheckTimeout.current) {
        clearTimeout(walletCheckTimeout.current);
      }
      return;
    }

    const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === "privy");

    if (embeddedWallet) {
      setEmbeddedWallet(embeddedWallet);
      setWalletAddress(embeddedWallet.address);
      setWalletError(null);
      createWalletAttempted.current = false;
      return;
    }

    const externalWallets = wallets.filter((w) =>
      w.walletClientType !== "privy"
    );

    if (externalWallets.length > 0) {
      setEmbeddedWallet(externalWallets[0]);
      setWalletAddress(externalWallets[0].address);
      setWalletError(null);
      createWalletAttempted.current = false;
      return;
    }

    // No wallet found - wait 5 seconds then try to create one manually
    if (!createWalletAttempted.current && wallets.length === 0) {

      walletCheckTimeout.current = setTimeout(async () => {
        if (wallets.length === 0 && !createWalletAttempted.current) {
          createWalletAttempted.current = true;
          toast.loading("Creating your wallet...", { id: "wallet-creation" });

          try {
            setIsConnecting(true);
            await createWallet();
            toast.success("Wallet created successfully!", { id: "wallet-creation" });
          } catch (error) {
            if (error.message?.includes("already has an embedded wallet")) {
              toast.dismiss("wallet-creation");
              setWalletError(null);
              createWalletAttempted.current = false;
            } else {
              console.error("Failed to create wallet:", error);
              toast.error("Failed to create wallet. Please try again.", { id: "wallet-creation" });
              setWalletError(error.message || "Failed to create wallet");
            }
          } finally {
            setIsConnecting(false);
          }
        }
      }, WALLET_CHECK_DELAY);
    }
  }, [ready, authenticated, wallets]);

  useEffect(() => {
    if (!embeddedWallet) return;

    const detectChainAndSymbol = async () => {
      try {
        const provider = await embeddedWallet.getEthereumProvider();
        const chainIdHex = await provider.request({ method: "eth_chainId" });
        const currentChainId = parseInt(chainIdHex, 16);

        setChainId(currentChainId);
        setCurrencySymbol(CHAIN_SYMBOLS[currentChainId] || "ETH");
      } catch (error) {
        console.error("Failed to detect chain:", error);
      }
    };

    detectChainAndSymbol();

    // Monitor for wallet disconnection
    const handleAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        console.warn("Wallet disconnected");
        setWalletDisconnected(true);
        setWalletAddress(null);
        toast.error("Wallet disconnected. Please reconnect to continue.");
      } else {
        setWalletDisconnected(false);
        setWalletAddress(accounts[0]);
      }
    };

    const handleDisconnect = () => {
      console.warn("Wallet provider disconnected");
      setWalletDisconnected(true);
      setWalletAddress(null);
      toast.error("Wallet connection lost. Please refresh the page.");
    };

    // Set up listeners for wallet events
    const setupListeners = async () => {
      try {
        const provider = await embeddedWallet.getEthereumProvider();

        if (provider.on) {
          provider.on("accountsChanged", handleAccountsChanged);
          provider.on("disconnect", handleDisconnect);
        }
      } catch (error) {
        console.error("Failed to setup wallet listeners:", error);
      }
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      const cleanup = async () => {
        try {
          const provider = await embeddedWallet.getEthereumProvider();

          if (provider.removeListener) {
            provider.removeListener("accountsChanged", handleAccountsChanged);
            provider.removeListener("disconnect", handleDisconnect);
          }
        } catch (error) {
          console.error("Failed to cleanup wallet listeners:", error);
        }
      };

      cleanup();
    };
  }, [embeddedWallet]);

  /**
   * Get wallet client for signing transactions
   */
  const getWalletClient = async () => {
    if (!embeddedWallet) {
      throw new Error("No wallet connected");
    }
    return await embeddedWallet.getEthereumProvider();
  };

  /**
   * Switch to a specific chain
   */
  const switchChain = async (chainId) => {
    if (!embeddedWallet) {
      throw new Error("No wallet connected");
    }
    try {
      await embeddedWallet.switchChain(chainId);
    } catch (error) {
      console.error("Failed to switch chain:", error);
      throw error;
    }
  };

  /**
   * Get Privy auth token for backend API calls
   */
  const getAuthToken = async () => {
    if (!authenticated) {
      throw new Error("Not authenticated");
    }
    return await getAccessToken();
  };

  /**
   * Get ETH balance from current chain
   */
  const getBalance = async () => {
    if (!embeddedWallet || !walletAddress) {
      throw new Error("No wallet connected");
    }

    try {
      const provider = await embeddedWallet.getEthereumProvider();

      const balanceHex = await provider.request({
        method: "eth_getBalance",
        params: [walletAddress, "latest"],
      });

      const balanceWei = BigInt(balanceHex);
      const balanceEth = Number(balanceWei) / 1e18;

      return balanceEth;
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      return 0;
    }
  };

  return {
    // States
    ready,
    authenticated,
    isConnected: !!walletAddress && authenticated && !walletDisconnected,
    isConnecting,
    walletAddress,
    embeddedWallet,
    user,
    chainId,
    currencySymbol,
    walletError,
    walletDisconnected,

    // Utils
    getWalletClient,
    switchChain,
    getAuthToken,
    getBalance,
  };
}
