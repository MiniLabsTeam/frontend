"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Car, Flame, Activity, BadgeCheck, Coins } from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import { useWallet } from "@/hooks/useWallet";
import { useSuiClientQuery } from "@onelabs/dapp-kit";
import { PullToRefresh } from "@/components/shared";
import { toast } from "sonner";

const OCT_COIN_TYPE = "0x2::oct::OCT";
const MIST_PER_OCT = 1_000_000_000;

export default function Dashboard() {
  const { isConnected, walletAddress, getAuthToken } = useWallet();
  const router = useRouter();

  // Fetch OCT balance from OneChain RPC
  const { data: balanceData, isLoading: balanceLoading } = useSuiClientQuery(
    "getBalance",
    { owner: walletAddress ?? "", coinType: OCT_COIN_TYPE },
    { enabled: !!walletAddress }
  );
  const octBalance = balanceData
    ? (Number(balanceData.totalBalance) / MIST_PER_OCT).toFixed(2)
    : null;

  // State
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [stats, setStats] = useState({
    totalMinted: 0,
    lastHourMinted: 0,
    totalCars: 0,
    totalUsers: 0,
    popularSeries: { name: "Economy", count: 0 }
  });
  const [currentCarIndex, setCurrentCarIndex] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [supplyData, setSupplyData] = useState([]);
  const [userStats, setUserStats] = useState({
    totalCars: 0,
    totalFragments: 0
  });
  const [userInfo, setUserInfo] = useState({
    email: null,
    username: null,
    walletAddress: null,
  });
  const [fetchError, setFetchError] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user is first-time visitor
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial && isConnected) {
      // Small delay to let the dashboard load first
      setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
    }
  }, [isConnected]);

  // Handle onboarding close
  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenTutorial', 'true');
    toast.success('Welcome to MiniGarage! 🎉');
  };

  // Rare pool showcase cars - Images matched with rarity tiers (based on backend gacha config)
  const showcaseCars = [
    {
      id: 1,
      name: "BUGATTI CHIRON",
      image: "/assets/car_no_background/02-Bugatti-Chiron-removebg-preview.png",
      rarity: "Legendary",
      series: "Hypercar",
    },
    {
      id: 2,
      name: "FERRARI F8 TURBO",
      image: "/assets/car_no_background/07-Ferrari-F8-Turbo-removebg-preview.png",
      rarity: "Epic",
      series: "Supercar",
    },
    {
      id: 3,
      name: "BMW M3 GTR",
      image: "/assets/car_no_background/04-BMW-M3-GTR-removebg-preview.png",
      rarity: "Rare",
      series: "Sport",
    },
  ];

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  // Fetch user data and stats
  const fetchUserData = useCallback(async () => {
    try {
      setLoadingUserData(true);
      setFetchError(null);
      const authToken = await getAuthToken();

      // Fetch user info
      const meResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const meData = await meResponse.json();

      setUserInfo({
        email: meData.data?.email || null,
        username: meData.data?.username || null,
        walletAddress: meData.data?.address || null,
      });

      // Fetch inventory stats (cars + spare parts count)
      const invResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/stats`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const invData = await invResponse.json();

      setUserStats({
        totalFragments: invData.data?.totalParts || 0,
        totalCars: invData.data?.totalCars || 0,
      });
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setFetchError(error.message || "Failed to load data");
    } finally {
      setLoadingUserData(false);
    }
  }, [getAuthToken]);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const authToken = await getAuthToken();

      // Fetch user's gacha stats
      const gachaStatsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/gacha/stats`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const gachaStatsData = await gachaStatsRes.json();
      const gd = gachaStatsData.data || {};

      setStats({
        totalMinted: gd.totalPulls || 0,
        lastHourMinted: gd.carVsPartRatio?.cars || 0,
        totalCars: gd.totalPulls || 0,
        totalUsers: 0,
        popularSeries: { name: "Epic", count: gd.rarityBreakdown?.EPIC || 0 },
      });

      // Fetch gacha tiers for display (no auth needed)
      const tiersRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/gacha/tiers`);
      const tiersData = await tiersRes.json();
      setSupplyData(tiersData.data || []);

    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, [getAuthToken]);

  // Fetch recent activity from gacha history
  const fetchRecentActivity = useCallback(async () => {
    try {
      setLoadingActivity(true);
      const authToken = await getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/gacha/history?limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();

      // Map gacha history to activity display format
      const activities = (data.data || []).map((h) => ({
        id: h.id,
        avatar: h.isCar ? "🚗" : "🔧",
        user: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "You",
        action: `opened a gacha box and got ${h.name || "a reward"}${h.rarity ? ` (${h.rarity})` : ""}`,
        time: h.createdAt ? new Date(h.createdAt).toLocaleTimeString() : "just now",
      }));

      setRecentActivity(activities);
    } catch (error) {
      console.error("Failed to fetch recent activity:", error);
      setRecentActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  }, [getAuthToken, walletAddress]);

  useEffect(() => {
    if (isConnected) {
      fetchUserData();
      fetchStats();
      fetchRecentActivity();

      // Refresh stats every 30 seconds
      const interval = setInterval(() => {
        fetchStats();
        fetchRecentActivity();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isConnected, fetchUserData, fetchStats, fetchRecentActivity]);

  // Auto-rotate showcase cars
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarIndex((prev) => (prev + 1) % showcaseCars.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate activity feed with smooth scrolling
  useEffect(() => {
    if (recentActivity.length <= 5) return; // No scrolling if 5 or fewer items

    const interval = setInterval(() => {
      const container = document.getElementById('activity-feed-container');
      if (!container) return;

      const itemHeight = 68; // Approximate height of each activity item
      const scrollAmount = itemHeight * 5; // Scroll by 5 items

      // Get current scroll position
      const currentScroll = container.scrollTop;
      const maxScroll = container.scrollHeight - container.clientHeight;

      // Calculate next scroll position
      let nextScroll = currentScroll + scrollAmount;

      // If next scroll would go past the end, scroll to the very end first
      if (nextScroll > maxScroll) {
        // Check if we're already at the bottom
        if (currentScroll >= maxScroll - 5) {
          // We're at the bottom, loop back to top
          nextScroll = 0;
        } else {
          // Scroll to the very bottom
          nextScroll = maxScroll;
        }
      }

      // Smooth scroll to next position
      container.scrollTo({
        top: nextScroll,
        behavior: 'smooth'
      });
    }, 5000); // Scroll every 5 seconds

    return () => clearInterval(interval);
  }, [recentActivity.length]);

  // Handle pull to refresh
  const handleRefresh = async () => {
    await Promise.all([
      fetchUserData(),
      fetchStats(),
      fetchRecentActivity()
    ]);
  };

  if (!isConnected) {
    return null;
  }

  const currentCar = showcaseCars[currentCarIndex];

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-white overflow-hidden">
      {/* Checkered Pattern Background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(255,255,255,0.15) 30px, rgba(255,255,255,0.15) 60px),
            repeating-linear-gradient(-45deg, transparent, transparent 30px, rgba(255,255,255,0.15) 30px, rgba(255,255,255,0.15) 60px)
          `
        }}
      />

      {/* Main Content */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto pb-24">
          {/* Error Banner */}
          {fetchError && (
            <div className="mx-4 mt-3 mb-2 bg-red-500/90 border-2 border-red-400 rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <span className="text-white text-sm font-bold">Connection issue</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  className="bg-white text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-red-50 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => setFetchError(null)}
                  className="text-white hover:text-red-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <header className="px-4 pt-3 pb-4">
            {/* Top Row - Username + OCT Balance */}
            <div className="flex items-center justify-end gap-2 mb-3">
              {/* OCT Balance Badge */}
              {walletAddress && (
                <div className="bg-orange-500/90 border-2 border-orange-400 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
                  <Coins size={12} className="text-yellow-200" />
                  {balanceLoading ? (
                    <span className="w-10 h-3 bg-orange-400/60 rounded animate-pulse inline-block" />
                  ) : (
                    <span className="text-white text-xs font-black">
                      {octBalance ?? "—"} OCT
                    </span>
                  )}
                </div>
              )}

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
          </header>

          {/* Content Container */}
          <div className="flex-1 px-4 space-y-4 overflow-y-auto">
            {/* Total Minted Card */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-2xl border-2 border-yellow-400 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16" />
              <div className="relative">
                <p className="text-gray-400 text-xs font-bold mb-1">MY GACHA PULLS</p>
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-5xl font-black text-white mb-1">
                      {stats.totalMinted.toLocaleString()}
                    </h2>
                    <p className="text-yellow-400 text-sm font-bold">
                      Total Pulls
                    </p>
                    <p className="text-orange-400 text-xs mt-2 flex items-center gap-1">
                      <Flame size={14} className="text-orange-400" fill="currentColor" />
                      <span>Cars pulled: <span className="font-bold">{stats.lastHourMinted}</span></span>
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                    <Car size={32} className="text-white" strokeWidth={2} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded-xl p-4 shadow-lg">
                <p className="text-gray-400 text-xs font-bold mb-1">MY FRAGMENTS</p>
                {loadingUserData ? (
                  <div className="h-8 bg-gray-700 rounded animate-pulse" />
                ) : (
                  <p className="text-white text-2xl font-black">{userStats.totalFragments}</p>
                )}
              </div>
              <div className="bg-gray-900 rounded-xl p-4 shadow-lg">
                <p className="text-yellow-400 text-xs font-bold mb-1">MY NFTs</p>
                {loadingUserData ? (
                  <div className="h-8 bg-gray-700 rounded animate-pulse" />
                ) : (
                  <p className="text-white text-2xl font-black">{userStats.totalCars}</p>
                )}
              </div>
            </div>

            {/* Gacha Tier Rates */}
            <div className="bg-gray-900/80 rounded-2xl p-4 shadow-2xl">
              <h3 className="text-white font-black text-sm mb-3 tracking-wide">
                GACHA TIER RATES
              </h3>
              {supplyData.length > 0 ? (
                <div className="space-y-3">
                  {supplyData.map((tier) => {
                    const tierColors = {
                      1: { bg: "bg-gradient-to-br from-gray-700 to-gray-800", text: "text-gray-300", bar: "bg-gray-400" },
                      2: { bg: "bg-gradient-to-br from-blue-900 to-blue-950", text: "text-blue-400", bar: "bg-blue-500" },
                      3: { bg: "bg-gradient-to-br from-yellow-900 to-orange-950", text: "text-yellow-400", bar: "bg-yellow-500" },
                    };
                    const cfg = tierColors[tier.id] || tierColors[1];
                    const probs = tier.probabilities || {};

                    return (
                      <div key={tier.id} className={`${cfg.bg} rounded-xl p-3 border border-gray-700/50`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-black ${cfg.text} tracking-wider`}>
                            {tier.name?.toUpperCase() || `TIER ${tier.id}`}
                          </span>
                          <span className="text-white text-xs font-bold">{tier.price} ONE</span>
                        </div>
                        <div className="space-y-1">
                          {Object.entries(probs).map(([rarity, pct]) => (
                            <div key={rarity} className="flex items-center gap-2">
                              <span className="text-gray-400 text-[10px] w-16 uppercase">{rarity}</span>
                              <div className="flex-1 h-1.5 bg-gray-800/60 rounded-full overflow-hidden">
                                <div className={`h-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-gray-300 text-[10px] w-8 text-right">{pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-3 animate-pulse">
                    <Car size={24} className="text-gray-600" strokeWidth={1.5} />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Loading tier data...</p>
                </div>
              )}
            </div>

            {/* Rare Pool Showcase */}
            <div className="bg-gray-900/80 rounded-2xl p-4 shadow-2xl">
              <h3 className="text-white font-black text-sm mb-3 tracking-wide">
                RARE POOL SHOWCASE
              </h3>

              {/* Car Display */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 mb-3 relative overflow-hidden">
                {/* Rarity Badge - Styled based on rarity */}
                <div className="flex justify-center mb-2">
                  {currentCar.rarity === "Legendary" && (
                    <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/30 animate-pulse">
                      ⭐ {currentCar.rarity}
                    </span>
                  )}
                  {currentCar.rarity === "Epic" && (
                    <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-purple-500 via-violet-600 to-purple-700 text-white shadow-lg shadow-purple-500/30">
                      💎 {currentCar.rarity}
                    </span>
                  )}
                  {currentCar.rarity === "Rare" && (
                    <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-blue-400 via-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
                      🔷 {currentCar.rarity}
                    </span>
                  )}
                </div>

                {/* Car Image - Bigger with transparent bg */}
                <div className="relative h-44 mb-3 flex items-center justify-center">
                  <img
                    src={currentCar.image}
                    alt={currentCar.name}
                    className="max-h-full max-w-full object-contain drop-shadow-2xl scale-110 hover:scale-115 transition-transform duration-300"
                    style={{
                      filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
                      background: 'transparent'
                    }}
                    onError={(e) => {
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23333' width='200' height='150'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='16'%3ECar%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>

                {/* Car Name & Series */}
                <h4 className="text-white font-black text-center text-lg">
                  {currentCar.name}
                </h4>
                <p className="text-gray-400 text-xs text-center font-medium">
                  {currentCar.series} Series
                </p>
              </div>

              {/* Carousel Dots */}
              <div className="flex justify-center gap-1.5">
                {showcaseCars.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentCarIndex(idx)}
                    className={`h-2 rounded-full transition-all ${idx === currentCarIndex
                      ? "w-6 bg-orange-500"
                      : "w-2 bg-gray-600 hover:bg-gray-500"
                      }`}
                  />
                ))}
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="bg-gray-900/80 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-black text-sm tracking-wide">
                  LIVE ACTIVITY FEED
                </h3>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-500 text-xs font-bold">LIVE</span>
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-600 scroll-smooth" id="activity-feed-container">
                {loadingActivity ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg p-3 flex items-center gap-3 animate-pulse">
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-700 rounded w-3/4" />
                        <div className="h-3 bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div
                      key={activity.id}
                      className="bg-gray-800/50 rounded-lg p-3 flex items-center gap-3 hover:bg-gray-800 transition-all animate-fade-up"
                      style={{
                        animationDelay: `${Math.min(index, 4) * 100}ms`,
                        animationFillMode: 'backwards'
                      }}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                        {activity.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm flex items-center flex-wrap gap-1">
                          <span className="font-bold">{activity.user}</span>{" "}
                          <span className="text-gray-400 flex items-center flex-wrap gap-1">
                            {activity.action.split('admin').map((part, i) => (
                              i === 0 ? part : (
                                <span key={i} className="inline-flex items-center gap-0.5">
                                  <span className="font-bold text-white">admin</span>
                                  <BadgeCheck size={16} className="text-blue-400" strokeWidth={2.5} />
                                  {part}
                                </span>
                              )
                            ))}
                          </span>
                        </p>
                      </div>
                      <span className="text-gray-500 text-xs flex-shrink-0">
                        {activity.time}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-3">
                      <Activity size={24} className="text-gray-600" strokeWidth={1.5} />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">No activity yet</p>
                    <p className="text-gray-600 text-xs">Be the first to open a gacha box!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <BottomNavigation />



      {/* Onboarding Tutorial */}
      <OnboardingTutorial
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
      />
    </main>
  );
}
