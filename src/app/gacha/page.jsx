"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import {
  Wallet, Package, Dices, Gift, Gem, ChevronRight, Lock
} from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import { getGachaBoxes } from "@/lib/gachaApi";

export default function GachaPage() {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const { walletAddress } = useWallet();
  const router = useRouter();

  // Gacha data from backend
  const [gachaBoxes, setGachaBoxes] = useState([]);
  const [userMockIDRX, setUserMockIDRX] = useState(0);
  const [loadingGachaData, setLoadingGachaData] = useState(true);
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

  // Fetch gacha boxes and user MockIDRX balance from backend
  const fetchGachaData = async () => {
    if (!authenticated) return;

    try {
      setLoadingGachaData(true);
      const authToken = await getAccessToken();
      const data = await getGachaBoxes(authToken);

      setGachaBoxes(data.boxes);
      setUserMockIDRX(data.userMockIDRX);

      // Fetch user info from overview
      const overviewResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/overview`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const overviewData = await overviewResponse.json();
      setUserInfo({
        username: overviewData.user?.username || null,
        email: overviewData.user?.email || null,
        usernameSet: overviewData.user?.usernameSet || false
      });

      setLoadingGachaData(false);
    } catch (error) {
      console.error("Failed to fetch gacha data:", error);
      setLoadingGachaData(false);
    }
  };

  useEffect(() => {
    if (authenticated && ready) {
      fetchGachaData();
    }
  }, [authenticated, ready]);

  const handleTierClick = (tierType) => {
    router.push(`/gacha/${tierType}`);
  };

  if (!ready || !authenticated) {
    return null;
  }

  // Tier configuration with rewards info
  const tierConfigs = {
    standard: {
      gradient: "from-gray-600 to-gray-700",
      borderColor: "border-gray-500",
      icon: "📦",
      iconBg: "from-gray-500 to-gray-600",
      title: "STANDARD BOX",
      description: "Perfect for beginners! Get common to rare car fragments.",
      rewards: [
        { rarity: "Common", chance: "70%", color: "text-gray-400" },
        { rarity: "Rare", chance: "25%", color: "text-blue-400" },
        { rarity: "Epic", chance: "5%", color: "text-purple-400" }
      ]
    },
    rare: {
      gradient: "from-blue-600 to-indigo-700",
      borderColor: "border-blue-500",
      icon: "🎲",
      iconBg: "from-blue-500 to-indigo-600",
      title: "RARE BOX",
      description: "Better chances for sport cars and rare fragments!",
      rewards: [
        { rarity: "Rare", chance: "58%", color: "text-blue-400" },
        { rarity: "Epic", chance: "37%", color: "text-purple-400" },
        { rarity: "Legendary", chance: "5%", color: "text-yellow-400" }
      ]
    },
    premium: {
      gradient: "from-orange-600 to-red-700",
      borderColor: "border-orange-500",
      icon: "🎁",
      iconBg: "from-orange-500 to-red-600",
      title: "PREMIUM BOX",
      description: "Higher chances for rare and epic fragments!",
      rewards: [
        { rarity: "Rare", chance: "40%", color: "text-blue-400" },
        { rarity: "Epic", chance: "50%", color: "text-purple-400" },
        { rarity: "Legendary", chance: "10%", color: "text-yellow-400" }
      ]
    },
    legendary: {
      gradient: "from-yellow-500 to-amber-600",
      borderColor: "border-yellow-400",
      icon: "💎",
      iconBg: "from-yellow-400 to-amber-500",
      title: "LEGENDARY BOX",
      description: "Best odds for legendary fragments!",
      rewards: [
        { rarity: "Epic", chance: "30%", color: "text-purple-400" },
        { rarity: "Legendary", chance: "70%", color: "text-yellow-400" }
      ]
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-orange-900/30 to-gray-900 text-white overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/view-car-running-high-speed%20(1).jpg')] bg-cover bg-center opacity-20" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto pb-24">
        {/* Header */}
        <header className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between gap-2 mb-6">
            {/* User MockIDRX Balance */}
            <div className="flex items-center gap-1.5 bg-yellow-400 rounded-full px-3 py-1.5 shadow-lg">
              <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center">
                <Wallet size={14} className="text-yellow-300" strokeWidth={3} />
              </div>
              <span className="font-black text-sm text-orange-900">
                {loadingGachaData ? "..." : userMockIDRX.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-orange-900 opacity-80">IDRX</span>
            </div>

            {/* User Info Badge */}
            {(userInfo.username || userInfo.email || walletAddress) && (
              <div className="bg-emerald-500 border-2 border-emerald-400 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-bold">
                  {userInfo.username || (userInfo.email ? userInfo.email.split('@')[0] : null) || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                </span>
              </div>
            )}
          </div>

          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              GACHA
            </h1>
            <p className="text-gray-400 text-sm">
              Choose your box and test your luck!
            </p>
          </div>
        </header>

        {/* Tier Cards */}
        <div className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
          {loadingGachaData ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 mt-4">Loading boxes...</p>
            </div>
          ) : (
            gachaBoxes.map((box) => {
              const config = tierConfigs[box.type];
              if (!config) return null;

              return (
                <button
                  key={box.type}
                  onClick={() => handleTierClick(box.type)}
                  disabled={!box.canAfford}
                  className={`w-full rounded-3xl p-6 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                    box.canAfford
                      ? `bg-gradient-to-br ${config.gradient} border-3 ${config.borderColor} shadow-2xl`
                      : "bg-gray-900/50 border-2 border-gray-800 opacity-50 cursor-not-allowed"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.iconBg} flex items-center justify-center text-3xl shadow-lg`}>
                        {config.icon}
                      </div>
                      <div className="text-left">
                        <h2 className="text-xl font-black text-white">
                          {config.title}
                        </h2>
                        <p className="text-xs text-gray-300 mt-0.5">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    {!box.canAfford && (
                      <span className="text-2xl">🔒</span>
                    )}
                  </div>

                  {/* Cost Section */}
                  <div className="bg-black/30 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-400 text-xs font-bold mb-1">COST PER SPIN</p>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-3xl font-black">
                            {box.costCoins.toLocaleString()}
                          </span>
                          <span className="text-orange-400 text-lg font-bold">IDRX</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                        <Wallet size={24} className="text-orange-600" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>

                  {/* Rewards Section */}
                  <div className="bg-black/20 rounded-2xl p-4">
                    <p className="text-gray-300 text-xs font-bold mb-3 flex items-center gap-2">
                      <span>🎁</span>
                      POSSIBLE REWARDS
                    </p>
                    <div className="space-y-2">
                      {config.rewards.map((reward, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-400 rounded-full" />
                            <span className={`text-sm font-bold ${reward.color}`}>
                              {reward.rarity}
                            </span>
                          </div>
                          <span className="text-white text-sm font-black">
                            {reward.chance}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Open Button Hint */}
                  {box.canAfford && (
                    <div className="mt-4 text-center">
                      <p className="text-white text-sm font-bold flex items-center justify-center gap-2">
                        <span>Tap to Open</span>
                        <span className="text-xl">❯</span>
                      </p>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </main>
  );
}
