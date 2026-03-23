"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Car, Box, Wrench, Package, Settings,
  CircleDot, Paintbrush, Armchair, ChevronRight
} from "lucide-react";
// Box used as fallback icon for unknown part types
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { PullToRefresh } from "@/components/shared";
import PageHeader from "@/components/shared/PageHeader";
import { RARITY_CONFIG, INVENTORY_FILTERS } from "@/constants";

// Map numeric rarity to string key used in RARITY_CONFIG
const RARITY_MAP = { 0: "common", 1: "rare", 2: "epic", 3: "legendary" };

// Part type icons (0=Wheels, 1=Engine, 2=Body, 3=Shocks — matches backend PartType enum)
const PART_TYPE_ICONS = {
  0: { Icon: CircleDot, label: "Wheels" },
  1: { Icon: Settings, label: "Engine" },
  2: { Icon: Paintbrush, label: "Body" },
  3: { Icon: Armchair, label: "Shocks" },
};

// Brand config
const BRAND_CONFIG = {
  0: { label: "Lamborghini", emoji: "🐂", color: "text-yellow-300" },
  1: { label: "Ferrari",     emoji: "🐎", color: "text-red-400" },
  2: { label: "Ford",        emoji: "🔵", color: "text-blue-300" },
  3: { label: "Chevrolet",   emoji: "🏁", color: "text-orange-300" },
};

// Map car name → image path
const getCarImage = (name = "") => {
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
  return "/assets/car/High Speed.png";
};

export default function InventoryPage() {
  const { isConnected, walletAddress, getAuthToken } = useWallet();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("cars");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const [cars, setCars] = useState([]);
  const [loadingCars, setLoadingCars] = useState(true);

  const [spareParts, setSpareParts] = useState([]);
  const [loadingParts, setLoadingParts] = useState(true);

  const [activeListings, setActiveListings] = useState(new Set());
  const [userInfo, setUserInfo] = useState({ username: null });

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  const fetchUserInfo = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUserInfo({ username: data.data?.username || null });
    } catch {}
  }, [getAuthToken]);

  const fetchCars = useCallback(async () => {
    setLoadingCars(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/cars`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCars(data.data || []);
    } catch (err) {
      console.error("Failed to fetch cars:", err);
      toast.error("Failed to load cars");
    } finally {
      setLoadingCars(false);
    }
  }, [getAuthToken]);

  const fetchSpareParts = useCallback(async () => {
    setLoadingParts(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/spareparts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSpareParts(data.data || []);
    } catch (err) {
      console.error("Failed to fetch spare parts:", err);
    } finally {
      setLoadingParts(false);
    }
  }, [getAuthToken]);

  const fetchActiveListings = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/my-listings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const listed = new Set(
        (data.data || []).filter((l) => l.isActive).map((l) => l.car?.uid || l.sparePart?.uid)
      );
      setActiveListings(listed);
    } catch {}
  }, [getAuthToken]);

  useEffect(() => {
    if (isConnected) {
      fetchUserInfo();
      fetchCars();
      fetchSpareParts();
      fetchActiveListings();
    }
  }, [isConnected, fetchUserInfo, fetchCars, fetchSpareParts, fetchActiveListings]);

  const handleRefresh = async () => {
    await Promise.all([fetchCars(), fetchSpareParts(), fetchActiveListings()]);
  };

  // Filter cars by rarity
  const filteredCars =
    selectedFilter === "all"
      ? cars
      : cars.filter((car) => {
          const rarityStr = typeof car.rarity === "number" ? RARITY_MAP[car.rarity] : car.rarity?.toLowerCase();
          return rarityStr === selectedFilter;
        });


  // Group spare parts by brand → partType
  const partsByBrand = spareParts.reduce((acc, part) => {
    const brand = part.compatibleBrand ?? 0;
    const typeId = part.partType ?? 0;
    if (!acc[brand]) acc[brand] = {};
    if (!acc[brand][typeId]) acc[brand][typeId] = [];
    acc[brand][typeId].push(part);
    return acc;
  }, {});

  if (!isConnected) return null;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-white overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(255,255,255,0.15) 30px, rgba(255,255,255,0.15) 60px),
            repeating-linear-gradient(-45deg, transparent, transparent 30px, rgba(255,255,255,0.15) 30px, rgba(255,255,255,0.15) 60px)
          `,
        }}
      />

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto pb-24">
          {/* Header */}
          <header className="pt-0 pb-4">
            <PageHeader />

            <h1 className="text-4xl font-black text-orange-200 mb-4 px-4">Inventory</h1>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-4 px-4">
              <button
                onClick={() => setActiveTab("cars")}
                className={`flex-1 py-3 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === "cars"
                    ? "bg-white text-orange-600 shadow-lg"
                    : "bg-orange-600/50 text-white hover:bg-orange-600/70"
                }`}
              >
                <Car size={16} strokeWidth={2.5} />
                Cars ({cars.length})
              </button>
              <button
                onClick={() => setActiveTab("parts")}
                className={`flex-1 py-3 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === "parts"
                    ? "bg-white text-orange-600 shadow-lg"
                    : "bg-orange-600/50 text-white hover:bg-orange-600/70"
                }`}
              >
                <Wrench size={16} strokeWidth={2.5} />
                Parts ({spareParts.length})
              </button>
            </div>

            {/* Rarity filter (cars only) */}
            {activeTab === "cars" && (
              <div className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
                {INVENTORY_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFilter(f)}
                    className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap capitalize transition-all ${
                      selectedFilter === f
                        ? "bg-white text-orange-600 shadow-lg scale-105"
                        : "bg-orange-600/50 text-white hover:bg-orange-600/70"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </header>

          {/* Cars Tab */}
          {activeTab === "cars" && (
            <div className="flex-1 px-4 mb-4">
              <div className="bg-orange-700/50 backdrop-blur-sm rounded-3xl p-4 min-h-[300px]">
                {loadingCars ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
                      <p className="text-white/60">Loading cars...</p>
                    </div>
                  </div>
                ) : filteredCars.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {filteredCars.map((car) => {
                      const rarityKey =
                        typeof car.rarity === "number"
                          ? RARITY_MAP[car.rarity]
                          : car.rarity?.toLowerCase() || "common";
                      const rc = RARITY_CONFIG[rarityKey] || RARITY_CONFIG.common;
                      const isListed = activeListings.has(car.uid);

                      return (
                        <div
                          key={car.uid}
                          className={`relative bg-gradient-to-br ${rc.gradient} rounded-2xl p-4 shadow-xl flex flex-col`}
                        >
                          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 z-10">
                            <span className="text-white text-[10px] font-black uppercase">{rc.label}</span>
                          </div>
                          {isListed && (
                            <div className="absolute top-3 right-3 bg-blue-500 rounded-full px-2 py-1 z-10">
                              <span className="text-white text-[10px] font-bold">LISTED</span>
                            </div>
                          )}
                          <div className="aspect-square flex items-center justify-center mb-2 mt-5">
                            <img
                              src={car.imageUrl || getCarImage(car.name)}
                              alt={car.name}
                              className="w-full h-full object-contain drop-shadow-2xl"
                              onError={(e) => { e.target.src = "/assets/car/High Speed.png"; }}
                            />
                          </div>
                          <div className="text-center mb-3 flex-1">
                            <p className="text-white text-sm font-black uppercase truncate">{car.name}</p>
                            <p className="text-white/60 text-xs">UID: {car.uid?.slice(0, 8)}...</p>
                          </div>
                          {car.equippedParts?.length > 0 && (
                            <div className="bg-black/20 rounded-lg px-2 py-1 mb-2 flex items-center justify-center gap-1">
                              <Wrench size={10} className="text-white/70" />
                              <span className="text-white/70 text-[10px]">{car.equippedParts.length} parts equipped</span>
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <button
                              onClick={() => router.push("/marketplace")}
                              disabled={isListed}
                              className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1 disabled:opacity-40"
                            >
                              <ChevronRight size={12} />
                              {isListed ? "Listed" : "Marketplace"}
                            </button>
                            <button
                              onClick={() => router.push("/claim")}
                              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1"
                            >
                              <Package size={12} />
                              Claim Physical
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center px-4">
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Car size={32} className="text-white/40" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-white text-lg font-black mb-2">
                        {selectedFilter === "all" ? "No Cars Yet" : "No Cars Found"}
                      </h3>
                      <p className="text-white/60 text-sm mb-4">
                        {selectedFilter === "all"
                          ? "Open gacha boxes to start your collection!"
                          : "Try a different filter"}
                      </p>
                      {selectedFilter === "all" && (
                        <button
                          onClick={() => router.push("/gacha")}
                          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-orange-900 font-black py-2.5 px-5 rounded-full shadow-lg"
                        >
                          Open Gacha
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spare Parts Tab */}
          {activeTab === "parts" && (
            <div className="flex-1 px-4 mb-4">
              <div className="bg-orange-700/50 backdrop-blur-sm rounded-3xl p-4 min-h-[300px]">
                {loadingParts ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
                      <p className="text-white/60">Loading parts...</p>
                    </div>
                  </div>
                ) : spareParts.length > 0 ? (
                  <div className="space-y-5">
                    {Object.entries(partsByBrand).sort(([a], [b]) => Number(a) - Number(b)).map(([brandId, typeMap]) => {
                      const brand = BRAND_CONFIG[Number(brandId)] || { label: `Brand ${brandId}`, emoji: "🔧", color: "text-white" };
                      const totalCount = Object.values(typeMap).reduce((s, arr) => s + arr.length, 0);

                      return (
                        <div key={brandId} className="bg-black/20 rounded-2xl p-3">
                          {/* Brand header */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">{brand.emoji}</span>
                            <h3 className={`font-black text-sm uppercase tracking-wide ${brand.color}`}>{brand.label}</h3>
                            <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalCount}</span>
                          </div>

                          {/* Part types within brand */}
                          <div className="space-y-3">
                            {Object.entries(typeMap).sort(([a], [b]) => Number(a) - Number(b)).map(([typeId, parts]) => {
                              const typeInfo = PART_TYPE_ICONS[Number(typeId)] || { Icon: Box, label: `Type ${typeId}` };
                              const { Icon, label } = typeInfo;

                              return (
                                <div key={typeId}>
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Icon size={13} className="text-white/70" strokeWidth={2.5} />
                                    <span className="text-white/70 text-xs font-bold">{label}</span>
                                    <span className="text-white/40 text-[10px] ml-auto">{parts.length}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {parts.map((part) => {
                                      const rarityKey =
                                        typeof part.rarity === "number"
                                          ? RARITY_MAP[part.rarity]
                                          : part.rarity?.toLowerCase() || "common";
                                      const rc = RARITY_CONFIG[rarityKey] || RARITY_CONFIG.common;

                                      return (
                                        <div key={part.uid} className={`bg-gradient-to-br ${rc.gradient} rounded-xl p-2.5`}>
                                          <p className="text-white text-[11px] font-black truncate">{part.name}</p>
                                          <p className={`text-[10px] font-bold mt-0.5 ${rc.textColor}`}>{rc.label}</p>
                                          {part.isEquipped && (
                                            <p className="text-yellow-300 text-[9px] font-bold mt-0.5">⚡ Equipped</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center px-4">
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Wrench size={32} className="text-white/40" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-white text-lg font-black mb-2">No Spare Parts</h3>
                      <p className="text-white/60 text-sm mb-4">
                        Open gacha boxes to collect parts!
                      </p>
                      <button
                        onClick={() => router.push("/gacha")}
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 text-orange-900 font-black py-2.5 px-5 rounded-full shadow-lg"
                      >
                        Open Gacha
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>

      <BottomNavigation />
    </main>
  );
}
