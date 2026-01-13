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

export default function InventoryPage() {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const router = useRouter();
  const { walletAddress, chainId, currencySymbol, getBalance, embeddedWallet } = useWallet();

  const [balance, setBalance] = useState(0);
  const [mockIDRXBalance, setMockIDRXBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingMockIDRX, setLoadingMockIDRX] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("semua");
  const [selectedCars, setSelectedCars] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  const filters = ["semua", "legendary", "epic", "rare", "common"];

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

  // Fetch inventory NFT dari backend
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

      // Transform data untuk UI
      const transformedCars = data.cars.map(car => ({
        id: car.tokenId,
        tokenId: car.tokenId,
        name: car.modelName.toUpperCase(),
        modelName: car.modelName,
        series: car.series,
        rarity: car.rarity,
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

  // Fetch inventory saat authenticated
  useEffect(() => {
    if (authenticated) {
      fetchInventory();
    }
  }, [authenticated]);

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
          <div className="flex items-center justify-end gap-2 mb-4">
            {/* MockIDRX Balance Badge */}
            <div className="flex items-center gap-1.5 bg-yellow-400 rounded-full px-3 py-1.5 shadow-lg">
              <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-yellow-300 font-black text-xs">
                💰
              </div>
              <span className="font-black text-sm text-orange-900">
                {loadingMockIDRX ? "..." : Math.floor(mockIDRXBalance)}
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
