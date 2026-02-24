"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Car, Flame, Activity, BadgeCheck, Coins } from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import WalletButton from "@/components/shared/WalletButton";
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
    tokenBalance: 0,
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
    toast.success('Welcome to MiniLabs! 🎉');
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
        tokenBalance: meData.data?.tokenBalance ?? 0,
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

      // Fetch gacha stats + tiers in parallel (tiers needs no auth)
      const [gachaStatsRes, tiersRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/gacha/stats`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/gacha/tiers`),
      ]);
      const [gachaStatsData, tiersData] = await Promise.all([
        gachaStatsRes.json(),
        tiersRes.json(),
      ]);

      const gd = gachaStatsData.data || {};
      setStats({
        totalMinted: gd.totalPulls || 0,
        lastHourMinted: gd.carVsPartRatio?.cars || 0,
        totalCars: gd.totalPulls || 0,
        totalUsers: 0,
        popularSeries: { name: "Epic", count: gd.rarityBreakdown?.EPIC || 0 },
      });
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
              {/* Token Balance Badge */}
              {walletAddress && (
                <div className="bg-purple-600/90 border-2 border-purple-400 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
                  <span className="text-yellow-300 text-xs">🪙</span>
                  <span className="text-white text-xs font-black">
                    {userInfo.tokenBalance.toLocaleString()}
                  </span>
                </div>
              )}

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
              <WalletButton />
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
            <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '1rem', padding: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <h3 style={{ color: '#fff', fontWeight: 900, fontSize: '0.8rem', marginBottom: '0.75rem', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🎰 GACHA TIER RATES
              </h3>
              {(() => {
                const RARITY_NAMES = { "0": "Common", "1": "Rare", "2": "Epic", "3": "Legendary" };
                const RARITY_STYLE = {
                  Common:   { color: '#94a3b8', bar: 'linear-gradient(90deg, #64748b, #94a3b8)' },
                  Rare:     { color: '#60a5fa', bar: 'linear-gradient(90deg, #2563eb, #60a5fa)' },
                  Epic:     { color: '#c084fc', bar: 'linear-gradient(90deg, #9333ea, #e879f9)' },
                  Legendary:{ color: '#fbbf24', bar: 'linear-gradient(90deg, #d97706, #fde68a)' },
                };
                const TIER_STYLE = {
                  1: { bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1.5px solid #334155', titleColor: '#e2e8f0', icon: '📦', priceBg: '#1e293b' },
                  2: { bg: 'linear-gradient(135deg, #1e3a5f 0%, #0c1f3f 100%)', border: '1.5px solid #3b82f6', titleColor: '#93c5fd', icon: '🎲', priceBg: '#1e3a5f' },
                  3: { bg: 'linear-gradient(135deg, #3d1f00 0%, #1c0f00 100%)', border: '1.5px solid #f59e0b', titleColor: '#fcd34d', icon: '💎', priceBg: '#3d1f00' },
                };
                return supplyData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {supplyData.map((tier) => {
                      const ts = TIER_STYLE[tier.id] || TIER_STYLE[1];
                      const probs = tier.probabilities || {};
                      const octPrice = tier.price
                        ? (Number(tier.price) / 1_000_000_000).toLocaleString("en", { maximumFractionDigits: 2 })
                        : "—";
                      return (
                        <div key={tier.id} style={{ background: ts.bg, border: ts.border, borderRadius: '0.75rem', padding: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '1rem' }}>{ts.icon}</span>
                              <span style={{ color: ts.titleColor, fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.08em' }}>
                                {tier.name?.toUpperCase() || `TIER ${tier.id}`}
                              </span>
                            </div>
                            <span style={{ color: '#fb923c', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(0,0,0,0.4)', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid rgba(251,146,60,0.3)' }}>
                              {octPrice} OCT
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {Object.entries(probs)
                              .filter(([, v]) => v > 0)
                              .map(([key, val]) => {
                                const label = RARITY_NAMES[key] || key;
                                const rs = RARITY_STYLE[label] || RARITY_STYLE.Common;
                                const pct = Math.round(Number(val) * 100 * 10) / 10;
                                return (
                                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: rs.color, fontSize: '0.6rem', fontWeight: 700, width: '3.5rem', flexShrink: 0 }}>{label}</span>
                                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${pct}%`, background: rs.bar, borderRadius: '999px', transition: 'width 0.5s ease', boxShadow: `0 0 6px ${rs.color}88` }} />
                                    </div>
                                    <span style={{ color: rs.color, fontSize: '0.6rem', fontWeight: 900, width: '2rem', textAlign: 'right' }}>{pct}%</span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '0.75rem', padding: '0.75rem', opacity: 0.7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                          <div style={{ height: '0.75rem', width: '6rem', background: '#334155', borderRadius: '4px' }} />
                          <div style={{ height: '0.75rem', width: '4rem', background: '#334155', borderRadius: '4px' }} />
                        </div>
                        {[1, 2, 3].map((j) => (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <div style={{ height: '0.5rem', width: '3.5rem', background: '#334155', borderRadius: '4px' }} />
                            <div style={{ flex: 1, height: '6px', background: '#334155', borderRadius: '999px' }} />
                            <div style={{ height: '0.5rem', width: '2rem', background: '#334155', borderRadius: '4px' }} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })()}
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
