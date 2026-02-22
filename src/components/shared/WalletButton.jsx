"use client";

import { useWallets, useConnectWallet, useCurrentAccount, useDisconnectWallet } from "@onelabs/dapp-kit";
import { Wallet, LogOut, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * Reusable wallet connect/disconnect button
 * Shows wallet selector modal or connected address
 */
export default function WalletButton({ className = "" }) {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connect, isPending: isConnecting } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletList, setShowWalletList] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format address for display
  const shortAddress = account
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : null;

  // Handle disconnect
  const handleDisconnect = () => {
    localStorage.removeItem("auth_token");
    disconnect();
    setShowDropdown(false);
  };

  // Prevent hydration mismatch: SSR has no wallet info
  if (!mounted) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 bg-gray-700 border-2 border-gray-600 rounded-full px-3 py-1.5 opacity-60 ${className}`}
      >
        <Wallet size={14} className="text-gray-400" />
        <span className="text-gray-400 text-xs font-bold">Loading...</span>
      </button>
    );
  }

  // Connected state
  if (account) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 border-2 border-emerald-400 rounded-full px-3 py-1.5 transition-all ${className}`}
        >
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white text-xs font-bold">{shortAddress}</span>
          <ChevronDown size={12} className="text-white" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-10 bg-gray-900 border border-gray-700 rounded-2xl shadow-xl z-50 min-w-[160px] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-gray-400 text-xs">Connected</p>
              <p className="text-white text-xs font-mono font-bold">{shortAddress}</p>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-gray-800 text-sm font-bold transition-colors"
            >
              <LogOut size={14} />
              Disconnect
            </button>
          </div>
        )}

        {/* Click outside to close */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>
    );
  }

  // Disconnected state - show wallet list or single connect button
  if (wallets.length === 0) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 bg-gray-700 border-2 border-gray-600 rounded-full px-3 py-1.5 opacity-60 ${className}`}
      >
        <Wallet size={14} className="text-gray-400" />
        <span className="text-gray-400 text-xs font-bold">No Wallet</span>
      </button>
    );
  }

  // Single wallet - connect directly
  if (wallets.length === 1) {
    return (
      <button
        onClick={() => connect({ wallet: wallets[0] })}
        disabled={isConnecting}
        className={`flex items-center gap-2 bg-orange-500 hover:bg-orange-600 border-2 border-orange-400 rounded-full px-3 py-1.5 transition-all ${className}`}
      >
        <Wallet size={14} className="text-white" strokeWidth={2.5} />
        <span className="text-white text-xs font-bold">
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </span>
      </button>
    );
  }

  // Multiple wallets - show dropdown selector
  return (
    <div className="relative">
      <button
        onClick={() => setShowWalletList(!showWalletList)}
        disabled={isConnecting}
        className={`flex items-center gap-2 bg-orange-500 hover:bg-orange-600 border-2 border-orange-400 rounded-full px-3 py-1.5 transition-all ${className}`}
      >
        <Wallet size={14} className="text-white" strokeWidth={2.5} />
        <span className="text-white text-xs font-bold">
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </span>
        <ChevronDown size={12} className="text-white" />
      </button>

      {showWalletList && (
        <div className="absolute right-0 top-10 bg-gray-900 border border-gray-700 rounded-2xl shadow-xl z-50 min-w-[200px] overflow-hidden">
          <p className="px-4 py-2 text-gray-400 text-xs border-b border-gray-700">
            Select Wallet
          </p>
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => {
                connect({ wallet });
                setShowWalletList(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors"
            >
              {wallet.icon && (
                <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 rounded" />
              )}
              <span className="text-white text-sm font-bold">{wallet.name}</span>
            </button>
          ))}
        </div>
      )}

      {showWalletList && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowWalletList(false)}
        />
      )}
    </div>
  );
}
