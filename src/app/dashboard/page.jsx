"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Wallet, Bell, Car, Flame, Lock, Circle, Activity } from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import SetUsernameModal from "@/components/SetUsernameModal";
import { useWallet } from "@/hooks/useWallet";

export default function Dashboard() {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const { walletAddress } = useWallet();
  const router = useRouter();

  // State
  const [mockIDRXBalance, setMockIDRXBalance] = useState(0);
  const [loadingMockIDRX, setLoadingMockIDRX] = useState(false);
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
    usernameSet: false
  });
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // Rare pool showcase cars
  const showcaseCars = [
    {
      id: 1,
      name: "ULTIMATE STRIKE",
      image: "/assets/car/Blaze Runner.png",
      rarity: "Legendary",
      speed: 92,
      power: 95,
      drift: 88,
    },
    {
      id: 2,
      name: "TURBO PHANTOM",
      image: "/assets/car/Turbo Phantom.png",
      rarity: "Epic",
      speed: 88,
      power: 90,
      drift: 85,
    },
    {
      id: 3,
      name: "CHROME VIPER",
      image: "/assets/car/Chrome Viper.png",
      rarity: "Rare",
      speed: 85,
      power: 87,
      drift: 82,
    },
  ];

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Fetch MockIDRX balance and user stats
  const fetchMockIDRXBalance = useCallback(async () => {
    try {
      setLoadingMockIDRX(true);
      const authToken = await getAccessToken();

      // Fetch overview for balance and cars
      const overviewResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/overview`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const overviewData = await overviewResponse.json();
      setMockIDRXBalance(overviewData.user?.mockIDRX || 0);

      // Store user info (email/username)
      const userData = {
        email: overviewData.user?.email || null,
        username: overviewData.user?.username || null,
        walletAddress: overviewData.user?.walletAddress || null,
        usernameSet: overviewData.user?.usernameSet || false
      };
      setUserInfo(userData);

      // Show username modal if username not set
      if (!userData.usernameSet) {
        setShowUsernameModal(true);
      }

      // Fetch fragments for available (unused) fragments count
      const fragmentsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/fragments`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const fragmentsData = await fragmentsResponse.json();

      // Calculate total available fragments (unused only)
      const availableFragments = fragmentsData.inventory?.reduce((sum, brand) => sum + brand.totalParts, 0) || 0;

      // Update user stats with available fragments and total cars
      setUserStats({
        totalFragments: availableFragments,
        totalCars: overviewData.stats?.totalCars || 0
      });
    } catch (error) {
      console.error("Failed to fetch MockIDRX balance:", error);
    } finally {
      setLoadingMockIDRX(false);
    }
  }, [getAccessToken]);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const authToken = await getAccessToken();

      // Fetch supply status
      const supplyRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/supply/status`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const supplyData = await supplyRes.json();

      // Calculate total minted
      const totalMinted = supplyData.series?.reduce((sum, s) => sum + s.currentMinted, 0) || 0;

      // Find most popular series
      const popularSeries = supplyData.series?.reduce((max, s) =>
        s.currentMinted > max.currentMinted ? s : max
      , { series: "Economy", currentMinted: 0 }) || { series: "Economy", currentMinted: 0 };

      setStats({
        totalMinted,
        lastHourMinted: Math.floor(Math.random() * 10) + 1, // Mock for demo
        totalCars: totalMinted,
        totalUsers: Math.floor(totalMinted * 0.7), // Estimate
        popularSeries: { name: popularSeries.series, count: popularSeries.currentMinted }
      });

      // Store supply data for tier progress bars
      setSupplyData(supplyData.series || []);

    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, [getAccessToken]);

  // Fetch recent activity from backend
  const fetchRecentActivity = useCallback(async () => {
    try {
      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/activity/recent`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      setRecentActivity(data.activities || []);
    } catch (error) {
      console.error("Failed to fetch recent activity:", error);
      setRecentActivity([]);
    }
  }, [getAccessToken]);

  // Handle username submission
  const handleSetUsername = async (username) => {
    try {
      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/set-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set username');
      }

      // Update local state
      setUserInfo(prev => ({
        ...prev,
        username: data.user.username,
        usernameSet: true
      }));

      setShowUsernameModal(false);

      // Refresh data from backend to ensure sync
      await fetchMockIDRXBalance();
    } catch (error) {
      console.error('Set username error:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchMockIDRXBalance();
      fetchStats();
      fetchRecentActivity();

      // Refresh stats every 30 seconds
      const interval = setInterval(() => {
        fetchStats();
        fetchRecentActivity();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [authenticated, fetchMockIDRXBalance, fetchStats, fetchRecentActivity]);

  // Auto-rotate showcase cars
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarIndex((prev) => (prev + 1) % showcaseCars.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!ready || !authenticated) {
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
      <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto pb-24">
        {/* Header */}
        <header className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            {/* MockIDRX Balance Badge */}
            <button
              onClick={fetchMockIDRXBalance}
              className="flex items-center gap-1.5 bg-yellow-400 rounded-full px-3 py-1.5 shadow-lg hover:scale-105 transition-transform"
            >
              <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center">
                <Wallet size={14} className="text-yellow-300" strokeWidth={3} />
              </div>
              <span className="font-black text-sm text-orange-900">
                {loadingMockIDRX ? "..." : Math.floor(mockIDRXBalance).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-orange-900 opacity-80">IDRX</span>
            </button>

            {/* User Info Badge */}
            {(userInfo.username || userInfo.email || walletAddress) && (
              <div className="bg-emerald-500 border-2 border-emerald-400 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-bold">
                  {userInfo.username || (userInfo.email ? userInfo.email.split('@')[0] : null) || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                </span>
              </div>
            )}

            {/* Notification Icon */}
            <button className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
              <Bell size={18} className="text-white" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 px-4 space-y-4 overflow-y-auto">
          {/* Total Minted Card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-2xl border-2 border-yellow-400 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <p className="text-gray-400 text-xs font-bold mb-1">TOTAL MINTED</p>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-5xl font-black text-white mb-1">
                    {stats.totalMinted.toLocaleString()}
                  </h2>
                  <p className="text-yellow-400 text-sm font-bold">
                    NFTs
                  </p>
                  <p className="text-orange-400 text-xs mt-2 flex items-center gap-1">
                    <Flame size={14} className="text-orange-400" fill="currentColor" />
                    <span>Last hour: <span className="font-bold">{stats.lastHourMinted}</span></span>
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
              <p className="text-white text-2xl font-black">{userStats.totalFragments}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 shadow-lg">
              <p className="text-yellow-400 text-xs font-bold mb-1">MY NFTs</p>
              <p className="text-white text-2xl font-black">{userStats.totalCars}</p>
            </div>
          </div>

          {/* Tier Supply Progress */}
          <div className="bg-gray-900/80 rounded-2xl p-4 shadow-2xl">
            <h3 className="text-white font-black text-sm mb-3 tracking-wide">
              NFT SUPPLY BY TIER
            </h3>
            {supplyData.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {supplyData.map((tier) => {
                const percentage = tier.maxSupply > 0 ? (tier.currentMinted / tier.maxSupply) * 100 : 0;

                // Tier color configurations
                const tierColors = {
                  Economy: {
                    bg: "bg-gradient-to-br from-gray-700 to-gray-800",
                    text: "text-gray-300",
                    bar: "bg-gray-500",
                    indicatorColor: "text-gray-400"
                  },
                  Sport: {
                    bg: "bg-gradient-to-br from-blue-900 to-blue-950",
                    text: "text-blue-400",
                    bar: "bg-blue-500",
                    indicatorColor: "text-blue-400"
                  },
                  Supercar: {
                    bg: "bg-gradient-to-br from-purple-900 to-purple-950",
                    text: "text-purple-400",
                    bar: "bg-purple-500",
                    indicatorColor: "text-purple-400"
                  },
                  Hypercar: {
                    bg: "bg-gradient-to-br from-yellow-900 to-orange-950",
                    text: "text-yellow-400",
                    bar: "bg-yellow-500",
                    indicatorColor: "text-yellow-400"
                  }
                };

                const config = tierColors[tier.series] || tierColors.Economy;

                return (
                  <div key={tier.series} className={`${config.bg} rounded-2xl p-4 shadow-xl border border-gray-700/50`}>
                    {/* Tier Name with Indicator */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-black ${config.text} tracking-wider`}>
                        {tier.series.toUpperCase()}
                      </span>
                      {tier.soldOut && (
                        <Lock size={12} className="text-gray-400" />
                      )}
                      {tier.almostSoldOut && !tier.soldOut && (
                        <Circle size={10} className={config.indicatorColor} fill="currentColor" />
                      )}
                    </div>

                    {/* Big Number */}
                    <div className="mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-white text-4xl font-black">
                          {tier.currentMinted}
                        </span>
                        <span className="text-gray-500 text-sm font-bold">
                          /{tier.maxSupply}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full h-2 bg-gray-800/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${config.bar} transition-all duration-500 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
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
                <p className="text-gray-500 text-sm font-medium">Loading supply data...</p>
              </div>
            )}
          </div>

          {/* Rare Pool Showcase */}
          <div className="bg-gray-900/80 rounded-2xl p-4 shadow-2xl">
            <h3 className="text-white font-black text-sm mb-3 tracking-wide">
              RARE POOL SHOWCASE
            </h3>

            {/* Car Display */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-xs font-bold">{currentCar.rarity.toUpperCase()}</span>
                <span className="text-gray-400 text-xs">/1000</span>
              </div>

              <div className="relative h-32 mb-3 flex items-center justify-center">
                <img
                  src={currentCar.image}
                  alt={currentCar.name}
                  className="max-h-full max-w-full object-contain drop-shadow-2xl"
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23333' width='200' height='150'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='16'%3ECar%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>

              <h4 className="text-white font-black text-center mb-3">
                {currentCar.name}
              </h4>

              {/* Stats Badges */}
              <div className="flex justify-center gap-2">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg px-3 py-1">
                  <p className="text-white text-xs font-bold">{currentCar.speed}</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg px-3 py-1">
                  <p className="text-white text-xs font-bold">{currentCar.power}</p>
                </div>
                <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg px-3 py-1">
                  <p className="text-white text-xs font-bold">{currentCar.drift}</p>
                </div>
              </div>
            </div>

            {/* Carousel Dots */}
            <div className="flex justify-center gap-1.5">
              {showcaseCars.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentCarIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentCarIndex
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

            <div className="space-y-2">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-gray-800/50 rounded-lg p-3 flex items-center gap-3 hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                      {activity.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">
                        <span className="font-bold">{activity.user}</span>{" "}
                        <span className="text-gray-400">{activity.action}</span>
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

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Set Username Modal */}
      <SetUsernameModal
        isOpen={showUsernameModal}
        onClose={() => {}} // Cannot close - must set username
        onSubmit={handleSetUsername}
      />
    </main>
  );
}
