"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useParams } from "next/navigation";
import { Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { getGachaBoxes, openGachaBox, getRarityConfig } from "@/lib/gachaApi";
import { payForSpin } from "@/lib/mockidrx";
import { toast } from "sonner";

export default function GachaTierPage() {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const router = useRouter();
  const params = useParams();
  const tierType = params.tier; // standard, premium, or legendary
  const { embeddedWallet, walletAddress } = useWallet();

  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [reward, setReward] = useState(null);
  const [slideProgress, setSlideProgress] = useState(0);

  // Gacha data from backend
  const [gachaBoxes, setGachaBoxes] = useState([]);
  const [userMockIDRX, setUserMockIDRX] = useState(0);
  const [loadingGachaData, setLoadingGachaData] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [userInfo, setUserInfo] = useState({
    username: null,
    email: null,
    usernameSet: false
  });

  const sliderRef = useRef(null);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const progressPercent = Math.min(100, Math.round(slideProgress * 100));
  const isSlideReady = slideProgress >= 1;

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
      setErrorMessage("");
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
      if (progress >= 1) {
        isDraggingRef.current = false;
        triggerSpin();
      }
    };

    const handleGlobalEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (slideProgress < 1 && !hasSpun) {
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
      // Get selected box cost
      const selectedBox = gachaBoxes.find(box => box.type === tierType);
      if (!selectedBox) {
        throw new Error("Box data not loaded. Please refresh the page.");
      }

      if (!selectedBox.costCoins || selectedBox.costCoins <= 0) {
        throw new Error("Invalid box cost. Please refresh the page.");
      }

      console.log("📦 Selected box:", selectedBox);

      // Step 1: User pays for spin by transferring to treasury (GASLESS!)
      console.log(`💳 Paying ${selectedBox.costCoins} IDRX for spin (gasless)...`);
      const paymentResult = await payForSpin(embeddedWallet, selectedBox.costCoins);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Failed to pay for spin");
      }

      console.log("✅ Payment successful:", paymentResult.txHash);

      // Step 2: Get auth token
      const authToken = await getAccessToken();

      // Step 3: Call backend API with payment TX hash for verification
      const result = await openGachaBox(tierType, paymentResult.txHash, authToken);

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

        // Update user MockIDRX balance
        setUserMockIDRX(result.mockIDRX.remaining);

        console.log("✅ Gacha Success:", result);
      }, 2000);
    } catch (error) {
      console.error("❌ Gacha failed:", error);
      setIsSpinning(false);
      setSlideProgress(0);

      // Show error message
      if (error.message.includes("Insufficient MockIDRX")) {
        setErrorMessage("Insufficient MockIDRX tokens! You need more IDRX to open this box.");
        toast.error("Insufficient IDRX balance!");
      } else {
        setErrorMessage(error.message || "Failed to open gacha box. Please try again.");
        toast.error("Gacha failed. Please try again.");
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

  const handleBack = () => {
    router.push("/gacha");
  };

  if (!ready || !authenticated) {
    return null;
  }

  const currentBox = gachaBoxes.find(box => box.type === tierType);

  // Tier configurations
  const tierConfigs = {
    standard: {
      title: "STANDARD BOX",
      icon: "📦",
      gradient: "from-gray-600 to-gray-700",
      description: "Standard box offers common fragments with occasional rare finds!"
    },
    rare: {
      title: "RARE BOX",
      icon: "🎲",
      gradient: "from-blue-600 to-indigo-700",
      description: "Rare box offers better chances for sport cars and rare fragments!"
    },
    premium: {
      title: "PREMIUM BOX",
      icon: "🎁",
      gradient: "from-orange-600 to-red-700",
      description: "Premium box guarantees rare fragments with high epic chances!"
    },
    legendary: {
      title: "LEGENDARY BOX",
      icon: "💎",
      gradient: "from-yellow-500 to-amber-600",
      description: "Legendary box gives the best chance for epic and legendary fragments!"
    }
  };

  const config = tierConfigs[tierType] || tierConfigs.standard;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-orange-900/30 to-gray-900 text-white overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/view-car-running-high-speed%20(1).jpg')] bg-cover bg-center opacity-20" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto">
        {/* Header */}
        <header className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-2 mb-3">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="text-white text-xl">‹</span>
            </button>

            {/* Right Side: Balance + Username */}
            <div className="flex items-center gap-2">
              {/* User MockIDRX Balance (from backend) */}
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
          </div>

          {/* Tier Title */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-3xl">{config.icon}</span>
              <h1 className="text-2xl font-black text-white">
                {config.title}
              </h1>
            </div>
          </div>
        </header>

        {/* Error Message */}
        {errorMessage && (
          <div className="px-4 pb-2">
            <div className="bg-red-500/20 border border-red-500 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-red-400 text-sm">⚠️ {errorMessage}</span>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          {!hasSpun ? (
            /* Before Spin Screen */
            <div className="w-full max-w-sm">
              {/* Car Preview */}
              <div className="relative mb-6">
                <img
                  src="/assets/car/High Speed.png"
                  alt="Mystery Car"
                  className={`w-full h-64 object-contain drop-shadow-2xl transition-all duration-300 ${isSpinning ? "animate-spin" : ""
                    }`}
                  style={{
                    filter: isSpinning ? "blur(8px)" : "none",
                  }}
                />
                <div className="gacha-orbit" aria-hidden="true" />
              </div>

              {/* Info Box */}
              <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">🚗</div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {config.description}
                  </p>
                </div>
              </div>

              {/* Cost Display */}
              <div className="text-center mb-4">
                <p className="text-orange-400 font-bold text-sm mb-2">COST</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Wallet size={24} className="text-orange-600" strokeWidth={2.5} />
                  </div>
                  <span className="text-6xl font-black text-orange-400">
                    {currentBox?.costCoins.toLocaleString() || 0}
                  </span>
                  <span className="text-2xl font-bold text-orange-400 opacity-80">IDRX</span>
                </div>
              </div>

              {/* Slide to Open */}
              <div className="relative mt-8">
                <p className="text-center text-orange-400 font-bold text-sm mb-2">
                  {isSlideReady ? "BOOST READY" : "SLIDE TO OPEN"}
                </p>

                {/* Slider Track */}
                <div
                  className={`relative h-16 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 rounded-full overflow-hidden shadow-xl gacha-track ${isSlideReady ? "gacha-track-ready" : ""}`}
                >
                  <div className="gacha-track-fill" style={{ width: `${progressPercent}%` }} />
                  <div
                    className="gacha-track-sheen"
                    style={{ opacity: Math.min(0.9, slideProgress + 0.15) }}
                    aria-hidden="true"
                  />
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
                    className={`absolute top-2 left-2 w-12 h-12 bg-yellow-400 rounded-full shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none ${slideProgress === 0 && !isSpinning ? "gacha-slider-idle" : ""} ${isSlideReady ? "gacha-slider-ready" : ""}`}
                    style={{
                      transform: `translateX(${slideProgress * 250}px)`,
                      transition: isDraggingRef.current ? 'none' : 'transform 0.3s ease-out',
                      boxShadow: `0 0 ${12 + slideProgress * 26}px rgba(255, 204, 85, 0.65)`,
                    }}
                    onTouchStart={handleStart}
                    onMouseDown={handleStart}
                  >
                    <span className="text-2xl pointer-events-none">❯</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-orange-200/80">
                  <span>{progressPercent}%</span>
                  <span>{isSlideReady ? "Unlocking" : "Keep Sliding"}</span>
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
            <div className="w-full max-w-sm text-center relative overflow-hidden">
              <div className="gacha-reward-glow" aria-hidden="true" />
              <div className="gacha-confetti" aria-hidden="true">
                {Array.from({ length: 14 }).map((_, index) => (
                  <span
                    key={index}
                    className="gacha-confetti-piece"
                    style={{
                      "--confetti-left": `${(index % 7) * 13 + 6}%`,
                      "--confetti-delay": `${index * 90}ms`,
                    }}
                  />
                ))}
              </div>
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
          )}
        </div>
      </div>
    </main>
  );
}
