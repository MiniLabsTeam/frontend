"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import {
  Car, Wallet, CircleDot, Settings, Paintbrush, Armchair,
  Flame, Wrench, PartyPopper, Frown, AlertTriangle,
  DollarSign, Clock, Package, Box
} from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import NetworkModal from "@/components/shared/NetworkModal";
import { toast } from "sonner";
import { PullToRefresh, SwipeCard } from "@/components/shared";

// Rarity color mapping
const rarityColorMap = {
  common: "from-gray-500 to-gray-600",
  rare: "from-blue-500 to-cyan-500",
  epic: "from-purple-500 to-pink-500",
  legendary: "from-yellow-500 to-orange-500",
};

// Fragment type icons mapping
const fragmentIconsMap = {
  0: { Icon: Car, label: "Chassis" },
  1: { Icon: CircleDot, label: "Wheels" },
  2: { Icon: Settings, label: "Engine" },
  3: { Icon: Paintbrush, label: "Body" },
  4: { Icon: Armchair, label: "Interior" },
};

export default function InventoryPage() {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const router = useRouter();
  const { walletAddress } = useWallet();

  const [mockIDRXBalance, setMockIDRXBalance] = useState(0);
  const [loadingMockIDRX, setLoadingMockIDRX] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [userInfo, setUserInfo] = useState({
    username: null,
    email: null,
    usernameSet: false
  });

  // Cars state
  const [selectedFilter, setSelectedFilter] = useState("semua");
  const [inventoryData, setInventoryData] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Fragments state
  const [fragmentsData, setFragmentsData] = useState([]);
  const [loadingFragments, setLoadingFragments] = useState(true);
  const [assembling, setAssembling] = useState(false);
  const [assemblyResult, setAssemblyResult] = useState(null);

  // Sold out modal state
  const [showSoldOutModal, setShowSoldOutModal] = useState(false);
  const [soldOutData, setSoldOutData] = useState(null);
  const [processingOption, setProcessingOption] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("cars"); // "cars" or "fragments"

  // Redeem/claim physical state
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);
  const [shippingInfo, setShippingInfo] = useState({ name: "", phone: "", address: "" });
  const [hasShippingInfo, setHasShippingInfo] = useState(false);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState(null);

  // Marketplace listing state
  const [activeListings, setActiveListings] = useState([]); // Array of tokenIds that are listed
  const [showListingWarning, setShowListingWarning] = useState(false);

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
      setUserInfo({
        username: data.user?.username || null,
        email: data.user?.email || null,
        usernameSet: data.user?.usernameSet || false
      });
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

  // Fetch shipping info
  const fetchShippingInfo = async () => {
    try {
      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/redeem/shipping-info`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();

      setHasShippingInfo(data.hasShippingInfo);
      if (data.hasShippingInfo) {
        setShippingInfo(data.shippingInfo);
      }
    } catch (error) {
      console.error("Failed to fetch shipping info:", error);
    }
  };

  // Save shipping info
  const handleSaveShipping = async () => {
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoadingShipping(true);
      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/redeem/shipping-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(shippingInfo),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save shipping info");
      }

      toast.success("Shipping info saved successfully!");
      setHasShippingInfo(true);
      setShowShippingModal(false);

      // Proceed to redeem if car was selected
      if (selectedCar) {
        setShowRedeemModal(true);
      }
    } catch (error) {
      console.error("Save shipping error:", error);
      toast.error(error.message || "Failed to save shipping info");
    } finally {
      setLoadingShipping(false);
    }
  };

  // Handle claim physical button click
  const handleClaimPhysical = async (car) => {
    // Check if car is listed on marketplace
    if (activeListings.includes(car.tokenId)) {
      setSelectedCar(car);
      setShowListingWarning(true);
      return;
    }

    setSelectedCar(car);

    // Check if user has shipping info
    if (!hasShippingInfo) {
      setShowShippingModal(true);
    } else {
      setShowRedeemModal(true);
    }
  };

  // Confirm redeem/burn NFT
  const handleConfirmRedeem = async () => {
    if (!selectedCar || redeeming) return;

    try {
      setRedeeming(true);
      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/redeem/claim-physical`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ tokenId: selectedCar.tokenId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim physical car");
      }

      setShowRedeemModal(false);
      setRedeemResult({
        success: true,
        message: data.message,
        car: data.car,
      });

      // Refresh inventory
      await fetchInventory();
    } catch (error) {
      console.error("Redeem error:", error);
      setRedeemResult({
        success: false,
        message: error.message || "Failed to claim physical car",
      });
    } finally {
      setRedeeming(false);
    }
  };

  // Fetch active listings from marketplace
  const fetchActiveListings = async () => {
    try {
      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/my-listings?status=active`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) return;

      const data = await response.json();
      // Extract tokenIds from active listings
      const tokenIds = data.listings
        .filter(listing => listing.status === "active")
        .map(listing => listing.carTokenId);
      setActiveListings(tokenIds);
    } catch (error) {
      console.error("Failed to fetch active listings:", error);
    }
  };

  // Fetch data when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchInventory();
      fetchFragments();
      fetchShippingInfo();
      fetchActiveListings(); // Check for active marketplace listings
    }
  }, [authenticated]);

  // Filter inventory based on selected filter and exclude redeemed cars
  const filteredInventory = selectedFilter === "semua"
    ? inventoryData.filter((car) => !car.isRedeemed)
    : inventoryData.filter(
      (car) => car.rarity?.toLowerCase() === selectedFilter.toLowerCase() && !car.isRedeemed
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

      // Check if sold out (status 409)
      if (response.status === 409 && data.soldOut) {
        // Show sold out modal with options
        setSoldOutData({
          brand,
          series: data.series,
          fragmentIds: data.fragmentIds,
          supplyStatus: data.supplyStatus,
          options: data.options,
          message: data.message,
        });
        setShowSoldOutModal(true);
        setAssembling(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || "Assembly failed");
      }

      setAssemblyResult({
        success: true,
        car: data.car,
        message: data.message,
      });

      // Refresh data
      await Promise.all([fetchInventory(), fetchFragments(), fetchMockIDRXBalance()]);
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

  // Handle refund option
  const handleRefundOption = async () => {
    if (!soldOutData || processingOption) return;

    try {
      setProcessingOption(true);
      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/supply/claim-refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fragmentIds: soldOutData.fragmentIds,
          series: soldOutData.series,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Refund failed");
      }

      // Close modal and show success
      setShowSoldOutModal(false);
      setAssemblyResult({
        success: true,
        message: data.message,
      });

      // Refresh data
      await Promise.all([fetchFragments(), fetchMockIDRXBalance()]);
    } catch (error) {
      console.error("Refund failed:", error);
      toast.error(error.message || "Failed to process refund");
    } finally {
      setProcessingOption(false);
    }
  };

  // Handle waitlist option
  const handleWaitlistOption = async () => {
    if (!soldOutData || processingOption) return;

    try {
      setProcessingOption(true);
      const authToken = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/supply/join-waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fragmentIds: soldOutData.fragmentIds,
          series: soldOutData.series,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join waiting list");
      }

      // Close modal and show success
      setShowSoldOutModal(false);
      setAssemblyResult({
        success: true,
        message: data.message + ` (Position: #${data.position})`,
      });

      // Refresh data
      await fetchFragments();
    } catch (error) {
      console.error("Join waitlist failed:", error);
      toast.error(error.message || "Failed to join waiting list");
    } finally {
      setProcessingOption(false);
    }
  };

  // Handle pull to refresh
  const handleRefresh = async () => {
    await Promise.all([
      fetchInventory(),
      fetchFragments(),
      fetchMockIDRXBalance(),
      fetchActiveListings()
    ]);
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
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto pb-24">
          {/* Header */}
        <header className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            {/* MockIDRX Balance Badge */}
            <button
              type="button"
              onClick={fetchMockIDRXBalance}
              className="flex items-center gap-1.5 bg-yellow-400 rounded-full px-3 py-1.5 shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
              aria-label="Refresh IDRX balance"
              title="Tap to refresh balance"
            >
              <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center">
                <Wallet size={14} className="text-yellow-300" strokeWidth={3} />
              </div>
              <span className="font-black text-sm text-orange-900">
                {loadingMockIDRX ? "..." : Math.floor(mockIDRXBalance).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-orange-900 opacity-80">IDRX</span>
            </button>

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

          {/* Title */}
          <h1 className="text-4xl font-black text-orange-200 mb-4">Inventory</h1>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("cars")}
              className={`flex-1 py-3 rounded-full font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${activeTab === "cars"
                ? "bg-white text-orange-600 shadow-lg"
                : "bg-orange-600/50 text-white hover:bg-orange-600/70"
                }`}
            >
              <Car size={16} strokeWidth={2.5} />
              Cars ({inventoryData.length})
            </button>
            <button
              onClick={() => setActiveTab("fragments")}
              className={`flex-1 py-3 rounded-full font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${activeTab === "fragments"
                ? "bg-white text-orange-600 shadow-lg"
                : "bg-orange-600/50 text-white hover:bg-orange-600/70"
                }`}
            >
              <Box size={16} strokeWidth={2.5} />
              Fragments ({fragmentsData.reduce((sum, b) => sum + b.totalParts, 0)})
            </button>
          </div>

          {/* Filter Tabs (only for cars) */}
          {activeTab === "cars" && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all active:scale-95 ${selectedFilter === filter
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
                  {filteredInventory.map((car, index) => (
                    <SwipeCard
                      key={car.id}
                      onView={() => {
                        // View car details (can navigate to detail page)
                        toast.info(`Viewing ${car.modelName}`);
                      }}
                      onShare={() => {
                        // Share car
                        if (navigator.share) {
                          navigator.share({
                            title: car.modelName,
                            text: `Check out my ${car.rarity} car: ${car.modelName}!`,
                            url: window.location.href,
                          });
                        } else {
                          toast.success("Link copied to clipboard!");
                          navigator.clipboard.writeText(window.location.href);
                        }
                      }}
                      className="h-full"
                    >
                      <div
                        className={`relative bg-gradient-to-br ${car.rarityColor} rounded-2xl p-3 shadow-xl transition-transform inventory-card animate-rise h-full`}
                        style={{ animationDelay: `${index * 60}ms` }}
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
                      <div className="text-center px-1 mb-2">
                        <p className="text-white text-xs font-black uppercase truncate">
                          {car.modelName}
                        </p>
                        <p className="text-white/70 text-[10px] font-semibold truncate">
                          {car.series}
                        </p>
                      </div>

                      {/* Claim Physical Button */}
                      {!car.isRedeemed ? (
                        activeListings.includes(car.tokenId) ? (
                          <button
                            onClick={() => handleClaimPhysical(car)}
                            className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold py-2 px-3 rounded-lg text-[10px] shadow-lg cursor-not-allowed opacity-75 flex items-center justify-center gap-1"
                          >
                            <Package size={12} className="text-white" />
                            UNABLE TO CLAIM
                          </button>
                        ) : (
                          <button
                            onClick={() => handleClaimPhysical(car)}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-[10px] shadow-lg transform hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1"
                          >
                            <Flame size={12} className="text-white" fill="currentColor" />
                            CLAIM PHYSICAL
                          </button>
                        )
                      ) : (
                        <div className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-2 px-3 rounded-lg text-[10px] text-center">
                          ✅ REDEEMED
                        </div>
                      )}
                      </div>
                    </SwipeCard>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[280px]">
                  <div className="text-center px-4">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Car size={40} className="text-white/40" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-white text-xl font-black mb-2">
                      {selectedFilter === "semua"
                        ? "No Cars Yet"
                        : "No Cars Found"}
                    </h3>
                    <p className="text-white/60 text-sm mb-6 max-w-[200px] mx-auto">
                      {selectedFilter === "semua"
                        ? "Open your first gacha box to start your collection!"
                        : "Try a different filter or open more gacha boxes"}
                    </p>
                    {selectedFilter === "semua" && (
                      <button
                        onClick={() => router.push('/gacha')}
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-orange-900 font-black py-3 px-6 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto"
                      >
                        <Box size={18} strokeWidth={2.5} />
                        Open Gacha Box
                      </button>
                    )}
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
                  {fragmentsData.map((brandData, index) => (
                    <div
                      key={brandData.brand}
                      className={`bg-gradient-to-br ${rarityColorMap[brandData.rarity] || "from-gray-500 to-gray-600"} rounded-2xl p-4 shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99] inventory-card animate-rise`}
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      {/* Brand Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-white font-black text-lg">{brandData.brand}</h3>
                          <p className="text-white/70 text-xs">{brandData.series}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${brandData.canAssemble
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
                          const { Icon, label } = fragmentIconsMap[typeId];

                          return (
                            <div
                              key={typeId}
                              className={`flex flex-col items-center p-2 rounded-xl transition-transform ${hasFragment
                                ? "bg-white/30 hover:scale-105 active:scale-95"
                                : "bg-black/30 opacity-70"
                                }`}
                            >
                              <Icon size={20} className="text-white mb-1" strokeWidth={2.5} />
                              <span className="text-[8px] font-bold text-white/80">
                                {label}
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
                          className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-400 disabled:to-gray-500 text-orange-900 font-black py-3 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all inventory-assemble flex items-center justify-center gap-2"
                        >
                          {assembling ? (
                            "Assembling..."
                          ) : (
                            <>
                              <Wrench size={18} strokeWidth={2.5} />
                              Assemble {brandData.brand}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[280px]">
                  <div className="text-center px-4">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Wrench size={40} className="text-white/40" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-white text-xl font-black mb-2">
                      No Fragments Yet
                    </h3>
                    <p className="text-white/60 text-sm mb-6 max-w-[220px] mx-auto">
                      Collect 5 matching fragments to assemble a complete car!
                    </p>
                    <button
                      onClick={() => router.push('/gacha')}
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-orange-900 font-black py-3 px-6 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto"
                    >
                      <Box size={18} strokeWidth={2.5} />
                      Start Collecting
                    </button>
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
                <div className="mb-4 flex justify-center">
                  {assemblyResult.success ? (
                    <PartyPopper size={64} className="text-white" strokeWidth={1.5} />
                  ) : (
                    <Frown size={64} className="text-white" strokeWidth={1.5} />
                  )}
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
      </PullToRefresh>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Network Modal */}
      <NetworkModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        onNetworkChanged={() => { }}
      />

      {/* Sold Out Modal */}
      {showSoldOutModal && soldOutData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-yellow-400">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mb-3 flex justify-center">
                <AlertTriangle size={64} className="text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                Series Sold Out!
              </h2>
              <div className="bg-white/20 rounded-lg p-3 mb-2">
                <p className="font-bold text-yellow-300 text-lg">
                  {soldOutData.series} Series
                </p>
                <p className="text-sm text-white/90">
                  {soldOutData.supplyStatus?.currentMinted}/{soldOutData.supplyStatus?.maxSupply} Minted
                </p>
              </div>
              <p className="text-white/90 text-sm">
                {soldOutData.message}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-4">
              {soldOutData.options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (option.type === "refund") {
                      handleRefundOption();
                    } else if (option.type === "waitlist") {
                      handleWaitlistOption();
                    }
                  }}
                  disabled={processingOption}
                  className={`w-full p-4 rounded-xl text-left transition-all shadow-lg ${option.type === "refund"
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                    } ${processingOption ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {option.type === "refund" ? (
                      <DollarSign size={32} className="text-white" strokeWidth={2} />
                    ) : (
                      <Clock size={32} className="text-white" strokeWidth={2} />
                    )}
                    <div className="flex-1">
                      <h3 className="font-black text-white text-lg mb-1">
                        {option.title}
                      </h3>
                      <p className="text-white/90 text-sm mb-2">
                        {option.description}
                      </p>
                      {option.type === "refund" && (
                        <div className="bg-white/20 rounded-lg px-3 py-1 inline-block">
                          <span className="font-black text-yellow-300">
                            +{option.bonus?.toLocaleString()} IDRX
                          </span>
                        </div>
                      )}
                      {option.type === "waitlist" && (
                        <div className="bg-white/20 rounded-lg px-3 py-1 inline-block">
                          <span className="font-bold text-white text-sm">
                            Position: #{option.currentPosition}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowSoldOutModal(false)}
              disabled={processingOption}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {processingOption ? "Processing..." : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* Shipping Info Modal */}
      {showShippingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-yellow-400">
            <div className="text-center mb-6">
              <div className="mb-3 flex justify-center">
                <Package size={64} className="text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                Shipping Information
              </h2>
              <p className="text-white/90 text-sm">
                Please provide your shipping details to claim the physical car
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white font-bold text-sm mb-2">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={shippingInfo.name}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 font-semibold placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-white font-bold text-sm mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={shippingInfo.phone}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 font-semibold placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-white font-bold text-sm mb-2">
                  Complete Address
                </label>
                <textarea
                  value={shippingInfo.address}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                  placeholder="Street, City, State, ZIP Code, Country"
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 font-semibold placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowShippingModal(false);
                  setSelectedCar(null);
                }}
                disabled={loadingShipping}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShipping}
                disabled={loadingShipping}
                className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-orange-900 font-black py-3 rounded-xl shadow-lg disabled:opacity-50"
              >
                {loadingShipping ? "Saving..." : "Save & Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Confirmation Modal */}
      {showRedeemModal && selectedCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-yellow-400">
            <div className="text-center mb-6">
              <div className="mb-3 flex justify-center">
                <AlertTriangle size={64} className="text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                Confirm Redemption
              </h2>
              <p className="text-white/90 text-sm mb-4">
                Are you sure you want to claim the physical car? This will BURN your NFT permanently!
              </p>

              <div className="bg-white/20 rounded-xl p-4 mb-4">
                <p className="text-yellow-300 font-black text-lg mb-1">
                  {selectedCar.modelName}
                </p>
                <p className="text-white/90 text-sm mb-2">
                  {selectedCar.series} • Token #{selectedCar.tokenId}
                </p>
                <div className="text-left bg-black/30 rounded-lg p-3 text-sm">
                  <p className="text-white font-bold mb-1">Shipping to:</p>
                  <p className="text-white/90">{shippingInfo.name}</p>
                  <p className="text-white/90">{shippingInfo.phone}</p>
                  <p className="text-white/80 text-xs mt-1">{shippingInfo.address}</p>
                </div>
              </div>

              <div className="bg-yellow-400 rounded-lg p-3 mb-4">
                <p className="text-orange-900 font-black text-xs">
                  ⚠️ WARNING: This action cannot be undone. Your NFT will be burned and you will receive the physical car.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRedeemModal(false);
                  setSelectedCar(null);
                }}
                disabled={redeeming}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRedeem}
                disabled={redeeming}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-3 rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {redeeming ? "Processing..." : (
                  <>
                    <Flame size={18} className="text-white" fill="currentColor" />
                    BURN & CLAIM
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Result Modal */}
      {redeemResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className={`bg-gradient-to-br ${redeemResult.success ? "from-green-500 to-emerald-600" : "from-red-500 to-red-600"} rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-yellow-400`}>
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                {redeemResult.success ? (
                  <PartyPopper size={64} className="text-white" strokeWidth={1.5} />
                ) : (
                  <Frown size={64} className="text-white" strokeWidth={1.5} />
                )}
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                {redeemResult.success ? "Redemption Successful!" : "Redemption Failed"}
              </h2>
              <p className="text-white/90 mb-4">
                {redeemResult.message}
              </p>
              {redeemResult.success && redeemResult.car && (
                <div className="bg-white/20 rounded-xl p-4 mb-4">
                  <p className="text-yellow-300 font-black text-lg mb-1">
                    {redeemResult.car.modelName}
                  </p>
                  <p className="text-white/90 text-sm">
                    {redeemResult.car.series}
                  </p>
                  <p className="text-white/80 text-xs mt-2">
                    Your physical car will be shipped to your address within 7-14 business days.
                  </p>
                </div>
              )}
              <button
                onClick={() => {
                  setRedeemResult(null);
                  setSelectedCar(null);
                }}
                className="w-full bg-white text-orange-600 font-black py-3 rounded-xl hover:bg-gray-100 transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Marketplace Listing Warning Modal */}
      {showListingWarning && selectedCar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <AlertTriangle size={64} className="text-yellow-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">
                Unable to Claim
              </h3>
              <p className="text-white/90 text-sm mb-6">
                This NFT is currently listed on the marketplace. You must <strong>delist it first</strong> before proceeding with physical redemption.
              </p>
              {activeListings.includes(selectedCar.tokenId) && (
                <div className="bg-white/20 rounded-2xl p-4 mb-4">
                  <p className="text-white font-bold">{selectedCar.modelName}</p>
                  <p className="text-white/70 text-sm">{selectedCar.series}</p>
                  <p className="text-yellow-300 text-xs font-bold uppercase mt-1">
                    Token #{selectedCar.tokenId}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowListingWarning(false);
                    setSelectedCar(null);
                  }}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowListingWarning(false);
                    router.push('/marketplace');
                  }}
                  className="flex-1 bg-white text-orange-600 font-black py-3 rounded-xl hover:bg-gray-100 transition-all"
                >
                  Go to Marketplace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
