"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base, baseSepolia, mainnet } from "viem/chains";
import { Toaster } from "sonner";

export default function Providers({ children }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmjxyscmx03pulf0cadbpdmvq";

  return (
    <>
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
        loginMethods: ["email", "wallet", "google", "twitter", "discord"],
        appearance: {
          theme: "light",
          accentColor: "#ff7a59",
        },
        embeddedWallets: {
          createOnLogin: "all-users", // Auto-create wallet for all users
          requireUserPasswordOnCreate: false, // No password needed
          noPromptOnSignature: true, // No popup for signing (smooth UX)
        },
        defaultChain: baseSepolia, // Default to Base Sepolia testnet
        supportedChains: [base, baseSepolia, mainnet], // Support Base mainnet, testnet, and Ethereum mainnet
        // Wallet connection behavior
        walletConnectCloudProjectId: undefined, // Disable if not using WalletConnect
      }}
    >
      {children}
    </PrivyProvider>
    </>
  );
}
