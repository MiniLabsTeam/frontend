"use client";

import { useWallet } from "@/hooks/useWallet";
import { useState, useEffect } from "react";
import { toast } from "sonner";

/**
 * Network Switcher Modal
 * Popup untuk switch network dari balance badge
 */
export default function NetworkModal({ isOpen, onClose, onNetworkChanged }) {
  const { embeddedWallet } = useWallet();
  const [currentChainId, setCurrentChainId] = useState(null);
  const [switching, setSwitching] = useState(false);

  // Network configurations
  const NETWORKS = {
    BASE_SEPOLIA: {
      chainId: "0x14A34", // 84532
      chainIdDecimal: 84532,
      name: "Base Sepolia",
      symbol: "ETH",
      symbolIcon: "Ξ",
      rpcUrls: ["https://sepolia.base.org"],
      blockExplorerUrls: ["https://sepolia.basescan.org"],
      nativeCurrency: {
        name: "Ethereum",
        symbol: "ETH",
        decimals: 18,
      },
    },
    BASE: {
      chainId: "0x2105", // 8453
      chainIdDecimal: 8453,
      name: "Base Mainnet",
      symbol: "ETH",
      symbolIcon: "Ξ",
      rpcUrls: ["https://mainnet.base.org"],
      blockExplorerUrls: ["https://basescan.org"],
      nativeCurrency: {
        name: "Ethereum",
        symbol: "ETH",
        decimals: 18,
      },
    },
    ETHEREUM: {
      chainId: "0x1", // 1
      chainIdDecimal: 1,
      name: "Ethereum Mainnet",
      symbol: "ETH",
      symbolIcon: "Ξ",
    },
  };

  // Detect current chain
  useEffect(() => {
    if (!embeddedWallet) return;

    const detectChain = async () => {
      try {
        const provider = await embeddedWallet.getEthereumProvider();
        const chainIdHex = await provider.request({ method: "eth_chainId" });
        setCurrentChainId(parseInt(chainIdHex, 16));
      } catch (error) {
        console.error("Failed to detect chain:", error);
      }
    };

    detectChain();
  }, [embeddedWallet]);

  const switchNetwork = async (network) => {
    if (!embeddedWallet) return;

    setSwitching(true);
    try {
      const provider = await embeddedWallet.getEthereumProvider();

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: network.chainId }],
        });
      } catch (switchError) {
        // If chain not added, add it first
        if (switchError.code === 4902 || switchError.code === -32603) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: network.chainId,
              chainName: network.name,
              nativeCurrency: network.nativeCurrency,
              rpcUrls: network.rpcUrls,
              blockExplorerUrls: network.blockExplorerUrls,
            }],
          });
        } else {
          throw switchError;
        }
      }

      setCurrentChainId(network.chainIdDecimal);

      // Notify parent to refresh balance
      if (onNetworkChanged) {
        onNetworkChanged();
      }

      // Close modal after 1 second
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error("Failed to switch network:", error);
      toast.error("Failed to switch network: " + error.message);
    } finally {
      setSwitching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-b from-gray-900 to-black border-2 border-orange-500 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-white">Select Network</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Current Network */}
        {currentChainId && (
          <div className="mb-4 p-3 bg-orange-500/20 rounded-lg border border-orange-500/50">
            <p className="text-xs text-orange-300 mb-1">Current Network:</p>
            <p className="text-white font-bold">
              {Object.values(NETWORKS).find(n => n.chainIdDecimal === currentChainId)?.name || `Chain ${currentChainId}`}
            </p>
          </div>
        )}

        {/* Network Options */}
        <div className="space-y-3">
          {Object.values(NETWORKS).map((network) => {
            const isActive = currentChainId === network.chainIdDecimal;

            return (
              <button
                key={network.chainId}
                onClick={() => !isActive && switchNetwork(network)}
                disabled={isActive || switching}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? "bg-green-500/20 border-green-500 cursor-default"
                    : "bg-gray-800/50 border-gray-700 hover:border-orange-500 hover:bg-orange-500/10"
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{network.symbolIcon}</div>
                    <div className="text-left">
                      <p className="text-white font-bold">{network.name}</p>
                      <p className="text-xs text-gray-400">{network.symbol}</p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-400 text-xs font-bold">Active</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {switching && (
          <div className="mt-4 text-center text-orange-400 text-sm font-bold animate-pulse">
            Switching network...
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <p className="text-xs text-blue-300">
            💡 Switching network will update your balance display
          </p>
        </div>
      </div>
    </div>
  );
}
