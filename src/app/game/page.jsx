"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import {
  Gamepad2, Car, ChevronLeft, ChevronRight, Play,
  Zap, Wind, Gauge, RotateCw, Infinity, Globe,
} from "lucide-react";
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonPicker() {
  return (
    <div
      className="flex-shrink-0 rounded-xl overflow-hidden animate-pulse"
      style={{ width: 60, height: 72, background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.06)" }}
    />
  );
}

// ─── Game Modes ───────────────────────────────────────────────────────────────

const MODES = [
  { id: "endless_3d",     label: "3D Endless", icon: Infinity },
  { id: "multiplayer_3d", label: "3D Multi",   icon: Globe    },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { isConnected, walletAddress, getAuthToken } = useWallet();
  const router = useRouter();
  const iframeRef = useRef(null);
  const pickerRef = useRef(null);
  const pickerDrag = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const onPickerMouseDown = (e) => {
    pickerDrag.current = { active: true, startX: e.pageX - pickerRef.current.offsetLeft, scrollLeft: pickerRef.current.scrollLeft };
    pickerRef.current.style.cursor = "grabbing";
  };
  const onPickerMouseMove = (e) => {
    if (!pickerDrag.current.active) return;
    e.preventDefault();
    const x = e.pageX - pickerRef.current.offsetLeft;
    pickerRef.current.scrollLeft = pickerDrag.current.scrollLeft - (x - pickerDrag.current.startX);
  };
  const onPickerMouseUp = () => {
    pickerDrag.current.active = false;
    if (pickerRef.current) pickerRef.current.style.cursor = "grab";
  };

  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [gameMode, setGameMode] = useState("endless_3d");
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    if (!isConnected) router.push("/");
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

  // Sync 3D viewer when iframe loads
  const handleViewerLoad = () => {
    setViewerReady(true);
    if (selectedCar && iframeRef.current) {
      iframeRef.current.contentWindow.postMessage({ type: "SET_CAR", brand: selectedCar.brand ?? 0, modelUrl: selectedCar.modelUrl || null }, "*");
      iframeRef.current.contentWindow.postMessage({ type: "SET_RARITY", rarity: selectedCar.rarity ?? 0 }, "*");
    }
  };

  // Sync 3D viewer when selected car changes
  useEffect(() => {
    if (!viewerReady || !selectedCar || !iframeRef.current) return;
    iframeRef.current.contentWindow.postMessage({ type: "SET_CAR", brand: selectedCar.brand ?? 0, modelUrl: selectedCar.modelUrl || null }, "*");
    iframeRef.current.contentWindow.postMessage({ type: "SET_RARITY", rarity: selectedCar.rarity ?? 0 }, "*");
  }, [selectedCar, viewerReady]);

  const handleLaunch = async () => {
    if (!selectedCar) {
      toast.error("Pilih mobil terlebih dahulu!");
      return;
    }
    setLaunching(true);
    const token = await getAuthToken();
    localStorage.setItem("wallet_address", walletAddress || "");
    localStorage.setItem("auth_token", token || "");
    localStorage.setItem("game_car_uid", selectedCar.tokenId || selectedCar.uid || selectedCar.id || "");
    localStorage.setItem("game_car_data", JSON.stringify({
      baseSpeed: selectedCar.baseSpeed || 50,
      baseAcceleration: selectedCar.baseAcceleration || 50,
      baseHandling: selectedCar.baseHandling || 50,
      baseDrift: selectedCar.baseDrift || 50,
      name: selectedCar.name || "",
      rarity: selectedCar.rarity || "",
      brand: selectedCar.brand ?? 0,
      modelUrl: selectedCar.modelUrl || null,
    }));
    localStorage.setItem("backend_url", (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000") + "/api");
    localStorage.setItem("game_mode", gameMode);

    if (gameMode === "endless_3d") {
      window.location.href = "/race3d/index.html";
    } else if (gameMode === "multiplayer_3d") {
      window.location.href = "/race3d/multiplayer.html";
    } else {
      window.location.href = "/game/index.html";
    }
  };

  if (!isConnected) return null;

  const speedLineBg = {
    background: "#080a0f",
    backgroundImage:
      "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.018) 40px, rgba(255,255,255,0.018) 41px)",
  };

  const launchLabel = launching
    ? "Starting..."
    : gameMode === "endless_3d" ? "3D ENDLESS"
    : gameMode === "multiplayer_3d" ? "3D MULTIPLAYER"
    : gameMode === "vs_ai" ? "RACE VS AI"
    : "START RACE";

  return (
    <main
      className="relative text-white flex flex-col"
      style={{ ...speedLineBg, height: "100dvh", overflow: "hidden" }}
    >

      {/* ── Header ── */}
      <header
        className="flex-shrink-0 z-20 px-4 py-3"
        style={{
          background: "rgba(8,10,15,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(251,146,60,0.15)",
        }}
      >
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <ChevronLeft size={18} className="text-gray-300" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Gamepad2 size={18} className="text-orange-400" />
            <span className="text-sm font-black text-white tracking-widest uppercase">Garage</span>
          </div>
        </div>
      </header>

      {/* ── Mode Bar ── */}
      <div className="flex-shrink-0 max-w-md mx-auto w-full">
        <div className="flex gap-2 px-4 pt-2 pb-1" style={{ scrollbarWidth: "none" }}>
          {MODES.map(({ id, label, icon: Icon }) => {
            const active = gameMode === id;
            return (
              <button
                key={id}
                onClick={() => setGameMode(id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all active:scale-95"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  background: active ? "linear-gradient(135deg, #f97316, #ef4444)" : "rgba(255,255,255,0.05)",
                  border: active ? "1px solid transparent" : "1px solid rgba(255,255,255,0.10)",
                  color: active ? "#fff" : "#9ca3af",
                  boxShadow: active ? "0 0 16px rgba(249,115,22,0.4)" : "none",
                }}
              >
                <Icon size={11} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        /* ── Loading ── */
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 gap-3 pt-3">
          <div className="flex-1 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          <div style={{ height: 72, background: "rgba(255,255,255,0.04)", borderRadius: 16 }} className="animate-pulse flex-shrink-0" />
          <div className="flex gap-2 flex-shrink-0">
            {[...Array(3)].map((_, i) => <SkeletonPicker key={i} />)}
          </div>
          <div style={{ height: 48, background: "rgba(255,255,255,0.04)", borderRadius: 16 }} className="animate-pulse flex-shrink-0 mb-3" />
        </div>

      ) : cars.length === 0 ? (
        /* ── Empty State ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, rgba(251,146,60,0.10) 0%, transparent 70%)",
              border: "1px solid rgba(251,146,60,0.15)",
            }}
          >
            <Car size={38} style={{ color: "rgba(251,146,60,0.4)" }} />
          </div>
          <h3 className="text-white font-black text-lg">No Cars Yet</h3>
          <p className="text-gray-500 text-sm text-center">Pull from gacha to get your first racer!</p>
          <button
            onClick={() => router.push("/gacha")}
            className="flex items-center gap-2 font-bold py-3 px-8 rounded-full text-sm transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #f97316, #ef4444)",
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
          {/* ── 3D Viewer — flex-1 fills remaining space ── */}
          <div className="relative overflow-hidden flex-1">
            {!viewerReady && (
              <div
                className="absolute inset-0 animate-pulse flex items-center justify-center"
                style={{ background: "#0a0c14", zIndex: 1 }}
              >
                <div className="w-8 h-8 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
              </div>
            )}

            <iframe
              ref={iframeRef}
              src="/garage-viewer.html"
              onLoad={handleViewerLoad}
              allowTransparency="true"
              style={{ border: "none", width: "100%", height: "100%", display: "block", background: "transparent" }}
            />

            {/* Bottom fade */}
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-none"
              style={{ height: 60, background: "linear-gradient(to bottom, transparent 0%, #080a0f 100%)" }}
            />

            {/* Rarity badge top-left */}
            {selectedCar && (
              <div className="absolute top-3 left-3 z-10 pointer-events-none">
                <span
                  className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{
                    background: getRarityBadgeBg(selectedCar.rarity),
                    border: `1px solid ${getRarityBadgeBorder(selectedCar.rarity)}`,
                    color: getRarityTextColor(selectedCar.rarity),
                    backdropFilter: "blur(8px)",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                  }}
                >
                  {getRarityLabel(selectedCar.rarity)}
                </span>
              </div>
            )}

            {/* Stats overlay — right side of viewer */}
            {selectedCar && (
              <div
                className="absolute right-3 z-10 flex flex-col gap-1.5"
                style={{ top: "50%", transform: "translateY(-50%)" }}
              >
                {[
                  { icon: Gauge,    label: "SPD", value: selectedCar.baseSpeed },
                  { icon: Zap,      label: "ACC", value: selectedCar.baseAcceleration },
                  { icon: Wind,     label: "HND", value: selectedCar.baseHandling },
                  { icon: RotateCw, label: "DFT", value: selectedCar.baseDrift },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center rounded-xl px-2 py-1.5"
                    style={{
                      background: "rgba(8,10,15,0.72)",
                      border: `1px solid ${getRarityBadgeBorder(selectedCar.rarity)}`,
                      backdropFilter: "blur(10px)",
                      minWidth: 44,
                    }}
                  >
                    <Icon size={11} style={{ color: getRarityTextColor(selectedCar.rarity) }} />
                    <span className="font-black mt-0.5" style={{ fontSize: 13, color: "#fff", lineHeight: 1 }}>
                      {Math.round(Number(value) || 0)}
                    </span>
                    <span className="uppercase tracking-widest" style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Bottom panel — fixed height, no scroll ── */}
          <div className="flex-shrink-0 max-w-md mx-auto w-full px-4 pb-3">

            {/* Car name */}
            {selectedCar && (
              <h2
                className="font-black tracking-wide leading-tight mb-2"
                style={{
                  fontSize: 16,
                  backgroundImage: `linear-gradient(90deg, #fff 40%, ${getRarityTextColor(selectedCar.rarity)} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {selectedCar.name || `Car #${selectedCar.tokenId || selectedCar.id}`}
              </h2>
            )}

            {/* Car Picker */}
            <div className="relative flex items-center mb-2">
              {cars.length > 3 && (
                <button
                  onClick={() => pickerRef.current?.scrollBy({ left: -220, behavior: "smooth" })}
                  className="flex-shrink-0 z-10 flex items-center justify-center rounded-full transition-all active:scale-90"
                  style={{ width: 28, height: 28, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", marginRight: 4 }}
                >
                  <ChevronLeft size={16} color="white" />
                </button>
              )}
              <div
                ref={pickerRef}
                className="flex gap-3 overflow-x-auto flex-1 select-none"
                style={{ scrollbarWidth: "none", cursor: "grab" }}
                onMouseDown={onPickerMouseDown}
                onMouseMove={onPickerMouseMove}
                onMouseUp={onPickerMouseUp}
                onMouseLeave={onPickerMouseUp}
              >
              {cars.map((car, idx) => {
                const isSelected = selectedCar === car;
                return (
                  <button
                    key={car.tokenId || car.uid || car.id || idx}
                    onClick={() => setSelectedCar(car)}
                    className="flex-shrink-0 flex flex-col items-center rounded-xl overflow-hidden transition-all active:scale-95"
                    style={{
                      width: 100,
                      background: isSelected ? getRarityBadgeBg(car.rarity) : "rgba(255,255,255,0.04)",
                      border: `2px solid ${isSelected ? getRarityBadgeBorder(car.rarity) : "rgba(255,255,255,0.08)"}`,
                      boxShadow: isSelected ? getRarityGlow(car.rarity) : "none",
                      padding: 0,
                    }}
                  >
                    <div className={`w-full bg-gradient-to-r ${getRarityColor(car.rarity)}`} style={{ height: 2 }} />
                    <div className="flex flex-col items-center gap-0.5 px-1 py-1.5 w-full">
                      {(() => {
                        const imgSrc = car.imageUrl || car.image || getCarImageByName(car.name);
                        return imgSrc ? (
                          <img src={imgSrc} alt={car.name || "Car"} className="object-contain" style={{ width: 80, height: 72 }} onError={(e) => { e.target.style.display = "none"; }} />
                        ) : (
                          <div className="flex items-center justify-center" style={{ width: 80, height: 72 }}>
                            <Car size={18} style={{ color: getRarityTextColor(car.rarity) }} />
                          </div>
                        );
                      })()}
                      <span className="text-white text-center font-bold leading-tight w-full" style={{ fontSize: 8 }}>
                        {(car.name || `Car #${idx + 1}`).slice(0, 10)}{(car.name || `Car #${idx + 1}`).length > 10 ? "…" : ""}
                      </span>
                    </div>
                  </button>
                );
              })}
              </div>
              {cars.length > 3 && (
                <button
                  onClick={() => pickerRef.current?.scrollBy({ left: 220, behavior: "smooth" })}
                  className="flex-shrink-0 z-10 flex items-center justify-center rounded-full transition-all active:scale-90"
                  style={{ width: 28, height: 28, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", marginLeft: 4 }}
                >
                  <ChevronRight size={16} color="white" />
                </button>
              )}
            </div>

            {/* Launch Button */}
            <button
              onClick={handleLaunch}
              disabled={!selectedCar || launching}
              className="w-full flex items-center justify-center gap-2 font-black rounded-xl transition-all active:scale-95 disabled:opacity-50"
              style={{
                height: 50,
                fontSize: 15,
                letterSpacing: "0.10em",
                background: launching ? "linear-gradient(135deg, #6b7280, #4b5563)" : "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
                boxShadow: launching ? "none" : "0 0 30px rgba(249,115,22,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
                color: "#fff",
              }}
            >
              <Play size={16} fill="white" />
              {launchLabel}
            </button>
          </div>
        </>
      )}

    </main>
  );
}
