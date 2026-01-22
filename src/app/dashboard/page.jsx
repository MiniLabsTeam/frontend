"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import NetworkModal from "@/components/shared/NetworkModal";
import { claimFaucet, checkFaucetCooldown, formatCooldownTime } from "@/lib/mockidrx";

// Car data
const carCollection = [
  {
    id: 1,
    name: "ULTIMATE STRIKE",
    image: "/assets/car/Blaze Runner.png",
    rarity: "Basic",
    stats: "85/1000",
  },
  {
    id: 2,
    name: "TURBO PHANTOM",
    image: "/assets/car/Turbo Phantom.png",
    rarity: "RARE",
    stats: "92/1000",
  },
  {
    id: 3,
    name: "CHROME VIPER",
    image: "/assets/car/Chrome Viper.png",
    rarity: "EPIC",
    stats: "78/1000",
  },
  {
    id: 4,
    name: "HIGH SPEED",
    image: "/assets/car/High Speed.png",
    rarity: "LEGEND",
    stats: "95/1000",
  },
  {
    id: 5,
    name: "NEON DRIFTER",
    image: "/assets/car/Neon Drifter.png",
    rarity: "RARE",
    stats: "88/1000",
  },
  {
    id: 6,
    name: "SPEED DEMON",
    image: "/assets/car/Speed Demon.png",
    rarity: "EPIC",
    stats: "90/1000",
  },
];

export default function Dashboard() {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const { isConnected, walletAddress, getBalance, currencySymbol, chainId, embeddedWallet } = useWallet();
  const router = useRouter();
  const [currentCarIndex, setCurrentCarIndex] = useState(0);
  const [balance, setBalance] = useState(0);
  const [mockIDRXBalance, setMockIDRXBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingMockIDRX, setLoadingMockIDRX] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const swipeStartRef = useRef({ x: 0, y: 0, time: 0, active: false });

  // Faucet states
  const [claimingFaucet, setClaimingFaucet] = useState(false);
  const [faucetCooldown, setFaucetCooldown] = useState(0);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);

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
    } catch (error) {
      console.error("Failed to fetch MockIDRX balance:", error);
      setMockIDRXBalance(0);
    } finally {
      setLoadingMockIDRX(false);
    }
  };

  const handleNextCar = () => {
    setCurrentCarIndex((prev) => (prev + 1) % carCollection.length);
  };

  const handlePrevCar = () => {
    setCurrentCarIndex((prev) => (prev - 1 + carCollection.length) % carCollection.length);
  };

  const handleSwipeStart = (event) => {
    const point = event.touches ? event.touches[0] : event;
    swipeStartRef.current = {
      x: point.clientX,
      y: point.clientY,
      time: Date.now(),
      active: true,
    };
  };

  const handleSwipeEnd = (event) => {
    if (!swipeStartRef.current.active) return;
    const point = event.changedTouches ? event.changedTouches[0] : event;
    const deltaX = point.clientX - swipeStartRef.current.x;
    const deltaY = point.clientY - swipeStartRef.current.y;
    const duration = Date.now() - swipeStartRef.current.time;

    swipeStartRef.current.active = false;

    if (duration > 800 || Math.abs(deltaX) < 45 || Math.abs(deltaY) > 60) return;

    if (deltaX < 0) {
      handleNextCar();
    } else {
      handlePrevCar();
    }
  };

  const handleSwipeCancel = () => {
    swipeStartRef.current.active = false;
  };

  // Check faucet cooldown
  const checkCooldown = async () => {
    if (!embeddedWallet || !walletAddress) return;

    try {
      const seconds = await checkFaucetCooldown(embeddedWallet, walletAddress);
      setFaucetCooldown(seconds);
    } catch (error) {
      console.error("Failed to check cooldown:", error);
    }
  };

  // Handle claim faucet
  const handleClaimFaucet = async () => {
    if (!embeddedWallet || claimingFaucet) return;

    try {
      setClaimingFaucet(true);
      const result = await claimFaucet(embeddedWallet);

      if (result.success) {
        setShowClaimSuccess(true);
        setTimeout(() => setShowClaimSuccess(false), 3000);

        // Refresh balance and cooldown
        fetchMockIDRXBalance();
        checkCooldown();
      } else {
        alert(result.error || "Failed to claim faucet");
      }
    } catch (error) {
      console.error("Claim faucet error:", error);
      alert("Claim gagal! Coba lagi.");
    } finally {
      setClaimingFaucet(false);
    }
  };

  // Check cooldown on load and every minute
  useEffect(() => {
    if (isConnected && walletAddress && embeddedWallet) {
      checkCooldown();
      const interval = setInterval(checkCooldown, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [isConnected, walletAddress, embeddedWallet]);

  if (!ready || !authenticated) {
    return null;
  }

  const currentCar = carCollection[currentCarIndex];

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-orange-900/30 to-gray-900 text-white overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/view-car-running-high-speed%20(1).jpg')] bg-cover bg-center opacity-30" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto">
        {/* Header */}
        <header className="px-4 pt-3 pb-2">
          {/* Top Bar - Single row with balance on left, wallet + help on right */}
          <div className="flex items-center justify-between gap-2">
            {/* MockIDRX Balance Badge */}
            <button
              type="button"
              onClick={fetchMockIDRXBalance}
              className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-3 py-1.5 shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
              aria-label="Refresh IDRX balance"
              title="Tap to refresh balance"
            >
              <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-yellow-300 font-black text-xs">
                💰
              </div>
              <span className="font-black text-sm text-orange-900">
                {loadingMockIDRX ? "..." : Math.floor(mockIDRXBalance)}
              </span>
              <span className="text-xs font-bold text-orange-900 opacity-80">IDRX</span>
            </button>

            {/* Wallet Status + Help Button */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="bg-green-500/20 border border-green-500 rounded-full px-3 py-1.5 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400 text-xs font-bold">
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </span>
                </div>
              ) : authenticated ? (
                <div className="bg-yellow-500/20 border border-yellow-500 rounded-full px-3 py-1.5 flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-yellow-400 text-xs font-bold">Creating wallet...</span>
                </div>
              ) : (
                <div className="bg-red-500/20 border border-red-500 rounded-full px-3 py-1.5 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-red-400 text-xs font-bold">Not logged in</span>
                </div>
              )}

              {/* Help Icon */}
              <button
                type="button"
                onClick={() => setShowTips(true)}
                className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="Open quick tips"
              >
                <span className="text-white text-xl font-bold">?</span>
              </button>
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <div className="px-4 mt-3 mb-4">
          <div className="relative h-11 rounded-full overflow-hidden shadow-xl group transition-shadow focus-within:shadow-orange-500/40">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 transition-transform duration-300 group-focus-within:scale-[1.02] group-focus-within:brightness-110" />

            {/* Checkered Flag Pattern */}
            <div className="absolute right-0 top-0 bottom-0 w-24">
              <div
                className="w-full h-full"
                style={{
                  background: `
                    linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000),
                    linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000),
                    #fff
                  `,
                  backgroundSize: '10px 10px',
                  backgroundPosition: '0 0, 5px 5px'
                }}
              />
            </div>

            {/* Input */}
            <input
              type="text"
              placeholder="Search..."
              className="relative z-10 w-full h-full bg-transparent text-white placeholder-white/90 px-4 pr-28 font-bold text-sm outline-none focus:placeholder-white/70"
            />
          </div>
        </div>

        {/* Faucet Claim Button */}
        {isConnected && (
          <div className="px-4 mb-4">
            <button
              onClick={handleClaimFaucet}
              disabled={claimingFaucet || faucetCooldown > 0}
              className={`w-full rounded-xl p-4 flex items-center justify-between transition-all ${
                faucetCooldown > 0
                  ? 'bg-gray-700/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-green-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="text-left">
                  <div className="font-black text-white text-sm">
                    {faucetCooldown > 0 ? 'Faucet Cooldown' : claimingFaucet ? 'Claiming...' : 'Claim Free IDRX'}
                  </div>
                  <div className="text-xs text-white/80">
                    {faucetCooldown > 0
                      ? `Next claim: ${formatCooldownTime(faucetCooldown)}`
                      : '1,000,000 IDRX per day'
                    }
                  </div>
                </div>
              </div>
              <div className="text-right">
                {claimingFaucet ? (
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                ) : faucetCooldown > 0 ? (
                  <span className="text-2xl">⏰</span>
                ) : (
                  <span className="text-2xl">🎁</span>
                )}
              </div>
            </button>

            {/* Success Message */}
            {showClaimSuccess && (
              <div className="mt-2 p-3 bg-green-500/20 border border-green-500 rounded-lg flex items-center gap-2">
                <span className="text-xl">✅</span>
                <span className="text-green-400 text-sm font-bold">Claimed 1,000,000 IDRX!</span>
              </div>
            )}
          </div>
        )}

        {/* ALL CAR Label */}
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-red-500 text-lg font-black uppercase tracking-wide">
              ALL CAR
            </h2>
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-black">
                {carCollection.length}
              </span>
            </div>
          </div>
        </div>

        {/* Car Card */}
        <div className="flex-1 px-4 pb-24 overflow-y-auto">
          <div className="bg-gradient-to-br from-red-900 via-red-800 to-black rounded-3xl p-4 shadow-2xl border-4 border-orange-500 dashboard-card">
            {/* Car Image Container */}
            <div
              className="bg-gradient-to-br from-red-600 via-red-700 to-black rounded-2xl p-6 mb-4 relative overflow-hidden cursor-grab active:cursor-grabbing"
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
              onMouseDown={handleSwipeStart}
              onMouseUp={handleSwipeEnd}
              onMouseLeave={handleSwipeCancel}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent" />

              {/* Car Image */}
              <img
                key={currentCar.id}
                src={currentCar.image}
                alt={currentCar.name}
                className="w-full h-48 object-contain relative z-10 drop-shadow-2xl transform hover:scale-110 transition-transform duration-300 animate-rise"
              />

              {/* Stats Badge */}
              <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-1.5 z-20">
                <p className="text-orange-400 text-xs font-bold">
                  {currentCar.rarity} {currentCar.stats}
                </p>
              </div>
            </div>

            {/* Car Name */}
            <h3 className="text-white text-xl font-black uppercase tracking-wider mb-4 text-center bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              {currentCar.name}
            </h3>

            {/* Carousel Dots */}
            <div className="flex justify-center gap-2 mb-4">
              {carCollection.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentCarIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentCarIndex
                      ? "bg-gradient-to-r from-orange-500 to-yellow-500 w-8"
                      : "bg-gray-600"
                  }`}
                />
              ))}
            </div>

            {/* Buy Spin Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => router.push('/gacha')}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black text-xl px-8 py-4 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200 uppercase tracking-wider"
              >
                Buy Spin
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Tips Modal */}
      {showTips && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setShowTips(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-orange-500/40 bg-gradient-to-b from-gray-900 to-black p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-white">Quick Tips</h3>
              <button
                type="button"
                onClick={() => setShowTips(false)}
                className="text-gray-300 hover:text-white text-lg font-bold"
                aria-label="Close tips"
              >
                x
              </button>
            </div>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-orange-400">-</span>
                <span>Swipe the car card to browse your garage.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">-</span>
                <span>Tap the IDRX badge to refresh balance.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">-</span>
                <span>Claim faucet daily for free IDRX.</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setShowTips(false)}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600 py-2 text-sm font-bold text-white shadow-lg hover:from-orange-600 hover:to-orange-700"
            >
              Got it
            </button>
          </div>
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
