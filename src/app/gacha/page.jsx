"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2 } from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import WalletButton from "@/components/shared/WalletButton";
import PageHeader from "@/components/shared/PageHeader";
import { useWallet } from "@/hooks/useWallet";
import { getGachaTiers } from "@/lib/gachaApi";

// Static display config per tier (style only — data comes from backend)
const TIER_STATIC = {
  1: {
    key: "standard",
    gradient: "from-gray-600 to-gray-700",
    borderColor: "border-gray-500",
    icon: "📦",
    iconBg: "from-gray-500 to-gray-600",
    title: "STANDARD BOX",
    description: "Perfect for beginners! Get common to rare car fragments.",
    fallbackRewards: [
      { rarity: "Common", chance: "70%", color: "text-gray-400" },
      { rarity: "Rare", chance: "25%", color: "text-blue-400" },
      { rarity: "Epic", chance: "5%", color: "text-purple-400" },
    ],
  },
  2: {
    key: "rare",
    gradient: "from-blue-600 to-indigo-700",
    borderColor: "border-blue-500",
    icon: "🎲",
    iconBg: "from-blue-500 to-indigo-600",
    title: "RARE BOX",
    description: "Better chances for sport cars and rare fragments!",
    fallbackRewards: [
      { rarity: "Rare", chance: "58%", color: "text-blue-400" },
      { rarity: "Epic", chance: "37%", color: "text-purple-400" },
      { rarity: "Legendary", chance: "5%", color: "text-yellow-400" },
    ],
  },
  3: {
    key: "legendary",
    gradient: "from-yellow-500 to-amber-600",
    borderColor: "border-yellow-400",
    icon: "💎",
    iconBg: "from-yellow-400 to-amber-500",
    title: "LEGENDARY BOX",
    description: "Best odds for legendary fragments and cars!",
    fallbackRewards: [
      { rarity: "Epic", chance: "30%", color: "text-purple-400" },
      { rarity: "Legendary", chance: "70%", color: "text-yellow-400" },
    ],
  },
};

const RARITY_COLOR = {
  common: "text-gray-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const RARITY_NAMES = { "0": "Common", "1": "Rare", "2": "Epic", "3": "Legendary" };

function buildRewards(probabilities, fallback) {
  if (!probabilities || typeof probabilities !== "object") return fallback;
  const entries = Object.entries(probabilities).filter(([, v]) => Number(v) > 0);
  if (entries.length === 0) return fallback;
  return entries.map(([key, val]) => {
    const name = RARITY_NAMES[key] ?? (key.charAt(0).toUpperCase() + key.slice(1));
    const pct = Math.round(Number(val) * 100 * 10) / 10;
    return {
      rarity: name,
      chance: `${pct}%`,
      color: RARITY_COLOR[name.toLowerCase()] ?? "text-gray-300",
    };
  });
}

export default function GachaPage() {
  const { isConnected } = useWallet();
  const router = useRouter();
  const [liveTiers, setLiveTiers] = useState({});
  const [loadingTiers, setLoadingTiers] = useState(true);

  useEffect(() => {
    getGachaTiers()
      .then((tiers) => {
        if (!Array.isArray(tiers)) return;
        const map = {};
        tiers.forEach((t) => { map[t.id ?? t.tierId] = t; });
        setLiveTiers(map);
      })
      .catch(() => {})
      .finally(() => setLoadingTiers(false));
  }, []);

  const handleTierClick = (tierKey) => {
    if (!isConnected) return;
    router.push(`/gacha/${tierKey}`);
  };

  const handlePlayGame = () => {
    router.push("/game");
  };

  const tierConfigs = Object.entries(TIER_STATIC).map(([id, staticCfg]) => {
    const live = liveTiers[Number(id)];
    return {
      ...staticCfg,
      price: live?.price ?? live?.cost
        ? (Number(live?.price ?? live?.cost) / 1_000_000_000).toLocaleString("en", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          })
        : null,
      currency: "OCT",
      rewards: buildRewards(live?.probabilities, staticCfg.fallbackRewards),
    };
  });

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-orange-900/30 to-gray-900 text-white overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/view-car-running-high-speed%20(1).jpg')] bg-cover bg-center opacity-20" />

      <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto pb-24">
        {/* Header */}
        <header className="px-4 pt-6 pb-4">
          <PageHeader />

          {/* Page Title */}
          <div className="text-center mb-4">
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              GACHA
            </h1>
            <p className="text-gray-400 text-sm">
              Choose your box and test your luck!
            </p>
          </div>

          {/* Play Game Button */}
          <button
            onClick={handlePlayGame}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-2xl py-3 px-4 font-black text-white shadow-lg transition-all active:scale-95"
          >
            <Gamepad2 size={20} strokeWidth={2.5} />
            <span>PLAY ENDLESS RACE</span>
          </button>
        </header>

        {/* Wallet not connected state */}
        {!isConnected && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-black text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 text-sm text-center mb-6">
              Connect your OneChain wallet to access gacha boxes
            </p>
            <WalletButton />
          </div>
        )}

        {/* Tier Cards */}
        {isConnected && (
          <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
            {tierConfigs.map((config) => (
              <button
                key={config.key}
                onClick={() => handleTierClick(config.key)}
                className={`w-full rounded-3xl p-6 transition-all transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br ${config.gradient} border-2 ${config.borderColor} shadow-2xl`}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.iconBg} flex items-center justify-center text-3xl shadow-lg`}
                  >
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

                {/* Rewards */}
                <div className="bg-black/20 rounded-2xl p-4 mb-4">
                  <p className="text-gray-300 text-xs font-bold mb-3 flex items-center gap-2">
                    <span>🎁</span> POSSIBLE REWARDS
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

                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-bold flex items-center gap-2">
                    <span>Tap to Open</span>
                    <span className="text-xl">❯</span>
                  </p>
                  {config.price != null ? (
                    <span className="text-orange-300 font-black text-sm bg-black/30 px-3 py-1 rounded-full">
                      {config.price} {config.currency}
                    </span>
                  ) : loadingTiers ? (
                    <span className="w-16 h-6 bg-white/10 rounded-full animate-pulse" />
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </main>
  );
}
