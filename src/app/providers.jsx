"use client";

import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@onelabs/dapp-kit";
import "@onelabs/dapp-kit/dist/index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import GlobalLoadingIndicator from "@/components/shared/GlobalLoadingIndicator";
import NetworkGuard from "@/components/shared/NetworkGuard";

// Force OneChain Testnet only — no mainnet option exposed
const { networkConfig } = createNetworkConfig({
  testnet: { url: "https://rpc-testnet.onelabs.cc" },
});

const queryClient = new QueryClient();

export default function Providers({ children }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
          <WalletProvider autoConnect>
            <NetworkGuard />
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
            {children}
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
