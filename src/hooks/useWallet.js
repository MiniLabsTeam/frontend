"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useState, useRef } from "react";

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

    console.log("🔍 Checking wallets...", {
      walletsCount: wallets.length,
      wallets: wallets.map(w => ({
        type: w.walletClientType,
        address: w.address?.slice(0, 10) + "..."
      }))
    });

    // PRIORITAS 1: Cari embedded wallet Privy (untuk user login email/social)
    const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === "privy");

    if (embeddedWallet) {
      // User login dengan email/social - pakai embedded wallet
      console.log("✅ Found Privy embedded wallet:", embeddedWallet.address);
      setEmbeddedWallet(embeddedWallet);
      setWalletAddress(embeddedWallet.address);
      setWalletError(null);
      createWalletAttempted.current = false;
      return;
    }

    // PRIORITAS 2: Cek apakah user punya linked wallet (bukan embedded)
    // Hanya pakai external wallet (MetaMask, etc) kalau user TIDAK punya embedded wallet
    const externalWallets = wallets.filter((w) =>
      w.walletClientType !== "privy"
    );

    if (externalWallets.length > 0) {
      // User connect dengan MetaMask atau wallet lain
      console.log("✅ Using external wallet:", externalWallets[0].walletClientType, externalWallets[0].address);
      setEmbeddedWallet(externalWallets[0]);
      setWalletAddress(externalWallets[0].address);
      setWalletError(null);
      createWalletAttempted.current = false;
      return;
    }

    // No wallet found - wait 5 seconds then try to create one manually
    if (!createWalletAttempted.current && wallets.length === 0) {
      console.log("⏳ No wallet found yet. Waiting 5 seconds before attempting to create...");

      walletCheckTimeout.current = setTimeout(async () => {
        // Double check wallet still doesn't exist
        if (wallets.length === 0 && !createWalletAttempted.current) {
          createWalletAttempted.current = true;
          console.log("🔨 Calling createWallet()...");

          try {
            setIsConnecting(true);
            await createWallet();
            console.log("✅ Wallet creation triggered successfully!");
          } catch (error) {
            // Only log as error if it's NOT the expected "already has wallet" case
            if (!error.message?.includes("already has an embedded wallet")) {
              console.error("❌ Failed to create wallet:", error);
            }

            // Handle case where wallet already exists but hasn't appeared yet
            if (error.message?.includes("already has an embedded wallet")) {
              console.log("ℹ️ User already has an embedded wallet. Waiting for it to appear...");
              setWalletError(null); // Don't show error to user

              // Reset flag so we can check again
              createWalletAttempted.current = false;

              // The wallet should appear in the wallets array soon
              // The useEffect will re-run when wallets array updates
            } else {
              setWalletError(error.message || "Failed to create wallet");

              // Show user-friendly error for other cases
              if (error.message?.includes("not enabled")) {
                console.error("🚨 ERROR: Embedded wallets not enabled in Privy Dashboard!");
                console.error("👉 Go to: https://dashboard.privy.io");
                console.error("👉 Enable 'Embedded wallets' in Settings");
              }
            }
          } finally {
            setIsConnecting(false);
          }
        }
      }, 5000); // Wait 5 seconds
    }
  }, [ready, authenticated, wallets]); // REMOVED createWallet from dependencies

  // Detect chain and update currency symbol
  useEffect(() => {
    if (!embeddedWallet) return;

    const detectChainAndSymbol = async () => {
      try {
        const provider = await embeddedWallet.getEthereumProvider();
        const chainIdHex = await provider.request({ method: "eth_chainId" });
        const currentChainId = parseInt(chainIdHex, 16);

        setChainId(currentChainId);

        // Set currency symbol based on chain
        const CHAIN_SYMBOLS = {
          1: "ETH",      // Ethereum Mainnet
          8453: "ETH",   // Base Mainnet
          84532: "ETH",  // Base Sepolia
          137: "MATIC",  // Polygon
          80001: "MATIC", // Mumbai
          // Add more chains as needed
        };

        setCurrencySymbol(CHAIN_SYMBOLS[currentChainId] || "ETH");
      } catch (error) {
        console.error("Failed to detect chain:", error);
      }
    };

    detectChainAndSymbol();
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

      // Request balance using eth_getBalance
      const balanceHex = await provider.request({
        method: "eth_getBalance",
        params: [walletAddress, "latest"],
      });

      // Convert from hex wei to ETH (decimal)
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
    isConnected: !!walletAddress && authenticated,
    isConnecting,
    walletAddress,
    embeddedWallet,
    user,
    chainId,
    currencySymbol,
    walletError,

    // Utils
    getWalletClient,
    switchChain,
    getAuthToken,
    getBalance,
  };
}
