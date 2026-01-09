"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import NetworkModal from "@/components/shared/NetworkModal";

export default function ProfilePage() {
  const { authenticated, ready, user, logout } = usePrivy();
  const { isConnected, walletAddress, getBalance, currencySymbol, chainId } = useWallet();
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Fetch balance when wallet is connected
  useEffect(() => {
    if (isConnected) {
      fetchBalance();
    }
  }, [isConnected]);

  const fetchBalance = async () => {
    try {
      setLoadingBalance(true);
      const bal = await getBalance();
      setBalance(bal);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!ready || !authenticated) {
    return null;
  }

  // Get user info
  const userEmail = user?.email?.address || "";
  const userName = user?.twitter?.username || user?.discord?.username || "Hot Wheels Racer";

  // Shorten wallet address for display
  const shortAddress = isConnected && walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : authenticated
    ? "Creating wallet..."
    : "Not connected";

  const menuItems = [
    {
      id: "address",
      icon: "📍",
      title: "Wallet Address",
      subtitle: shortAddress,
      onClick: () => {
        if (isConnected && walletAddress) {
          navigator.clipboard.writeText(walletAddress);
          alert("Wallet address copied to clipboard!");
        } else {
          alert("Wallet not connected yet. Please wait a moment.");
        }
      }
    },
    {
      id: "help",
      icon: "💬",
      title: "Bantuan",
      subtitle: "customer services",
      onClick: () => alert("Customer service coming soon!")
    },
    {
      id: "info",
      icon: "ℹ️",
      title: "Informasi",
      subtitle: "redeem voucher",
      onClick: () => alert("Redeem voucher coming soon!")
    },
    {
      id: "terms",
      icon: "📄",
      title: "Syarat dan ketentuan",
      subtitle: "",
      onClick: () => alert("Terms and conditions coming soon!")
    },
    {
      id: "privacy",
      icon: "🔒",
      title: "Kebijakan Privasi",
      subtitle: "",
      onClick: () => alert("Privacy policy coming soon!")
    },
  ];

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-white overflow-hidden">
      {/* Checkered Pattern Background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px),
            repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px)
          `
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto">
        {/* Header */}
        <header className="px-6 pt-4 pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/assets/icons/logo2.png"
              alt="Hot Wheels"
              className="h-16 object-contain drop-shadow-2xl"
            />
          </div>

          {/* User Info Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-3xl">
                  🏎️
                </div>
                <div>
                  <h2 className="text-xl font-black">{userName}</h2>
                  {userEmail && (
                    <p className="text-xs text-white/80">{userEmail}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Balance Display - Click to switch network */}
            <div
              onClick={() => setShowNetworkModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full px-4 py-2 w-fit cursor-pointer hover:scale-105 transition-transform group"
              title="Click to switch network"
            >
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-orange-900 font-black text-sm">
                {currencySymbol === "MATIC" ? "⬡" : "Ξ"}
              </div>
              <span className="font-black text-lg">
                {loadingBalance ? "..." : balance.toFixed(4)}
              </span>
              <span className="text-sm font-bold opacity-90">{currencySymbol}</span>
              {/* Network indicator */}
              {chainId && (
                <div className="ml-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Menu Items */}
        <div className="flex-1 px-6 space-y-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="w-full bg-orange-500/50 hover:bg-orange-500/70 backdrop-blur-sm rounded-xl p-4 transition-all transform hover:scale-[1.02] active:scale-95"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3 text-left">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className="font-bold text-white">{item.title}</h3>
                    {item.subtitle && (
                      <p className="text-sm text-white/80">{item.subtitle}</p>
                    )}
                  </div>
                </div>
                <span className="text-2xl text-white">›</span>
              </div>
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <div className="px-6 py-6">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-lg py-4 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200 uppercase"
          >
            Log Out
          </button>
        </div>

        {/* Bottom Car Image */}
        <div className="relative h-48 overflow-hidden mb-20">
          <img
            src="/assets/car/High Speed.png"
            alt="Car"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm object-contain drop-shadow-2xl"
            style={{ transform: 'translateX(-50%) rotate(-5deg)' }}
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Network Switcher Modal */}
      <NetworkModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        onNetworkChanged={() => {
          fetchBalance();
        }}
      />
    </main>
  );
}
