"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useSignAndExecuteTransaction } from "@onelabs/dapp-kit";
import { Transaction } from "@onelabs/sui/transactions";
import { getGachaTiers, getGachaPricing, revealGacha, clearStuckGacha, getRarityConfig, tierNameToId } from "@/lib/gachaApi";
import { toast } from "sonner";
import GachaRoulette from "@/components/GachaRoulette";
import ProgressSteps from "@/components/shared/ProgressSteps";
import WalletButton from "@/components/shared/WalletButton";
import PageHeader from "@/components/shared/PageHeader";

// ==================== On-Chain Constants ====================

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID;
const CONFIG_ID = process.env.NEXT_PUBLIC_CONFIG_ID;
const GACHA_STATE_ID = process.env.NEXT_PUBLIC_GACHA_STATE_ID;
const VAULT_ID = process.env.NEXT_PUBLIC_VAULT_ID;
const OCT_TYPE = "0x2::oct::OCT";
const CLOCK_OBJ = "0x6"; // Sui system clock object

// Car probability per tier (matches backend GachaTiers.ts)
const CAR_PROBABILITY = { 1: 0.30, 2: 0.50, 3: 0.60 };

// Token costs per tier (must match backend TOKEN_GACHA_COSTS)
const TOKEN_COSTS = { 1: 500, 2: 1500, 3: 3000 };

// ==================== Helpers ====================

const hexToUint8 = (hex) => {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const pairs = h.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
};

const getAssetImage = (name) => {
  const n = name?.toLowerCase() || "";
  if (n.includes("body")) return "/assets/Fragments/Body.png";
  if (n.includes("chassis") || n.includes("chasis")) return "/assets/Fragments/Chasis.png";
  if (n.includes("engine")) return "/assets/Fragments/Engine.png";
  if (n.includes("interior")) return "/assets/Fragments/Interior.png";
  if (n.includes("wheel")) return "/assets/Fragments/Wheels.png";
  if (n.includes("porsche 911 turbo")) return "/assets/car_no_background/01-Porche-911-Turbo-removebg-preview.png";
  if (n.includes("bugatti")) return "/assets/car_no_background/02-Bugatti-Chiron-removebg-preview.png";
  if (n.includes("jesko")) return "/assets/car_no_background/03-Koenigsegg_Jesko-removebg-preview.png";
  if (n.includes("m3 gtr")) return "/assets/car_no_background/04-BMW-M3-GTR-removebg-preview.png";
  if (n.includes("huracan")) return "/assets/car_no_background/05-Lamborghini-Huracan-removebg-preview.png";
  if (n.includes("audi rs")) return "/assets/car_no_background/06-Audi-RS-Superwagon-removebg-preview.png";
  if (n.includes("ferrari f8")) return "/assets/car_no_background/07-Ferrari-F8-Turbo-removebg-preview.png";
  if (n.includes("huayra")) return "/assets/car_no_background/08-Pagain-Huayra-removebg-preview.png";
  if (n.includes("mercedes amg gt")) return "/assets/car_no_background/11-Mercedes-AMG-GT-removebg-preview.png";
  if (n.includes("mercedes amg")) return "/assets/car_no_background/09-Mercede-AMG-removebg-preview.png";
  if (n.includes("civic")) return "/assets/car_no_background/10-Honda-Civic-removebg-preview.png";
  if (n.includes("corolla")) return "/assets/car_no_background/12-Toyota-Corrola-removebg-preview.png";
  if (n.includes("porsche 911")) return "/assets/car_no_background/13-Proche-911-removebg-preview.png";
  if (n.includes("720s")) return "/assets/car_no_background/14-McLAREN-720s-removebg-preview.png";
  return "/assets/car/Chrome Viper.png";
};

const dummyAssets = [
  { name: "Porsche 911 Turbo", rarity: "Legendary" },
  { name: "Engine Part", rarity: "Rare" },
  { name: "Bugatti Chiron", rarity: "Legendary" },
  { name: "Wheels Set", rarity: "Common" },
  { name: "Koenigsegg Jesko", rarity: "Legendary" },
  { name: "Chasis Kit", rarity: "Uncommon" },
  { name: "BMW M3 GTR", rarity: "Epic" },
  { name: "Interior Trim", rarity: "Common" },
  { name: "Lamborghini Huracan", rarity: "Epic" },
  { name: "Body Kit", rarity: "Rare" },
  { name: "Ferrari F8", rarity: "Epic" },
  { name: "Pagani Huayra", rarity: "Legendary" },
  { name: "Mercedes AMG", rarity: "Rare" },
  { name: "Honda Civic", rarity: "Common" },
  { name: "McLaren 720s", rarity: "Epic" },
].map((item) => ({ ...item, image: getAssetImage(item.name) }));

// ==================== Component ====================

export default function GachaTierPage() {
  const { isConnected, walletAddress, getAuthToken } = useWallet();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const router = useRouter();
  const params = useParams();
  const tierType = params.tier;

  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [reward, setReward] = useState(null);
  const [slideProgress, setSlideProgress] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);
  const [spinProgress, setSpinProgress] = useState(1);
  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [tokenBalance, setTokenBalance] = useState(null);
  const [tokenPulling, setTokenPulling] = useState(false);
  const sliderRef = useRef(null);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const progressPercent = Math.min(100, Math.round(slideProgress * 100));
  const isSlideReady = slideProgress >= 1;

  useEffect(() => {
    if (!isConnected) router.push("/gacha");
  }, [isConnected, router]);

  // Load pricing from public tiers endpoint (no auth needed)
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingPricing(true);
        const tierId = tierNameToId(tierType);
        const tiers = await getGachaTiers();
        const tier = Array.isArray(tiers)
          ? tiers.find((t) => t.id === tierId || t.tierId === tierId)
          : null;
        if (tier) {
          const rawMist = tier.price ?? tier.cost ?? 0;
          const octAmount = (Number(rawMist) / 1_000_000_000).toLocaleString("en", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          });
          setPricing({ price: octAmount, currency: "OCT" });
        }
      } catch (err) {
        console.error("Failed to load pricing:", err);
      } finally {
        setLoadingPricing(false);
      }
    };
    load();
  }, [tierType]);

  // Load token balance
  useEffect(() => {
    if (!isConnected) return;
    const load = async () => {
      try {
        const authToken = await getAuthToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        setTokenBalance(data.data?.tokenBalance ?? 0);
      } catch (err) {
        console.error("Failed to load token balance:", err);
      }
    };
    load();
  }, [isConnected, getAuthToken]);

  useEffect(() => {
    const handleGlobalMove = (e) => {
      if (!isDraggingRef.current || hasSpun) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const diff = clientX - startXRef.current;
      const progress = Math.min(Math.max(diff / 250, 0), 1);
      setSlideProgress(progress);
      if (progress >= 1) {
        isDraggingRef.current = false;
        triggerSpin();
      }
    };

    const handleGlobalEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (slideProgress < 1 && !hasSpun) setSlideProgress(0);
    };

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalEnd);
    window.addEventListener("touchmove", handleGlobalMove);
    window.addEventListener("touchend", handleGlobalEnd);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalEnd);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalEnd);
    };
  }, [slideProgress, hasSpun]);

  const handleStart = (e) => {
    if (hasSpun || isSpinning) return;
    e.preventDefault();
    isDraggingRef.current = true;
    startXRef.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  // ==================== On-Chain Gacha Flow ====================

  const triggerSpin = async () => {
    if (hasSpun || isSpinning) return;

    setIsSpinning(true);
    setErrorMessage("");
    setSpinProgress(1);
    isDraggingRef.current = false;

    try {
      // Step 1: Authenticate
      setSpinProgress(1);
      console.log("[Gacha] Step 1: Authenticating...");
      const authToken = await getAuthToken();
      const tierId = tierNameToId(tierType);
      const contractTierId = tierId - 1; // Contract is 0-indexed (0,1,2)
      console.log("[Gacha] Step 1 done. tierId:", tierId, "contractTierId:", contractTierId);

      // Step 2: Get backend-signed pricing
      setSpinProgress(2);
      console.log("[Gacha] Step 2: Getting pricing...");
      const pricingData = await getGachaPricing(tierId, authToken);
      console.log("[Gacha] Step 2 done. pricingData:", pricingData);
      const { signature, message, nonce, expiresAt, tierPrice } = pricingData;

      // Decide is_car locally (committed on-chain, backend reveal must match)
      const isCar = Math.random() < (CAR_PROBABILITY[tierId] ?? 0.30);
      console.log("[Gacha] isCar:", isCar, "tierPrice:", tierPrice, "expiresAt:", expiresAt, "nonce:", nonce);

      // Step 3: Commit on-chain — user pays OCT
      setSpinProgress(3);
      console.log("[Gacha] Step 3: Building commit tx...");

      if (!PACKAGE_ID || !CONFIG_ID || !GACHA_STATE_ID || !VAULT_ID) {
        throw new Error(
          "Smart contract not configured. Run initialize-contract.ts and set NEXT_PUBLIC_* env vars."
        );
      }

      const commitHash = crypto.getRandomValues(new Uint8Array(32));
      const sigBytes = hexToUint8(signature);
      const msgBytes = hexToUint8(message);

      const commitTx = new Transaction();
      const [payment] = commitTx.splitCoins(commitTx.gas, [
        commitTx.pure.u64(BigInt(tierPrice)),
      ]);

      commitTx.moveCall({
        target: `${PACKAGE_ID}::gacha::commit`,
        typeArguments: [OCT_TYPE],
        arguments: [
          commitTx.object(GACHA_STATE_ID),         // gacha_state: &mut GachaState<T>
          commitTx.object(CONFIG_ID),               // config: &mut Config
          commitTx.object(VAULT_ID),                // vault: &mut Vault<T>
          commitTx.pure.vector('u8', Array.from(commitHash)), // commit_hash: vector<u8>
          commitTx.pure.bool(isCar),                // is_car: bool
          commitTx.pure.u8(contractTierId),          // tier_id: u8 (0-indexed)
          commitTx.pure.u64(BigInt(tierPrice)),      // tier_price: u64
          commitTx.pure.u64(BigInt(expiresAt)),      // signature_expiry: u64 (seconds)
          commitTx.pure.u64(BigInt(nonce)),          // nonce: u64
          commitTx.pure.vector('u8', Array.from(sigBytes)),  // signature: vector<u8>
          commitTx.pure.vector('u8', Array.from(msgBytes)),  // message: vector<u8>
          payment,                                   // payment: Coin<T>
          commitTx.object(CLOCK_OBJ),               // clock: &Clock
        ],
      });

      console.log("[Gacha] Step 3: Sending commit tx...");
      const commitResult = await signAndExecute({ transaction: commitTx });
      console.log("[Gacha] Step 3 done. commitResult:", commitResult);

      // Step 4: Reveal on-chain — backend signs reveal, user mints NFT
      setSpinProgress(4);
      console.log("[Gacha] Step 4: Getting reveal data...");
      const revealData = await revealGacha(tierId, authToken, isCar);
      console.log("[Gacha] Step 4 revealData:", revealData);

      const {
        signature: revealSig,
        message: revealMsg,
        nonce: revealNonce,
        rarity,
        name,
        brand,
        stats,
        partType,
        slotLimit,
      } = revealData;

      const revealSigBytes = hexToUint8(revealSig);
      const revealMsgBytes = hexToUint8(revealMsg);
      const nameBytes = new TextEncoder().encode(name ?? "");

      // Stat mapping: backend { speed, acceleration, handling, drift }
      //               → contract new_stats(accel, top_speed, grip, hp)
      const accel    = BigInt(stats?.acceleration ?? 0);
      const topSpeed = BigInt(stats?.speed ?? 0);
      const grip     = BigInt(stats?.handling ?? 0);
      const hp       = BigInt(stats?.drift ?? 0);

      const revealTx = new Transaction();

      revealTx.moveCall({
        target: `${PACKAGE_ID}::gacha::reveal`,
        typeArguments: [OCT_TYPE],
        arguments: [
          revealTx.object(GACHA_STATE_ID),          // gacha_state
          revealTx.object(CONFIG_ID),                // config
          revealTx.pure.address(walletAddress),      // player: address
          revealTx.pure.u8(rarity),                  // rarity: u8
          revealTx.pure.vector('u8', Array.from(nameBytes)), // name_bytes: vector<u8>
          revealTx.pure.u8(brand),                   // brand: u8
          revealTx.pure.u8(partType ?? 0),           // part_type: u8 (ignored for cars)
          revealTx.pure.u64(accel),                  // accel: u64
          revealTx.pure.u64(topSpeed),               // top_speed: u64
          revealTx.pure.u64(grip),                   // grip: u64
          revealTx.pure.u64(hp),                     // hp: u64
          revealTx.pure.u8(slotLimit ?? 0),          // slot_limit: u8 (ignored for parts)
          revealTx.pure.u64(BigInt(revealNonce)),    // nonce: u64
          revealTx.pure.vector('u8', Array.from(revealSigBytes)), // signature: vector<u8>
          revealTx.pure.vector('u8', Array.from(revealMsgBytes)), // message: vector<u8>
          revealTx.object(CLOCK_OBJ),               // clock: &Clock
        ],
      });

      await signAndExecute({ transaction: revealTx });

      // Show reward
      const rarityConfig = getRarityConfig(rarity);
      const rewardName = name || (isCar ? "Mystery Car" : "Mystery Part");

      setReward({
        name: rewardName,
        rarity: rarityConfig.label,
        rarityColor: rarityConfig.color,
        image: getAssetImage(rewardName),
        isCar,
      });

      setShowAnimation(true);
      setIsSpinning(false);
    } catch (error) {
      // Extract message from SDK errors that have non-enumerable properties
      const errMsg =
        error?.message ||
        error?.cause?.message ||
        (typeof error === "string" ? error : null) ||
        (String(error) !== "[object Object]" ? String(error) : null) ||
        "Failed to open gacha box. Please try again.";

      console.error("[Gacha] Failed at step", spinProgress);
      console.error("[Gacha] Error message:", errMsg);
      console.error("[Gacha] Error raw:", error);
      try { console.error("[Gacha] Error JSON:", JSON.stringify(error, Object.getOwnPropertyNames(error))); } catch {}

      // Auto-recover: if stuck with pending commit, clear it and notify user
      const isAlreadyCommitted =
        errMsg.includes("MoveAbort") && errMsg.includes(", 1)") ||
        errMsg.toLowerCase().includes("already committed") ||
        errMsg.toLowerCase().includes("dry run");

      if (isAlreadyCommitted && spinProgress === 3) {
        console.log("[Gacha] Detected stuck commit. Attempting auto-clear...");
        try {
          const authToken = await getAuthToken();
          await clearStuckGacha(authToken);
          console.log("[Gacha] Stuck commit cleared! User can try again.");
          toast.info("Previous stuck transaction cleared. Please try again!");
        } catch (clearErr) {
          console.error("[Gacha] Failed to auto-clear:", clearErr);
        }
      }

      setIsSpinning(false);
      setSlideProgress(0);

      const isRejected =
        errMsg.toLowerCase().includes("reject") ||
        errMsg.toLowerCase().includes("cancel") ||
        errMsg.toLowerCase().includes("denied");

      const msg = isRejected ? "Transaction cancelled." : errMsg;
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  // ==================== Token Gacha Flow ====================

  const handleTokenPull = async () => {
    if (tokenPulling || isSpinning) return;
    const tierId = tierNameToId(tierType);
    const cost = TOKEN_COSTS[tierId];
    if (tokenBalance < cost) {
      toast.error(`Not enough tokens. Need ${cost.toLocaleString()}, you have ${tokenBalance.toLocaleString()}.`);
      return;
    }

    setTokenPulling(true);
    setErrorMessage("");
    try {
      const authToken = await getAuthToken();
      const isCar = Math.random() < (CAR_PROBABILITY[tierId] ?? 0.30);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/gacha/pull-with-tokens`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tierId, is_car: isCar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token pull failed");

      const { rarity, name, newTokenBalance } = data.data;
      setTokenBalance(newTokenBalance);

      const rarityConfig = getRarityConfig(rarity);
      const rewardName = name || (isCar ? "Mystery Car" : "Mystery Part");
      setReward({
        name: rewardName,
        rarity: rarityConfig.label,
        rarityColor: rarityConfig.color,
        image: getAssetImage(rewardName),
        isCar,
        paidWithTokens: true,
      });
      setShowAnimation(true);
    } catch (err) {
      const msg = err.message || "Token pull failed";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setTokenPulling(false);
    }
  };

  const handleClaim = () => {
    setHasSpun(false);
    setShowAnimation(false);
    setReward(null);
    setSlideProgress(0);
    setErrorMessage("");
  };

  if (!isConnected) return null;

  const tierConfigs = {
    standard: { title: "STANDARD BOX", icon: "📦", gradient: "from-gray-600 to-gray-700", carImage: "/assets/car_no_background/10-Honda-Civic-removebg-preview.png" },
    rare:     { title: "RARE BOX",     icon: "🎲", gradient: "from-blue-600 to-indigo-700", carImage: "/assets/car_no_background/04-BMW-M3-GTR-removebg-preview.png" },
    premium:  { title: "PREMIUM BOX",  icon: "🎁", gradient: "from-orange-600 to-red-700",  carImage: "/assets/car_no_background/06-Audi-RS-Superwagon-removebg-preview.png" },
    legendary:{ title: "LEGENDARY BOX",icon: "💎", gradient: "from-yellow-500 to-amber-600", carImage: "/assets/car_no_background/02-Bugatti-Chiron-removebg-preview.png" },
  };
  const config = tierConfigs[tierType] || tierConfigs.standard;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-orange-900/30 to-gray-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/view-car-running-high-speed%20(1).jpg')] bg-cover bg-center opacity-20" />

      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto">
        {/* Header */}
        <header className="pt-0 pb-2">
          <PageHeader />
          <div className="flex items-center gap-2 mb-3 px-4">
            <button
              onClick={() => router.push("/gacha")}
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="text-white text-xl">‹</span>
            </button>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-3xl">{config.icon}</span>
              <h1 className="text-2xl font-black text-white">{config.title}</h1>
            </div>
            <p className="text-orange-300 text-xs">Powered by OneChain · Pay OCT · Get NFT</p>
          </div>
        </header>

        {/* Error Message */}
        {errorMessage && (
          <div className="px-4 pb-2">
            <div className="bg-red-500/20 border border-red-500 rounded-xl px-4 py-2">
              <span className="text-red-400 text-sm">⚠️ {errorMessage}</span>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {!hasSpun && !showAnimation ? (
            <div className="w-full max-w-sm mx-auto py-4">
              {/* Car Preview */}
              <div className="relative mb-4">
                <img
                  src={config.carImage}
                  alt="Mystery Car"
                  className={`w-full h-48 object-contain drop-shadow-2xl transition-all duration-300 ${isSpinning ? "animate-spin" : ""}`}
                  style={{ filter: isSpinning ? "blur(8px)" : "none" }}
                />
                <div className="gacha-orbit" aria-hidden="true" />
              </div>

              {/* Pricing Info */}
              {!loadingPricing && pricing && (
                <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-xs font-bold">OCT COST</span>
                    <span className="text-orange-400 font-black text-lg">
                      {pricing.price || pricing.cost || "—"}
                      {pricing.currency ? ` ${pricing.currency}` : ""}
                    </span>
                  </div>
                  {tokenBalance !== null && (
                    <div className="flex items-center justify-between border-t border-gray-700/50 pt-2">
                      <span className="text-gray-400 text-xs font-bold">YOUR TOKENS</span>
                      <span className="text-purple-400 font-black">🪙 {tokenBalance.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Pay with Tokens Button */}
              {tokenBalance !== null && (() => {
                const tierId = tierNameToId(tierType);
                const cost = TOKEN_COSTS[tierId];
                const canAfford = tokenBalance >= cost;
                return (
                  <button
                    onClick={handleTokenPull}
                    disabled={tokenPulling || isSpinning || !canAfford}
                    className={`w-full py-3 rounded-2xl font-bold text-sm mb-4 transition-all flex items-center justify-center gap-2 ${
                      canAfford
                        ? "bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800 text-white shadow-lg shadow-purple-500/30"
                        : "bg-gray-800 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {tokenPulling ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Opening…
                      </>
                    ) : (
                      <>
                        🪙 Pay {cost.toLocaleString()} Tokens
                        {!canAfford && <span className="text-xs ml-1">(Need {(cost - tokenBalance).toLocaleString()} more)</span>}
                      </>
                    )}
                  </button>
                );
              })()}

              {/* Slide to Open */}
              <div className="relative mt-3">
                <p className="text-center text-orange-400 font-bold text-base tracking-wider mb-2">
                  {isSlideReady ? "BOOST READY" : "SLIDE TO OPEN"}
                </p>

                <div className="relative h-14">
                  {/* Track — overflow-hidden hanya untuk fill & arrows */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 rounded-full overflow-hidden shadow-xl gacha-track ${isSlideReady ? "gacha-track-ready" : ""}`}
                  >
                    <div className="gacha-track-fill" style={{ width: `${progressPercent}%` }} />
                    <div className="absolute inset-0 flex items-center justify-end pr-4">
                      <div className="flex gap-1">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="text-black text-2xl font-black" style={{ opacity: 0.3 + i * 0.1 }}>
                            ❯
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Button — di luar overflow-hidden agar tidak terpotong */}
                  <div
                    ref={sliderRef}
                    className={`absolute top-[4px] left-[4px] w-12 h-12 bg-yellow-400 rounded-full shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none ${slideProgress === 0 && !isSpinning ? "gacha-slider-idle" : ""} ${isSlideReady ? "gacha-slider-ready" : ""}`}
                    style={{
                      transform: `translateX(${slideProgress * 250}px)`,
                      transition: isDraggingRef.current ? "none" : "transform 0.3s ease-out",
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
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-50 p-6">
                  <h3 className="text-2xl font-black text-orange-400 mb-6">Opening Gacha Box</h3>
                  <ProgressSteps
                    steps={["Authenticating", "Getting pricing", "Committing on-chain", "Revealing on-chain"]}
                    currentStep={spinProgress}
                    className="w-full max-w-xs"
                  />
                </div>
              )}
            </div>
          ) : showAnimation ? (
            <div className="w-full max-w-4xl flex items-center justify-center">
              <GachaRoulette
                reward={reward}
                availableItems={dummyAssets}
                onComplete={() => {
                  setShowAnimation(false);
                  setHasSpun(true);
                }}
              />
            </div>
          ) : (
            <div className="w-full max-w-sm mx-auto text-center relative overflow-hidden py-4">
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

              <h2 className="text-2xl font-black mb-4 bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent uppercase animate-pulse">
                Congratulations<br />You Got
              </h2>

              <div className="relative mb-4">
                <img
                  src={reward?.image}
                  alt={reward?.name}
                  className="w-full h-48 object-contain drop-shadow-2xl animate-bounce"
                />
              </div>

              <div className={`inline-block bg-gradient-to-r ${reward?.rarityColor} px-6 py-2 rounded-full mb-4`}>
                <p className="text-white font-black text-lg uppercase">{reward?.rarity}</p>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 py-3 mb-2">
                <h3 className="text-white font-black text-xl uppercase tracking-wider">{reward?.name}</h3>
              </div>

              <p className="text-gray-300 text-sm mb-4">
                {reward?.isCar ? "🚗 Car" : "🔧 Spare Part"}
                {reward?.paidWithTokens ? " · Paid with 🪙 Tokens" : " NFT · Minted on OneChain"}
              </p>

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
    </main>
  );
}
