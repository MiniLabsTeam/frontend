"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import NetworkModal from "@/components/shared/NetworkModal";

// Mock inventory data
const inventoryData = [
  {
    id: 1,
    name: "BLAZE RUNNER",
    image: "/assets/car/Blaze Runner.png",
    rarity: "LEGEND",
    rarityColor: "from-purple-500 to-pink-500",
  },
  {
    id: 2,
    name: "CHROME VIPER",
    image: "/assets/car/Chrome Viper.png",
    rarity: "COMMON",
    rarityColor: "from-gray-500 to-gray-600",
  },
  {
    id: 3,
    name: "TURBO PHANTOM",
    image: "/assets/car/Turbo Phantom.png",
    rarity: "GOLD",
    rarityColor: "from-yellow-500 to-orange-500",
  },
  {
    id: 4,
    name: "SPEED DEMON",
    image: "/assets/car/Speed Demon.png",
    rarity: "SILVER",
    rarityColor: "from-gray-400 to-gray-500",
  },
];

export default function InventoryPage() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  const { walletAddress, chainId, currencySymbol, getBalance, embeddedWallet } = useWallet();

  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("semua");
  const [selectedCars, setSelectedCars] = useState([]);

  const filters = ["semua", "Legend", "Gold", "silver", "common"];

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

  // Filter inventory based on selected filter
  const filteredInventory = selectedFilter === "semua"
    ? inventoryData
    : inventoryData.filter(
        (car) => car.rarity.toLowerCase() === selectedFilter.toLowerCase()
      );

  // Toggle car selection
  const toggleCarSelection = (carId) => {
    setSelectedCars((prev) =>
      prev.includes(carId)
        ? prev.filter((id) => id !== carId)
        : [...prev, carId]
    );
  };

  const handleClaimReward = () => {
    if (selectedCars.length === 0) {
      alert("Pilih mobil terlebih dahulu!");
      return;
    }
    alert(`Claiming rewards for ${selectedCars.length} car(s)!`);
  };

  const handleSellBack = () => {
    if (selectedCars.length === 0) {
      alert("Pilih mobil terlebih dahulu!");
      return;
    }
    alert(`Selling ${selectedCars.length} car(s) back!`);
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
      <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto">
        {/* Header */}
        <header className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-end mb-4">
            {/* Balance Badge - Click to switch network */}
            <div
              onClick={() => setShowNetworkModal(true)}
              className="flex items-center gap-2 bg-orange-600/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg cursor-pointer hover:scale-105 transition-transform group"
            >
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-orange-900 font-black text-xs">
                {currencySymbol === "MATIC" ? "⬡" : "Ξ"}
              </div>
              <span className="font-black text-lg">
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

          {/* Filter Tabs */}
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
        </header>

        {/* Inventory Grid */}
        <div className="flex-1 px-4 mb-4">
          <div className="bg-orange-700/50 backdrop-blur-sm rounded-3xl p-4 min-h-[300px]">
            {filteredInventory.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {filteredInventory.map((car) => (
                  <button
                    key={car.id}
                    onClick={() => toggleCarSelection(car.id)}
                    className={`relative bg-gradient-to-br ${car.rarityColor} rounded-2xl p-3 shadow-xl transform transition-all ${
                      selectedCars.includes(car.id)
                        ? "scale-95 ring-4 ring-yellow-400"
                        : "hover:scale-105"
                    }`}
                  >
                    {/* Rarity Badge */}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 z-10">
                      <span className="text-white text-[10px] font-black uppercase">
                        {car.rarity}
                      </span>
                    </div>

                    {/* Car Image */}
                    <div className="aspect-square flex items-center justify-center mb-2">
                      <img
                        src={car.image}
                        alt={car.name}
                        className="w-full h-full object-contain drop-shadow-2xl"
                      />
                    </div>

                    {/* Selection Indicator */}
                    {selectedCars.includes(car.id) && (
                      <div className="absolute inset-0 bg-yellow-400/20 rounded-2xl flex items-center justify-center">
                        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                          <span className="text-orange-900 text-xl">✓</span>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/60 text-center">
                  Tidak ada mobil di kategori ini
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-4 space-y-3">
          <button
            onClick={handleClaimReward}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-orange-900 font-black text-lg py-4 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200"
          >
            Ambil hadiah
          </button>
          <button
            onClick={handleSellBack}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-orange-900 font-black text-lg py-4 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200"
          >
            Jual kembali
          </button>
        </div>

        {/* Bottom Car Image */}
        <div className="relative h-40 overflow-hidden mb-20">
          <img
            src="/assets/car/High Speed.png"
            alt="Car"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm object-contain drop-shadow-2xl"
            style={{ transform: 'translateX(-50%) rotate(-5deg)' }}
          />
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
