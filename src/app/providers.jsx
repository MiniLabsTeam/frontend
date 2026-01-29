"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base, baseSepolia, mainnet } from "viem/chains";
import { Toaster } from "sonner";
import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import GlobalLoadingIndicator from "@/components/shared/GlobalLoadingIndicator";

// Suppress React warning for isActive prop from Privy's styled-components
// This is a known issue in @privy-io/react-auth library
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.("isActive")) return;
    originalError.apply(console, args);
  };
}

export default function Providers({ children }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmjxyscmx03pulf0cadbpdmvq";

  // Initialize MiniApp SDK
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <ErrorBoundary>
      <GlobalLoadingIndicator />
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            background: "linear-gradient(to bottom, #1f1f1f, #0a0a0a)",
            border: "1px solid #f97316",
            color: "#fff",
          },
        }}
      />
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ["email", "wallet", "farcaster"],
          appearance: {
            theme: "light",
            accentColor: "#ff7a59",
          },
          embeddedWallets: {
            createOnLogin: "users-without-wallets", // Only ensure wallet exists if user doesn't have one
            requireUserPasswordOnCreate: false, // No password needed
            noPromptOnSignature: true, // No popup for signing (smooth UX)
          },
          defaultChain: baseSepolia, // Base Sepolia testnet
          supportedChains: [base, baseSepolia, mainnet], // Support Base mainnet, testnet, and Ethereum
        }}
      >
        {children}
      </PrivyProvider>
    </ErrorBoundary>
  );
}
