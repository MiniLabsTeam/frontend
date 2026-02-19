"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { Gamepad2, Car, ChevronLeft, Play } from "lucide-react";
import { toast } from "sonner";

export default function GamePage() {
  const { isConnected, walletAddress, getAuthToken } = useWallet();
  const router = useRouter();
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);

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
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch inventory");
      const data = await res.json();
      const carList = data.items || data.cars || data || [];
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

    // Simpan credentials ke localStorage (dibaca oleh game - same origin)
    localStorage.setItem("wallet_address", walletAddress || "");
    localStorage.setItem("game_car_uid", selectedCar.tokenId || selectedCar.uid || selectedCar.id || "");
    localStorage.setItem(
      "backend_url",
      (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000") + "/api"
    );
    // auth_token sudah ada dari useWallet

    // Navigasi ke game statis
    window.location.href = "/game/index.html";
  };

  const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case "legendary": return "from-yellow-400 to-orange-500";
      case "epic":      return "from-purple-400 to-pink-500";
      case "rare":      return "from-blue-400 to-cyan-500";
      default:          return "from-gray-400 to-gray-500";
    }
  };

  if (!isConnected) return null;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur border-b border-orange-500/30 px-4 py-3">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <Gamepad2 size={22} className="text-orange-400" />
          <h1 className="text-lg font-black text-white">OneChain Racing</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-6 pb-28">
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-orange-400 mb-1">Pilih Mobil</h2>
          <p className="text-gray-400 text-sm">Pilih mobil dari inventorymu untuk balapan</p>
        </div>

        {/* Car Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl h-40 animate-pulse" />
            ))}
          </div>
        ) : cars.length === 0 ? (
          <div className="text-center py-16">
            <Car size={48} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 font-semibold">Belum punya mobil</p>
            <p className="text-gray-500 text-sm mt-1">Buka gacha untuk dapat mobil!</p>
            <button
              onClick={() => router.push("/gacha")}
              className="mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-full text-sm transition-colors"
            >
              Ke Gacha
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cars.map((car, idx) => {
              const isSelected = selectedCar === car;
              return (
                <button
                  key={car.tokenId || car.uid || car.id || idx}
                  onClick={() => setSelectedCar(car)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected
                      ? "border-orange-400 scale-105 shadow-lg shadow-orange-500/30"
                      : "border-gray-700 hover:border-gray-500"
                  }`}
                >
                  {/* Rarity gradient bar */}
                  <div className={`h-1 w-full bg-gradient-to-r ${getRarityColor(car.rarity)}`} />

                  <div className="bg-gray-800 p-3">
                    {/* Car image or placeholder */}
                    {car.image ? (
                      <img
                        src={car.image}
                        alt={car.name || "Car"}
                        className="w-full h-20 object-contain"
                      />
                    ) : (
                      <div className="w-full h-20 flex items-center justify-center">
                        <Car size={40} className="text-gray-500" />
                      </div>
                    )}

                    <div className="mt-2 text-left">
                      <p className="text-white text-xs font-bold truncate">
                        {car.name || car.carName || `Car #${idx + 1}`}
                      </p>
                      <p className={`text-xs font-semibold bg-gradient-to-r ${getRarityColor(car.rarity)} bg-clip-text text-transparent`}>
                        {car.rarity || "Common"}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected car info */}
        {selectedCar && !loading && (
          <div className="mt-4 bg-gray-800/60 border border-orange-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getRarityColor(selectedCar.rarity)} flex items-center justify-center`}>
              <Car size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">
                {selectedCar.name || selectedCar.carName || "Car"}
              </p>
              <p className="text-gray-400 text-xs">{selectedCar.rarity || "Common"} · Siap balapan</p>
            </div>
          </div>
        )}

        {/* Launch button */}
        {!loading && cars.length > 0 && (
          <button
            onClick={handleLaunch}
            disabled={!selectedCar || launching}
            className="mt-6 w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 text-lg shadow-lg shadow-orange-500/30 transition-all active:scale-95"
          >
            <Play size={22} />
            {launching ? "Memulai Game..." : "Launch Game 🏁"}
          </button>
        )}
      </div>

      <BottomNavigation />
    </main>
  );
}
