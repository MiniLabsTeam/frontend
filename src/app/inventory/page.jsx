"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import NetworkModal from "@/components/shared/NetworkModal";

// Rarity color mapping
const rarityColorMap = {
  common: "from-gray-500 to-gray-600",
  rare: "from-blue-500 to-cyan-500",
  epic: "from-purple-500 to-pink-500",
  legendary: "from-yellow-500 to-orange-500",
};

// Fragment type icons
const fragmentIcons = {
  0: "🚗", // Chassis
  1: "🛞", // Wheels
  2: "⚙️", // Engine
  3: "🎨", // Body
  4: "💺", // Interior
};

export default function InventoryPage() {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const router = useRouter();
  useWallet(); // Keep hook for context

  const [mockIDRXBalance, setMockIDRXBalance] = useState(0);
  const [loadingMockIDRX, setLoadingMockIDRX] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  // Cars state
  const [selectedFilter, setSelectedFilter] = useState("semua");
  const [inventoryData, setInventoryData] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Fragments state
  const [fragmentsData, setFragmentsData] = useState([]);
  const [loadingFragments, setLoadingFragments] = useState(true);
  const [assembling, setAssembling] = useState(false);
  const [assemblyResult, setAssemblyResult] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("cars"); // "cars" or "fragments"

  const filters = ["semua", "legendary", "epic", "rare", "common"];

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Fetch MockIDRX balance from backend
  useEffect(() => {
    if (authenticated) {
      fetchMockIDRXBalance();
    }
  }, [authenticated]);

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

  // Fetch cars inventory
  const fetchInventory = async () => {
    try {
      setLoadingInventory(true);
      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/cars`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const data = await response.json();

      const transformedCars = data.cars.map(car => ({
        id: car.tokenId,
        tokenId: car.tokenId,
        name: car.modelName?.toUpperCase() || "UNKNOWN",
        modelName: car.modelName || "Unknown",
        series: car.series || "Unknown",
        rarity: car.rarity || "common",
        rarityColor: rarityColorMap[car.rarity] || "from-gray-500 to-gray-600",
        image: `/assets/car/${car.modelName}.png`,
        mintTxHash: car.mintTxHash,
        isRedeemed: car.isRedeemed,
      }));

      setInventoryData(transformedCars);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      setInventoryData([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  // Fetch fragments inventory
  const fetchFragments = async () => {
    try {
      setLoadingFragments(true);
      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/fragments`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch fragments");
      }

      const data = await response.json();
      setFragmentsData(data.inventory || []);
    } catch (error) {
      console.error("Failed to fetch fragments:", error);
      setFragmentsData([]);
    } finally {
      setLoadingFragments(false);
    }
  };

  // Fetch data when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchInventory();
      fetchFragments();
    }
  }, [authenticated]);

  // Filter inventory based on selected filter
  const filteredInventory = selectedFilter === "semua"
    ? inventoryData
    : inventoryData.filter(
        (car) => car.rarity?.toLowerCase() === selectedFilter.toLowerCase()
      );

  // Handle assembly
  const handleAssemble = async (brand) => {
    if (assembling) return;

    try {
      setAssembling(true);
      setAssemblyResult(null);

      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/assembly/forge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ brand }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Assembly failed");
      }

      setAssemblyResult({
        success: true,
        car: data.car,
        message: data.message,
      });

      // Refresh data
      await Promise.all([fetchInventory(), fetchFragments()]);
    } catch (error) {
      console.error("Assembly failed:", error);
      setAssemblyResult({
        success: false,
        message: error.message || "Assembly failed. Please try again.",
      });
    } finally {
      setAssembling(false);
    }
  };

  if (!ready || !authenticated) {
    return null;
  }

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
          <div className="flex items-center justify-end gap-2 mb-4">
            {/* MockIDRX Balance Badge */}
            <div className="flex items-center gap-1.5 bg-yellow-400 rounded-full px-3 py-1.5 shadow-lg">
              <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-yellow-300 font-black text-xs">
                💰
              </div>
              <span className="font-black text-sm text-orange-900">
                {loadingMockIDRX ? "..." : Math.floor(mockIDRXBalance).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-orange-900 opacity-80">IDRX</span>
            </div>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img
              src="/assets/icons/logo2.png"
              alt="Hot Wheels"
              className="h-16 object-contain drop-shadow-2xl"
            />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-black text-orange-200 mb-4">Inventory</h1>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("cars")}
              className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${
                activeTab === "cars"
                  ? "bg-white text-orange-600 shadow-lg"
                  : "bg-orange-600/50 text-white hover:bg-orange-600/70"
              }`}
            >
              🚗 Cars ({inventoryData.length})
            </button>
            <button
              onClick={() => setActiveTab("fragments")}
              className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${
                activeTab === "fragments"
                  ? "bg-white text-orange-600 shadow-lg"
                  : "bg-orange-600/50 text-white hover:bg-orange-600/70"
              }`}
            >
              🧩 Fragments ({fragmentsData.reduce((sum, b) => sum + b.totalParts, 0)})
            </button>
          </div>

          {/* Filter Tabs (only for cars) */}
          {activeTab === "cars" && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                    selectedFilter === filter
                      ? "bg-white text-orange-600 shadow-lg scale-105"
                      : "bg-orange-600/50 text-white hover:bg-orange-600/70"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Cars Section */}
        {activeTab === "cars" && (
          <div className="flex-1 px-4 mb-4">
            <div className="bg-orange-700/50 backdrop-blur-sm rounded-3xl p-4 min-h-[300px]">
              {loadingInventory ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/60">Memuat inventory...</p>
                  </div>
                </div>
              ) : filteredInventory.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {filteredInventory.map((car) => (
                    <div
                      key={car.id}
                      className={`relative bg-gradient-to-br ${car.rarityColor} rounded-2xl p-3 shadow-xl`}
                    >
                      {/* Rarity Badge */}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 z-10">
                        <span className="text-white text-[10px] font-black uppercase">
                          {car.rarity}
                        </span>
                      </div>

                      {/* Token ID Badge */}
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 z-10">
                        <span className="text-white text-[10px] font-bold">
                          #{car.tokenId}
                        </span>
                      </div>

                      {/* Car Image */}
                      <div className="aspect-square flex items-center justify-center mb-2">
                        <img
                          src={car.image}
                          alt={car.name}
                          className="w-full h-full object-contain drop-shadow-2xl"
                          onError={(e) => {
                            e.target.src = "/assets/car/placeholder.png";
                          }}
                        />
                      </div>

                      {/* Car Info */}
                      <div className="text-center px-1">
                        <p className="text-white text-xs font-black uppercase truncate">
                          {car.modelName}
                        </p>
                        <p className="text-white/70 text-[10px] font-semibold truncate">
                          {car.series}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center">
                    <p className="text-white/60 text-lg font-bold mb-2">
                      {selectedFilter === "semua"
                        ? "Inventory Kosong"
                        : "Tidak ada mobil di kategori ini"}
                    </p>
                    <p className="text-white/40 text-sm">
                      {selectedFilter === "semua"
                        ? "Buka gacha box untuk mendapatkan mobil!"
                        : "Coba filter lain atau buka gacha box"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fragments Section */}
        {activeTab === "fragments" && (
          <div className="flex-1 px-4 mb-4">
            <div className="bg-orange-700/50 backdrop-blur-sm rounded-3xl p-4 min-h-[300px]">
              {loadingFragments ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/60">Memuat fragments...</p>
                  </div>
                </div>
              ) : fragmentsData.length > 0 ? (
                <div className="space-y-4">
                  {fragmentsData.map((brandData) => (
                    <div
                      key={brandData.brand}
                      className={`bg-gradient-to-br ${rarityColorMap[brandData.rarity] || "from-gray-500 to-gray-600"} rounded-2xl p-4 shadow-xl`}
                    >
                      {/* Brand Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-white font-black text-lg">{brandData.brand}</h3>
                          <p className="text-white/70 text-xs">{brandData.series}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            brandData.canAssemble
                              ? "bg-green-500 text-white"
                              : "bg-black/40 text-white/70"
                          }`}>
                            {brandData.canAssemble ? "READY!" : `${brandData.fragments.length}/5`}
                          </span>
                        </div>
                      </div>

                      {/* Fragment Progress */}
                      <div className="grid grid-cols-5 gap-2 mb-3">
                        {[0, 1, 2, 3, 4].map((typeId) => {
                          const fragment = brandData.fragments.find(f => f.typeId === typeId);
                          const hasFragment = fragment && fragment.count > 0;
                          const typeNames = ["Chassis", "Wheels", "Engine", "Body", "Interior"];

                          return (
                            <div
                              key={typeId}
                              className={`flex flex-col items-center p-2 rounded-xl ${
                                hasFragment
                                  ? "bg-white/30"
                                  : "bg-black/30"
                              }`}
                            >
                              <span className="text-2xl mb-1">
                                {fragmentIcons[typeId]}
                              </span>
                              <span className="text-[8px] font-bold text-white/80">
                                {typeNames[typeId]}
                              </span>
                              {hasFragment && (
                                <span className="text-[10px] font-black text-yellow-300">
                                  x{fragment.count}
                                </span>
                              )}
                              {!hasFragment && (
                                <span className="text-[10px] font-bold text-white/40">
                                  -
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Assembly Button */}
                      {brandData.canAssemble && (
                        <button
                          onClick={() => handleAssemble(brandData.brand)}
                          disabled={assembling}
                          className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-400 disabled:to-gray-500 text-orange-900 font-black py-3 rounded-full shadow-lg transform hover:scale-105 transition-all"
                        >
                          {assembling ? "Assembling..." : `🔧 Assemble ${brandData.brand}`}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center">
                    <p className="text-white/60 text-lg font-bold mb-2">
                      Belum Ada Fragments
                    </p>
                    <p className="text-white/40 text-sm">
                      Buka gacha box untuk mendapatkan fragments!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assembly Result Modal */}
        {assemblyResult && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className={`bg-gradient-to-br ${assemblyResult.success ? "from-green-500 to-emerald-600" : "from-red-500 to-red-600"} rounded-3xl p-6 max-w-sm w-full shadow-2xl`}>
              <div className="text-center">
                <div className="text-6xl mb-4">
                  {assemblyResult.success ? "🎉" : "😔"}
                </div>
                <h3 className="text-2xl font-black text-white mb-2">
                  {assemblyResult.success ? "Assembly Success!" : "Assembly Failed"}
                </h3>
                <p className="text-white/90 mb-4">
                  {assemblyResult.message}
                </p>
                {assemblyResult.success && assemblyResult.car && (
                  <div className="bg-white/20 rounded-2xl p-4 mb-4">
                    <p className="text-white font-bold">{assemblyResult.car.modelName}</p>
                    <p className="text-white/70 text-sm">{assemblyResult.car.series}</p>
                    <p className="text-yellow-300 text-xs font-bold uppercase mt-1">
                      {assemblyResult.car.rarity}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setAssemblyResult(null)}
                  className="w-full bg-white text-orange-600 font-black py-3 rounded-full"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Network Modal */}
      <NetworkModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        onNetworkChanged={() => {}}
      />
    </main>
  );
}
