"use client";

import { useCurrentAccount, useDisconnectWallet } from "@onelabs/dapp-kit";
import { useEffect, useState } from "react";

// OneChain Testnet chain identifier used by @onelabs/dapp-kit
const REQUIRED_CHAIN = "onechain:testnet";

/**
 * NetworkGuard — shows a blocking overlay when a connected wallet is
 * NOT on OneChain Testnet. The user must switch their wallet network
 * or disconnect before they can interact with the app.
 */
export default function NetworkGuard() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    if (!account) {
      setWrongNetwork(false);
      return;
    }

    // account.chains is an array like ["onechain:testnet"]
    // If chains is empty or undefined, fall back to allowing (wallet may not report chains)
    const chains = account.chains ?? [];
    if (chains.length === 0) {
      setWrongNetwork(false);
      return;
    }

    const onCorrectChain = chains.some(
      (c) => c === REQUIRED_CHAIN || c.toLowerCase().includes("onechain") && c.toLowerCase().includes("testnet")
    );
    setWrongNetwork(!onCorrectChain);
  }, [account]);

  if (!wrongNetwork) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1a0a00 0%, #0f0800 100%)",
          border: "2px solid #f97316",
          borderRadius: "1.25rem",
          padding: "2rem 1.5rem",
          maxWidth: 360,
          width: "90%",
          boxShadow: "0 0 40px rgba(249,115,22,0.3)",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f97316, #dc2626)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
            fontSize: "2rem",
          }}
        >
          ⛓️
        </div>

        {/* Title */}
        <h2
          style={{
            color: "#fff",
            fontWeight: 900,
            fontSize: "1.25rem",
            marginBottom: "0.5rem",
            letterSpacing: "-0.01em",
          }}
        >
          Wrong Network
        </h2>

        {/* Subtitle */}
        <p style={{ color: "#fb923c", fontWeight: 700, fontSize: "0.9rem", marginBottom: "1rem" }}>
          OneChain Testnet Required
        </p>

        <p style={{ color: "#94a3b8", fontSize: "0.8rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Your wallet is connected to a different network. Please switch to{" "}
          <span style={{ color: "#f97316", fontWeight: 700 }}>OneChain Testnet</span> in your
          wallet app to continue.
        </p>

        {/* Network info card */}
        <div
          style={{
            background: "rgba(249,115,22,0.1)",
            border: "1px solid rgba(249,115,22,0.3)",
            borderRadius: "0.75rem",
            padding: "0.875rem",
            marginBottom: "1.5rem",
            textAlign: "left",
          }}
        >
          <p style={{ color: "#fb923c", fontWeight: 700, fontSize: "0.75rem", marginBottom: "0.5rem" }}>
            Network Details
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {[
              ["Network", "OneChain Testnet"],
              ["RPC", "rpc-testnet.onelabs.cc"],
              ["Explorer", "explorer.testnet.onelabs.cc"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b", fontSize: "0.7rem" }}>{label}</span>
                <span style={{ color: "#e2e8f0", fontSize: "0.7rem", fontFamily: "monospace" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div style={{ textAlign: "left", marginBottom: "1.5rem" }}>
          <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: "0.5rem", fontWeight: 700 }}>
            How to switch:
          </p>
          {[
            "Open your OneChain wallet",
            'Go to Settings → Network',
            'Select "OneChain Testnet"',
            "Return here — page will update automatically",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.35rem" }}>
              <span
                style={{
                  background: "#f97316",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.65rem",
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem", lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>

        {/* Disconnect button */}
        <button
          onClick={() => {
            localStorage.removeItem("auth_token");
            disconnect();
          }}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: "1.5px solid #374151",
            background: "transparent",
            color: "#9ca3af",
            fontWeight: 700,
            fontSize: "0.8rem",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#ef4444";
            e.currentTarget.style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#374151";
            e.currentTarget.style.color = "#9ca3af";
          }}
        >
          Disconnect Wallet
        </button>
      </div>
    </div>
  );
}
