"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { Gamepad2, Car, ChevronLeft, Play, CheckCircle2, Zap, Wind, Gauge, RotateCw } from "lucide-react";
import { toast } from "sonner";

// ─── Car image fallback by name ───────────────────────────────────────────────

function getCarImageByName(name = "") {
  const n = name.toLowerCase();
  if (n.includes("porsche 911 turbo")) return "/assets/car_no_background/01-Porche-911-Turbo-removebg-preview.png";
  if (n.includes("bugatti")) return "/assets/car_no_background/02-Bugatti-Chiron-removebg-preview.png";
  if (n.includes("jesko") || n.includes("koenigsegg")) return "/assets/car_no_background/03-Koenigsegg_Jesko-removebg-preview.png";
  if (n.includes("bmw m3")) return "/assets/car_no_background/04-BMW-M3-GTR-removebg-preview.png";
  if (n.includes("huracan") || n.includes("lamborghini")) return "/assets/car_no_background/05-Lamborghini-Huracan-removebg-preview.png";
  if (n.includes("audi")) return "/assets/car_no_background/06-Audi-RS-Superwagon-removebg-preview.png";
  if (n.includes("ferrari f8")) return "/assets/car_no_background/07-Ferrari-F8-Turbo-removebg-preview.png";
  if (n.includes("pagani") || n.includes("huayra")) return "/assets/car_no_background/08-Pagain-Huayra-removebg-preview.png";
  if (n.includes("mercedes amg gt")) return "/assets/car_no_background/11-Mercedes-AMG-GT-removebg-preview.png";
  if (n.includes("mercedes")) return "/assets/car_no_background/09-Mercede-AMG-removebg-preview.png";
  if (n.includes("civic") || n.includes("honda")) return "/assets/car_no_background/10-Honda-Civic-removebg-preview.png";
  if (n.includes("corolla") || n.includes("toyota")) return "/assets/car_no_background/12-Toyota-Corrola-removebg-preview.png";
  if (n.includes("porsche 911")) return "/assets/car_no_background/13-Proche-911-removebg-preview.png";
  if (n.includes("720s") || n.includes("mclaren")) return "/assets/car_no_background/14-McLAREN-720s-removebg-preview.png";
  return null;
}

// ─── Rarity helpers ───────────────────────────────────────────────────────────

function getRarityLabel(rarity) {
  const r = typeof rarity === "number" ? rarity : parseInt(rarity, 10);
  if (r === 3) return "Legendary";
  if (r === 2) return "Epic";
  if (r === 1) return "Rare";
  return "Common";
}

function getRarityColor(rarity) {
  const r = typeof rarity === "number" ? rarity : parseInt(rarity, 10);
  if (r === 3) return "from-yellow-400 to-orange-500";
  if (r === 2) return "from-purple-500 to-pink-500";
  if (r === 1) return "from-blue-500 to-cyan-400";
  return "from-gray-400 to-gray-500";
}

function getRarityGlow(rarity) {
  const r = typeof rarity === "number" ? rarity : parseInt(rarity, 10);
  if (r === 3) return "0 0 40px 8px rgba(245,158,11,0.45), 0 0 80px 20px rgba(249,115,22,0.20)";
  if (r === 2) return "0 0 40px 8px rgba(168,85,247,0.45), 0 0 80px 20px rgba(236,72,153,0.20)";
  if (r === 1) return "0 0 40px 8px rgba(59,130,246,0.45), 0 0 80px 20px rgba(6,182,212,0.20)";
  return "0 0 30px 6px rgba(107,114,128,0.35), 0 0 60px 15px rgba(156,163,175,0.12)";
}

function getRarityBadgeBg(rarity) {
  const r = typeof rarity === "number" ? rarity : parseInt(rarity, 10);
  if (r === 3) return "rgba(245,158,11,0.18)";
  if (r === 2) return "rgba(168,85,247,0.18)";
  if (r === 1) return "rgba(59,130,246,0.18)";
  return "rgba(107,114,128,0.18)";
}

function getRarityBadgeBorder(rarity) {
  const r = typeof rarity === "number" ? rarity : parseInt(rarity, 10);
  if (r === 3) return "rgba(245,158,11,0.55)";
  if (r === 2) return "rgba(168,85,247,0.55)";
  if (r === 1) return "rgba(59,130,246,0.55)";
  return "rgba(107,114,128,0.45)";
}

function getRarityTextColor(rarity) {
  const r = typeof rarity === "number" ? rarity : parseInt(rarity, 10);
  if (r === 3) return "#fbbf24";
  if (r === 2) return "#c084fc";
  if (r === 1) return "#60a5fa";
  return "#9ca3af";
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────

function StatBar({ icon: Icon, label, value, rarity }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} style={{ color: getRarityTextColor(rarity), flexShrink: 0 }} />
      <span className="text-gray-400 text-xs w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getRarityColor(rarity)} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold w-7 text-right" style={{ color: getRarityTextColor(rarity) }}>
        {pct}
      </span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="h-1.5 w-full" style={{ background: "rgba(255,255,255,0.08)" }} />
      <div className="p-3 flex flex-col items-center gap-2">
        <div className="w-16 h-12 rounded-lg" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="w-20 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="w-12 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { isConnected, walletAddress, getAuthToken } = useWallet();
  const router = useRouter();
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [gameMode, setGameMode] = useState("multiplayer");

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/cars`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch inventory");
      const data = await res.json();
      const carList = data.data || data.items || data.cars || [];
      setCars(Array.isArray(carList) ? carList : []);
      if (carList.length > 0) setSelectedCar(carList[0]);
    } catch (err) {
      console.error("Inventory fetch error:", err);
      toast.error("Gagal memuat mobil. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    if (isConnected) fetchInventory();
  }, [isConnected, fetchInventory]);

  const handleLaunch = () => {
    if (!selectedCar) {
      toast.error("Pilih mobil terlebih dahulu!");
      return;
    }
    setLaunching(true);

    localStorage.setItem("wallet_address", walletAddress || "");
    localStorage.setItem("game_car_uid", selectedCar.tokenId || selectedCar.uid || selectedCar.id || "");
    localStorage.setItem(
      "backend_url",
      (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001") + "/api"
    );
    localStorage.setItem("game_mode", gameMode); // "multiplayer" or "vs_ai"

    window.location.href = "/game/index.html";
  };

  if (!isConnected) return null;

  // Speed-line diagonal background pattern
  const speedLineBg = {
    background: "#080a0f",
    backgroundImage:
      "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.018) 40px, rgba(255,255,255,0.018) 41px)",
  };

  return (
    <main className="relative min-h-screen text-white" style={speedLineBg}>
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 px-4 py-3"
        style={{
          background: "rgba(8,10,15,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(251,146,60,0.18)",
        }}
      >
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            <ChevronLeft size={18} className="text-gray-300" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Gamepad2 size={20} className="text-orange-400" />
            <span className="text-base font-black text-white tracking-wide">OneChain Racing</span>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-8 pb-32">

        {/* ── Page Title ── */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-black tracking-widest uppercase mb-2"
            style={{
              letterSpacing: "0.18em",
              background: "linear-gradient(90deg, #fff 30%, #fb923c 70%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Select Your Racer
          </h1>
          <p className="text-gray-500 text-sm tracking-wide">Choose your machine and hit the track</p>
          {/* decorative line */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px flex-1 max-w-16" style={{ background: "linear-gradient(90deg, transparent, rgba(251,146,60,0.4))" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <div className="h-px flex-1 max-w-16" style={{ background: "linear-gradient(90deg, rgba(251,146,60,0.4), transparent)" }} />
          </div>
        </div>

        {loading ? (
          /* ── Loading State ── */
          <div className="space-y-6">
            {/* Featured skeleton */}
            <div
              className="rounded-3xl overflow-hidden animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", height: 320 }}
            />
            {/* Picker skeleton */}
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>

        ) : cars.length === 0 ? (
          /* ── Empty State ── */
          <div
            className="flex flex-col items-center justify-center py-20 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{
                background: "radial-gradient(circle, rgba(251,146,60,0.12) 0%, rgba(251,146,60,0.02) 70%)",
                border: "1px solid rgba(251,146,60,0.2)",
              }}
            >
              <Car size={44} style={{ color: "rgba(251,146,60,0.5)" }} />
            </div>
            <h3 className="text-white font-black text-xl mb-2">No Cars Yet</h3>
            <p className="text-gray-500 text-sm mb-6 text-center max-w-48">
              Your garage is empty. Pull from gacha to get your first racer!
            </p>
            <button
              onClick={() => router.push("/gacha")}
              className="flex items-center gap-2 font-bold py-3 px-8 rounded-full text-sm transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #fb923c, #ef4444)",
                boxShadow: "0 0 24px rgba(251,146,60,0.35)",
                color: "#fff",
              }}
            >
              <Zap size={16} />
              Open Gacha
            </button>
          </div>

        ) : (
          <>
            {/* Mode selector */}
            <div className="flex gap-2 mb-4 justify-center">
              <button
                onClick={() => setGameMode("multiplayer")}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${gameMode === "multiplayer"
                    ? "bg-orange-500 text-black"
                    : "bg-gray-800 text-gray-400 border border-gray-700"
                  }`}
              >
                👥 Multiplayer
              </button>
              <button
                onClick={() => setGameMode("vs_ai")}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${gameMode === "vs_ai"
                    ? "bg-orange-500 text-black"
                    : "bg-gray-800 text-gray-400 border border-gray-700"
                  }`}
              >
                🤖 VS AI
              </button>
            </div>

            {/* ── Featured Selected Car ── */}
            {selectedCar && (
              <div
                className="relative rounded-3xl overflow-hidden mb-6"
                style={{
                  background: `linear-gradient(145deg, rgba(20,22,30,0.95) 0%, rgba(12,14,20,0.98) 100%)`,
                  border: `1px solid ${getRarityBadgeBorder(selectedCar.rarity)}`,
                  boxShadow: getRarityGlow(selectedCar.rarity),
                }}
              >
                {/* Top gradient accent strip */}
                <div
                  className={`h-1 w-full bg-gradient-to-r ${getRarityColor(selectedCar.rarity)}`}
                />

                {/* Background radial glow behind car */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 50% 40%, ${getRarityBadgeBg(selectedCar.rarity)} 0%, transparent 70%)`,
                  }}
                />

                <div className="relative px-6 pt-6 pb-5">
                  {/* Rarity badge */}
                  <div className="flex justify-between items-start mb-4">
                    <span
                      className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
                      style={{
                        background: getRarityBadgeBg(selectedCar.rarity),
                        border: `1px solid ${getRarityBadgeBorder(selectedCar.rarity)}`,
                        color: getRarityTextColor(selectedCar.rarity),
                        letterSpacing: "0.15em",
                      }}
                    >
                      {getRarityLabel(selectedCar.rarity)}
                    </span>
                    {selectedCar.series && (
                      <span className="text-xs text-gray-600 font-medium">{selectedCar.series}</span>
                    )}
                  </div>

                  {/* Car Image */}
                  <div className="flex items-center justify-center h-44 mb-4">
                    {(() => {
                      const imgSrc = selectedCar.imageUrl || selectedCar.image || getCarImageByName(selectedCar.name);
                      return imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={selectedCar.name || "Car"}
                          className="h-full w-full object-contain drop-shadow-2xl"
                          style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.6))" }}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 opacity-40">
                          <Car size={80} className="text-white" />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Car Name */}
                  <h2
                    className="text-2xl font-black text-center mb-5 tracking-wide"
                    style={{
                      backgroundImage: `linear-gradient(90deg, #fff 40%, ${getRarityTextColor(selectedCar.rarity)} 100%)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {selectedCar.name || `Car #${selectedCar.tokenId || selectedCar.id}`}
                  </h2>

                  {/* Stat Bars */}
                  <div
                    className="space-y-3 rounded-2xl p-4"
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <StatBar icon={Gauge} label="Speed" value={selectedCar.baseSpeed} rarity={selectedCar.rarity} />
                    <StatBar icon={Zap} label="Accel" value={selectedCar.baseAcceleration} rarity={selectedCar.rarity} />
                    <StatBar icon={Wind} label="Handling" value={selectedCar.baseHandling} rarity={selectedCar.rarity} />
                    <StatBar icon={RotateCw} label="Drift" value={selectedCar.baseDrift} rarity={selectedCar.rarity} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Horizontal Scroll Car Picker ── */}
            <div className="mb-2">
              <p className="text-gray-600 text-xs uppercase tracking-widest font-bold mb-3">Your Garage</p>
              <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                {cars.map((car, idx) => {
                  const isSelected = selectedCar === car;
                  return (
                    <button
                      key={car.tokenId || car.uid || car.id || idx}
                      onClick={() => setSelectedCar(car)}
                      className="flex-shrink-0 flex flex-col items-center rounded-2xl overflow-hidden transition-all active:scale-95"
                      style={{
                        width: 80,
                        background: isSelected
                          ? "rgba(251,146,60,0.10)"
                          : "rgba(255,255,255,0.04)",
                        border: isSelected
                          ? "2px solid #fb923c"
                          : "2px solid rgba(255,255,255,0.08)",
                        boxShadow: isSelected
                          ? "0 0 18px rgba(251,146,60,0.30)"
                          : "none",
                        padding: 0,
                      }}
                    >
                      {/* Rarity strip */}
                      <div className={`h-1 w-full bg-gradient-to-r ${getRarityColor(car.rarity)}`} />

                      <div className="flex flex-col items-center gap-1 px-2 py-2 w-full">
                        {/* Car image or icon */}
                        {(() => {
                          const imgSrc = car.imageUrl || car.image || getCarImageByName(car.name);
                          return imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={car.name || "Car"}
                              className="w-12 h-10 object-contain"
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-12 h-10 flex items-center justify-center">
                              <Car size={24} style={{ color: getRarityTextColor(car.rarity) }} />
                            </div>
                          );
                        })()}

                        <span className="text-white text-center font-bold leading-tight" style={{ fontSize: 9 }}>
                          {(car.name || `Car #${idx + 1}`).slice(0, 12)}
                          {(car.name || `Car #${idx + 1}`).length > 12 ? "…" : ""}
                        </span>

                        {/* Selected checkmark */}
                        {isSelected && (
                          <CheckCircle2 size={14} className="text-orange-400 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Launch Button ── */}
            <button
              onClick={handleLaunch}
              disabled={!selectedCar || launching}
              className="mt-6 w-full flex items-center justify-center gap-3 font-black text-lg py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: launching
                  ? "linear-gradient(135deg, #6b7280, #4b5563)"
                  : "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
                boxShadow: launching
                  ? "none"
                  : "0 0 32px rgba(249,115,22,0.45), 0 4px 24px rgba(239,68,68,0.30), inset 0 1px 0 rgba(255,255,255,0.15)",
                color: "#fff",
                letterSpacing: "0.06em",
              }}
            >
              <Play size={22} fill="white" />
              {launching ? "Starting Race..." : gameMode === "vs_ai" ? "🤖 RACE VS AI" : "🏁 START RACE"}
            </button>
          </>
        )}
      </div>

      <BottomNavigation />
    </main>
  );
}
