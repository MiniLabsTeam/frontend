"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import NetworkModal from "@/components/shared/NetworkModal";

// Possible rewards
const possibleRewards = [
  {
    id: 1,
    name: "YELLOW BEETLE",
    image: "/assets/car/Neon Drifter.png",
    rarity: "LEGENDARY CAR",
    stats: "87/1000",
    rarityColor: "from-purple-500 to-pink-500",
  },
  {
    id: 2,
    name: "CHROME VIPER",
    image: "/assets/car/Chrome Viper.png",
    rarity: "EPIC CAR",
    stats: "120/1000",
    rarityColor: "from-purple-600 to-blue-500",
  },
  {
    id: 3,
    name: "SPEED DEMON",
    image: "/assets/car/Speed Demon.png",
    rarity: "RARE CAR",
    stats: "200/1000",
    rarityColor: "from-blue-500 to-cyan-500",
  },
];

export default function GachaPage() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  const { walletAddress, chainId, currencySymbol, getBalance, embeddedWallet } = useWallet();

  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [reward, setReward] = useState(null);
  const [slideProgress, setSlideProgress] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  const sliderRef = useRef(null);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Fetch balance when wallet is connected
  const fetchBalance = async () => {
    if (!walletAddress || !embeddedWallet) {
      setLoadingBalance(false);
      return;
    }

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

  useEffect(() => {
    if (walletAddress && embeddedWallet) {
      fetchBalance();
    }
  }, [walletAddress, embeddedWallet, chainId]);

  // Handle mouse/touch move globally
  useEffect(() => {
    const handleGlobalMove = (e) => {
      if (!isDraggingRef.current || hasSpun) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const diff = clientX - startXRef.current;
      const maxSlide = 250;
      const progress = Math.min(Math.max(diff / maxSlide, 0), 1);
      setSlideProgress(progress);

      // If slid far enough, trigger spin
      if (progress >= 0.85) {
        isDraggingRef.current = false;
        triggerSpin();
      }
    };

    const handleGlobalEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (slideProgress < 0.85 && !hasSpun) {
        setSlideProgress(0);
      }
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove);
    window.addEventListener('touchend', handleGlobalEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [slideProgress, hasSpun]);

  // Handle touch/mouse start
  const handleStart = (e) => {
    if (hasSpun || isSpinning) return;
    e.preventDefault();
    isDraggingRef.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
  };

  // Trigger the spin animation and result
  const triggerSpin = () => {
    if (hasSpun || isSpinning) return;

    setIsSpinning(true);
    isDraggingRef.current = false;

    // Simulate spinning
    setTimeout(() => {
      const randomReward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];
      setReward(randomReward);
      setHasSpun(true);
      setIsSpinning(false);
      // Note: In production, deduct cost via smart contract transaction
    }, 2000);
  };

  const handleClaim = () => {
    router.push("/dashboard");
  };

  if (!ready || !authenticated) {
    return null;
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-orange-900/30 to-gray-900 text-white overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/view-car-running-high-speed%20(1).jpg')] bg-cover bg-center opacity-20" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto">
        {/* Header */}
        <header className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-end">
            {/* Balance Badge - Click to switch network */}
            <div
              onClick={() => setShowNetworkModal(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full px-3 py-1.5 shadow-lg cursor-pointer hover:scale-105 transition-transform group"
            >
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-orange-900 font-black text-xs">
                {currencySymbol === "MATIC" ? "⬡" : "Ξ"}
              </div>
              <span className="font-black text-sm">
                {loadingBalance ? "..." : balance.toFixed(4)}
              </span>
              <span className="text-xs font-bold opacity-80">{currencySymbol}</span>
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

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center px-4 pb-32">
          {!hasSpun ? (
            /* Before Spin Screen */
            <div className="w-full max-w-sm">
              {/* Car Preview */}
              <div className="relative mb-6">
                <img
                  src="/assets/car/High Speed.png"
                  alt="Mystery Car"
                  className={`w-full h-64 object-contain drop-shadow-2xl transition-all duration-300 ${
                    isSpinning ? "animate-spin" : ""
                  }`}
                  style={{
                    filter: isSpinning ? "blur(8px)" : "none",
                  }}
                />
              </div>

              {/* Info Box */}
              <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">🚗</div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    <span className="text-orange-400 font-bold">Peluang mendapatkan Lamborghini Aventador (Legend)</span> naik 50% dari total peluang Legend.* (Artinya, jika kamu dapat Legend, ada peluang 50% itu adalah mobil tersebut)
                  </p>
                </div>
              </div>

              {/* Cost Display */}
              <div className="text-center mb-4">
                <p className="text-orange-400 font-bold text-sm mb-2">COST</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-2xl">$</span>
                  </div>
                  <span className="text-6xl font-black text-orange-400">6</span>
                </div>
              </div>

              {/* Slide to Open */}
              <div className="relative mt-8">
                <p className="text-center text-orange-400 font-bold text-sm mb-2">
                  SLIDE TO OPEN
                </p>

                {/* Slider Track */}
                <div className="relative h-16 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 rounded-full overflow-hidden shadow-xl">
                  {/* Arrow Pattern */}
                  <div className="absolute inset-0 flex items-center justify-end pr-4">
                    <div className="flex gap-1">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="text-black text-2xl font-black"
                          style={{ opacity: 0.3 + (i * 0.1) }}
                        >
                          ❯
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Slider Button */}
                  <div
                    ref={sliderRef}
                    className="absolute top-2 left-2 w-12 h-12 bg-yellow-400 rounded-full shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
                    style={{
                      transform: `translateX(${slideProgress * 250}px)`,
                      transition: isDraggingRef.current ? 'none' : 'transform 0.3s ease-out',
                    }}
                    onTouchStart={handleStart}
                    onMouseDown={handleStart}
                  >
                    <span className="text-2xl pointer-events-none">❯</span>
                  </div>
                </div>
              </div>

              {isSpinning && (
                <p className="text-center text-yellow-400 font-bold mt-4 animate-pulse">
                  SPINNING...
                </p>
              )}
            </div>
          ) : (
            /* After Spin - Result Screen */
            <div className="w-full max-w-sm text-center">
              {/* Congratulations Text */}
              <h2 className="text-3xl font-black mb-6 bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent uppercase animate-pulse">
                Congratulations<br />You Got
              </h2>

              {/* Reward Car */}
              <div className="relative mb-6">
                <img
                  src={reward?.image}
                  alt={reward?.name}
                  className="w-full h-64 object-contain drop-shadow-2xl animate-bounce"
                />
              </div>

              {/* Rarity Badge */}
              <div className={`inline-block bg-gradient-to-r ${reward?.rarityColor} px-6 py-2 rounded-full mb-4`}>
                <p className="text-white font-black text-lg uppercase">
                  {reward?.rarity}
                </p>
              </div>

              {/* Car Name & Stats */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 py-3 mb-2">
                <h3 className="text-white font-black text-xl uppercase tracking-wider">
                  {reward?.name}
                </h3>
              </div>

              <p className="text-gray-300 text-sm mb-6">SISA {reward?.stats}</p>

              {/* Claim Button */}
              <button
                onClick={handleClaim}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xl py-4 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200 uppercase"
              >
                Claim
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Network Modal */}
      <NetworkModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        onNetworkChanged={() => fetchBalance()}
      />
    </main>
  );
}
