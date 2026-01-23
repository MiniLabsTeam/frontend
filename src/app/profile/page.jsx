"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import NetworkModal from "@/components/shared/NetworkModal";

export default function ProfilePage() {
  const { authenticated, ready, user, logout, getAccessToken } = usePrivy();
  const { isConnected, walletAddress, getBalance, currencySymbol, chainId } = useWallet();
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [mockIDRXBalance, setMockIDRXBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingMockIDRX, setLoadingMockIDRX] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef(null);
  const [userInfo, setUserInfo] = useState({
    username: null,
    email: null,
    usernameSet: false
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Fetch ETH balance when wallet is connected
  useEffect(() => {
    if (isConnected) {
      fetchBalance();
    }
  }, [isConnected]);

  // Fetch MockIDRX balance from backend
  useEffect(() => {
    if (authenticated) {
      fetchMockIDRXBalance();
    }
  }, [authenticated]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

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

  const fetchMockIDRXBalance = async () => {
    try {
      setLoadingMockIDRX(true);
      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/overview`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();
      setMockIDRXBalance(data.user?.mockIDRX || 0);

      // Store user info from backend
      setUserInfo({
        username: data.user?.username || null,
        email: data.user?.email || null,
        usernameSet: data.user?.usernameSet || false
      });
    } catch (error) {
      console.error("Failed to fetch MockIDRX balance:", error);
      setMockIDRXBalance(0);
    } finally {
      setLoadingMockIDRX(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const triggerToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 2200);
  };

  if (!ready || !authenticated) {
    return null;
  }

  // Get user info - Priority: Custom Username > Twitter/Discord > Email > Wallet Address
  const userEmail = user?.email?.address || userInfo.email || "";

  // Determine account type and username
  let userName = "Racer";
  let accountType = "Guest";

  // Priority 1: Custom username from database
  if (userInfo.usernameSet && userInfo.username) {
    userName = userInfo.username;
    accountType = "Username";
  }
  // Priority 2: Twitter username
  else if (user?.twitter?.username) {
    userName = user.twitter.username;
    accountType = "Twitter";
  }
  // Priority 3: Discord username
  else if (user?.discord?.username) {
    userName = user.discord.username;
    accountType = "Discord";
  }
  // Priority 4: Email username
  else if (userEmail) {
    userName = userEmail.split('@')[0];
    accountType = "Email";
  }
  // Priority 5: Wallet address (fallback)
  else if (walletAddress) {
    userName = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    accountType = "Wallet";
  }

  // Shorten wallet address for display
  const shortAddress = isConnected && walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : authenticated
      ? "Creating wallet..."
      : "Not connected";

  const hasWallet = isConnected && walletAddress;
  const chainLabel = chainId === 8453
    ? "Base Mainnet"
    : chainId === 84532
      ? "Base Sepolia"
      : chainId === 1
        ? "Ethereum Mainnet"
        : chainId
          ? `Chain ${chainId}`
          : "Detecting network...";

  const explorerBaseUrl = chainId === 8453
    ? "https://basescan.org"
    : chainId === 84532
      ? "https://sepolia.basescan.org"
      : chainId === 1
        ? "https://etherscan.io"
        : null;

  const handleCopyAddress = async () => {
    if (!hasWallet) {
      triggerToast("Wallet not connected yet");
      return;
    }
    if (!navigator?.clipboard) {
      triggerToast("Copy not supported");
      return;
    }
    try {
      await navigator.clipboard.writeText(walletAddress);
      triggerToast("Wallet address copied");
    } catch (error) {
      console.error("Failed to copy wallet address:", error);
      triggerToast("Copy failed");
    }
  };

  const handleOpenExplorer = () => {
    if (!hasWallet) {
      triggerToast("Wallet not connected yet");
      return;
    }
    if (!explorerBaseUrl) {
      triggerToast("Explorer not available");
      return;
    }
    window.open(`${explorerBaseUrl}/address/${walletAddress}`, "_blank", "noopener,noreferrer");
  };

  const handleComingSoon = (label) => {
    triggerToast(`${label} coming soon`);
  };

  const menuItems = [
    {
      id: "address",
      icon: "📍",
      title: "Wallet Address",
      subtitle: shortAddress,
      hint: "Tap to copy",
      onClick: handleCopyAddress,
    },
    {
      id: "network",
      icon: "🌐",
      title: "Network",
      subtitle: chainLabel,
      hint: "Tap to switch",
      onClick: () => setShowNetworkModal(true),
    },
    {
      id: "explorer",
      icon: "🧭",
      title: "View on Explorer",
      subtitle: explorerBaseUrl ? chainLabel : "Explorer unavailable",
      hint: "Open in browser",
      onClick: handleOpenExplorer,
      disabled: !hasWallet || !explorerBaseUrl,
    },
    {
      id: "help",
      icon: "💬",
      title: "Help & Support",
      subtitle: "customer services",
      onClick: () => handleComingSoon("Customer service")
    },
    {
      id: "info",
      icon: "ℹ️",
      title: "Information",
      subtitle: "Your Information",
      onClick: () => handleComingSoon("Your Information Comming soon")
    },
    {
      id: "terms",
      icon: "📄",
      title: "Terms and Conditions",
      subtitle: "",
      onClick: () => handleComingSoon("Terms and conditions")
    },
    {
      id: "privacy",
      icon: "🔒",
      title: "Privacy Policy",
      subtitle: "",
      onClick: () => handleComingSoon("Privacy policy")
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
          {/* User Info Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 profile-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-3xl">
                  🏎️
                </div>
                <div>
                  <h2 className="text-xl font-black">{userName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase font-bold">
                      {accountType === "Username" && "👤 "}
                      {accountType === "Twitter" && "🐦 "}
                      {accountType === "Discord" && "💬 "}
                      {accountType === "Email" && "✉️ "}
                      {accountType === "Wallet" && "💳 "}
                      {accountType}
                    </span>
                    {userEmail && (
                      <span className="text-xs text-white/70">{userEmail}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Display */}
            <div className="flex flex-wrap gap-2">
              {/* MockIDRX Balance Badge */}
              <button
                type="button"
                onClick={fetchMockIDRXBalance}
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-4 py-2 w-fit profile-badge transition-transform hover:scale-[1.02] active:scale-95"
                aria-label="Refresh IDRX balance"
                title="Tap to refresh IDRX balance"
              >
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-yellow-300 font-black text-sm">
                  💰
                </div>
                <span className="font-black text-lg text-orange-900">
                  {loadingMockIDRX ? "..." : Math.floor(mockIDRXBalance)}
                </span>
                <span className="text-sm font-bold text-orange-900 opacity-90">IDRX</span>
              </button>

              <button
                type="button"
                onClick={fetchBalance}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-white profile-badge transition-transform hover:scale-[1.02] active:scale-95"
                aria-label="Refresh wallet balance"
                title="Tap to refresh wallet balance"
              >
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-black text-sm">
                  Ξ
                </div>
                <span className="font-black text-lg">
                  {loadingBalance ? "..." : balance.toFixed(4)}
                </span>
                <span className="text-sm font-bold text-white/70">{currencySymbol}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Menu Items */}
        <div className="flex-1 px-6 space-y-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`group w-full bg-orange-500/50 backdrop-blur-sm rounded-xl p-4 transition-all transform hover:scale-[1.02] active:scale-95 ${
                item.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-orange-500/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3 text-left">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className="font-bold text-white">{item.title}</h3>
                    {item.subtitle && (
                      <p className="text-sm text-white/80">{item.subtitle}</p>
                    )}
                    {item.hint && (
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">{item.hint}</span>
                    )}
                  </div>
                </div>
                <span className="text-2xl text-white transition-transform group-hover:translate-x-1">›</span>
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

      {showToast && (
        <div className="profile-toast animate-rise" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}

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
