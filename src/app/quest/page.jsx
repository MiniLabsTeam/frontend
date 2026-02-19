"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Star, CheckCircle, Clock, Gift, Zap, RefreshCw } from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";

const TABS = ["Daily", "Weekly"];

const QUEST_TYPE_COLORS = {
  GACHA: { bg: "from-orange-500 to-red-600", icon: "🎰", label: "Gacha" },
  RACE: { bg: "from-blue-500 to-indigo-600", icon: "🏁", label: "Race" },
  MARKETPLACE: { bg: "from-green-500 to-emerald-600", icon: "🏪", label: "Market" },
  INVENTORY: { bg: "from-purple-500 to-violet-600", icon: "📦", label: "Inventory" },
  LOGIN: { bg: "from-yellow-500 to-amber-600", icon: "🔐", label: "Login" },
  DEFAULT: { bg: "from-gray-500 to-gray-600", icon: "⭐", label: "Quest" },
};

function QuestCard({ quest, onClaim, claiming }) {
  const cfg = QUEST_TYPE_COLORS[quest.type] || QUEST_TYPE_COLORS.DEFAULT;
  const progress = Math.min(quest.progress || 0, quest.requirement || 1);
  const pct = quest.requirement > 0 ? Math.round((progress / quest.requirement) * 100) : 0;

  return (
    <div
      className={`bg-gray-900 rounded-2xl p-4 border ${
        quest.isClaimed
          ? "border-gray-700 opacity-60"
          : quest.isCompleted
          ? "border-green-500 shadow-lg shadow-green-500/20"
          : "border-gray-700"
      } transition-all`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 bg-gradient-to-br ${cfg.bg} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
          {cfg.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-white font-bold text-sm truncate">{quest.name}</h3>
            {quest.isClaimed && <CheckCircle size={14} className="text-green-400 flex-shrink-0" />}
          </div>
          <p className="text-gray-400 text-xs mb-2">{quest.description}</p>

          {/* Progress bar */}
          {!quest.isCompleted && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{progress}/{quest.requirement}</span>
                <span className="text-gray-500">{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${cfg.bg} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Reward */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Gift size={12} className="text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold">
                {typeof quest.reward === "object"
                  ? Object.entries(quest.reward)
                      .map(([k, v]) => `${v} ${k}`)
                      .join(", ")
                  : quest.reward || "Reward"}
              </span>
            </div>

            {quest.isCompleted && !quest.isClaimed && (
              <button
                onClick={() => onClaim(quest.id)}
                disabled={claiming === quest.id}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1 transition-all"
              >
                {claiming === quest.id ? (
                  <RefreshCw size={10} className="animate-spin" />
                ) : (
                  <Zap size={10} />
                )}
                Claim
              </button>
            )}
            {quest.isClaimed && (
              <span className="text-green-400 text-xs font-bold">Claimed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuestPage() {
  const { isConnected, getAuthToken } = useWallet();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(0); // 0=Daily, 1=Weekly
  const [quests, setQuests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  const fetchQuests = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      const endpoint = activeTab === 0 ? "/api/quest/daily" : "/api/quest/weekly";
      const [questsRes, statsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/quest/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const questsData = await questsRes.json();
      const statsData = await statsRes.json();
      setQuests(questsData.data || []);
      setStats(statsData.data || null);
    } catch (err) {
      console.error("Failed to fetch quests:", err);
      toast.error("Failed to load quests");
    } finally {
      setLoading(false);
    }
  }, [isConnected, getAuthToken, activeTab]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const handleClaim = async (questId) => {
    setClaiming(questId);
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/quest/${questId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim");
      toast.success("Quest reward claimed!");
      fetchQuests();
    } catch (err) {
      toast.error(err.message || "Failed to claim quest");
    } finally {
      setClaiming(null);
    }
  };

  const completedCount = quests.filter((q) => q.isCompleted).length;
  const claimableCount = quests.filter((q) => q.isCompleted && !q.isClaimed).length;

  if (!isConnected) return null;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 text-white">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(147,51,234,0.1) 30px, rgba(147,51,234,0.1) 60px)`,
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto pb-24">
        {/* Header */}
        <header className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Trophy size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Daily Quests</h1>
              <p className="text-gray-400 text-xs">Complete quests to earn rewards</p>
            </div>
          </div>

          {/* Stats Row */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-800/80 rounded-xl p-2.5 text-center">
                <p className="text-white font-black text-lg">{stats.totalCompleted || 0}</p>
                <p className="text-gray-400 text-[10px] uppercase tracking-wide">Completed</p>
              </div>
              <div className="bg-gray-800/80 rounded-xl p-2.5 text-center">
                <p className="text-yellow-400 font-black text-lg">{stats.totalClaimed || 0}</p>
                <p className="text-gray-400 text-[10px] uppercase tracking-wide">Claimed</p>
              </div>
              <div className="bg-gray-800/80 rounded-xl p-2.5 text-center">
                <p className="text-green-400 font-black text-lg">{claimableCount}</p>
                <p className="text-gray-400 text-[10px] uppercase tracking-wide">Ready</p>
              </div>
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex bg-gray-800/80 rounded-xl p-1 gap-1">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === i
                    ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        {/* Quest List */}
        <div className="flex-1 px-4 space-y-3 overflow-y-auto">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-900 rounded-2xl p-4 border border-gray-700 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-2/3" />
                    <div className="h-3 bg-gray-700 rounded w-full" />
                    <div className="h-2 bg-gray-800 rounded-full" />
                  </div>
                </div>
              </div>
            ))
          ) : quests.length > 0 ? (
            quests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onClaim={handleClaim}
                claiming={claiming}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Star size={28} className="text-gray-600" />
              </div>
              <p className="text-gray-400 font-bold">No quests available</p>
              <p className="text-gray-600 text-sm mt-1">Check back tomorrow!</p>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </main>
  );
}
