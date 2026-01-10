"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import NetworkModal from "@/components/shared/NetworkModal";
import { getGachaBoxes, openGachaBox, getRarityConfig } from "@/lib/gachaApi";

export default function GachaPage() {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const router = useRouter();
  const { walletAddress, chainId, currencySymbol, getBalance, embeddedWallet } = useWallet();

  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [reward, setReward] = useState(null);
  const [slideProgress, setSlideProgress] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  // Gacha data from backend
  const [gachaBoxes, setGachaBoxes] = useState([]);
  const [userCoins, setUserCoins] = useState(0);
  const [selectedBoxType, setSelectedBoxType] = useState("standard");
  const [loadingGachaData, setLoadingGachaData] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  // Fetch gacha boxes and user coins from backend
  const fetchGachaData = async () => {
    if (!authenticated) return;

    try {
      setLoadingGachaData(true);
      setErrorMessage("");
      const authToken = await getAccessToken();
      const data = await getGachaBoxes(authToken);

      setGachaBoxes(data.boxes);
      setUserCoins(data.userCoins);
      setLoadingGachaData(false);
    } catch (error) {
      console.error("Failed to fetch gacha data:", error);
      setErrorMessage("Failed to load gacha data. Please try again.");
      setLoadingGachaData(false);
    }
  };

  useEffect(() => {
    if (authenticated && ready) {
      fetchGachaData();
    }
  }, [authenticated, ready]);

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
  const triggerSpin = async () => {
    if (hasSpun || isSpinning) return;

    setIsSpinning(true);
    setErrorMessage("");
    isDraggingRef.current = false;

    try {
      // Get auth token
      const authToken = await getAccessToken();

      // Call backend API to open gacha box
      const result = await openGachaBox(selectedBoxType, authToken);

      // Simulate spinning animation (2 seconds)
      setTimeout(() => {
        // Map backend reward to frontend format
        const rarityConfig = getRarityConfig(result.reward.rarity);

        const rewardData = {
          tokenId: result.reward.tokenId,
          name: result.reward.modelName,
          series: result.reward.series,
          rarity: rarityConfig.label,
          rarityColor: rarityConfig.color,
          txHash: result.reward.txHash,
          image: "/assets/car/Chrome Viper.png", // Default image, dapat disesuaikan
        };

        setReward(rewardData);
        setHasSpun(true);
        setIsSpinning(false);

        // Update user coins
        setUserCoins(result.coins.remaining);

        console.log("✅ Gacha Success:", result);
      }, 2000);
    } catch (error) {
      console.error("❌ Gacha failed:", error);
      setIsSpinning(false);
      setSlideProgress(0);

      // Show error message
      if (error.message.includes("Insufficient coins")) {
        setErrorMessage("Insufficient coins! You need more coins to open this box.");
      } else {
        setErrorMessage(error.message || "Failed to open gacha box. Please try again.");
      }
    }
  };

  const handleClaim = () => {
    // Refresh gacha data to update coins
    fetchGachaData();
    // Reset state for next spin
    setHasSpun(false);
    setReward(null);
    setSlideProgress(0);
    setErrorMessage("");
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
          <div className="flex items-center justify-between gap-2">
            {/* User Coins (from backend) */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-3 py-1.5 shadow-lg">
              <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-yellow-300 font-black text-xs">
                💰
              </div>
              <span className="font-black text-sm text-orange-900">
                {loadingGachaData ? "..." : userCoins}
              </span>
              <span className="text-xs font-bold text-orange-900 opacity-80">coins</span>
            </div>

            {/* ETH Balance Badge - Click to switch network */}
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

        {/* Box Selection Tabs */}
        {!hasSpun && !isSpinning && (
          <div className="px-4 py-2">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {gachaBoxes.map((box) => (
                <button
                  key={box.type}
                  onClick={() => setSelectedBoxType(box.type)}
                  disabled={!box.canAfford}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                    selectedBoxType === box.type
                      ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-orange-900 shadow-lg scale-105"
                      : box.canAfford
                      ? "bg-orange-600/50 text-white hover:bg-orange-600/70"
                      : "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {box.type.toUpperCase()} ({box.costCoins} 💰)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="px-4 pb-2">
            <div className="bg-red-500/20 border border-red-500 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-red-400 text-sm">⚠️ {errorMessage}</span>
            </div>
          </div>
        )}

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
                    <span className="text-2xl">💰</span>
                  </div>
                  <span className="text-6xl font-black text-orange-400">
                    {gachaBoxes.find(b => b.type === selectedBoxType)?.costCoins || 0}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  {selectedBoxType.toUpperCase()} Box
                </p>
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

              {/* Car Name & Series */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 py-3 mb-2">
                <h3 className="text-white font-black text-xl uppercase tracking-wider">
                  {reward?.name}
                </h3>
              </div>

              <p className="text-gray-300 text-sm mb-2">{reward?.series} Series</p>

              {/* NFT Info */}
              <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 mb-4 text-left">
                <p className="text-gray-400 text-xs mb-1">
                  <span className="text-orange-400 font-bold">Token ID:</span> #{reward?.tokenId}
                </p>
                {reward?.txHash && (
                  <p className="text-gray-400 text-xs break-all">
                    <span className="text-orange-400 font-bold">TX:</span>{" "}
                    <a
                      href={`https://sepolia.basescan.org/tx/${reward.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {reward.txHash.slice(0, 10)}...{reward.txHash.slice(-8)}
                    </a>
                  </p>
                )}
              </div>

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
