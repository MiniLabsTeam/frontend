"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import {
  Wallet, Tag, Search, List, Sparkles, Gem,
  ShoppingBag, PartyPopper, Frown, X, CheckCircle
} from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import { BrowserProvider, Contract, parseUnits } from "ethers";
import { toast } from "sonner";
import { PullToRefresh } from "@/components/shared";

// Rarity color mapping
const rarityColorMap = {
  common: "from-gray-500 to-gray-600",
  rare: "from-blue-500 to-cyan-500",
  epic: "from-purple-500 to-pink-500",
  legendary: "from-yellow-500 to-orange-500",
};

export default function MarketplacePage() {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const { embeddedWallet, walletAddress } = useWallet();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState("browse"); // "browse" or "my-listings"

  // Browse state
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // My listings state
  const [myListings, setMyListings] = useState({ active: [], sold: [], cancelled: [], all: [] });
  const [loadingMyListings, setLoadingMyListings] = useState(false);
  const [myListingsFilter, setMyListingsFilter] = useState("all");

  // Modal states
  const [selectedListing, setSelectedListing] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Buy flow state
  const [buyStep, setBuyStep] = useState("approve"); // "approve" | "buying" | "success" | "error"
  const [buyError, setBuyError] = useState("");
  const [buyTxHash, setBuyTxHash] = useState("");

  // Sell flow state
  const [sellStep, setSellStep] = useState("select"); // "select" | "price" | "approve" | "listing" | "success" | "error"
  const [sellCar, setSellCar] = useState(null);
  const [sellPrice, setSellPrice] = useState("");
  const [sellError, setSellError] = useState("");
  const [myCars, setMyCars] = useState([]);

  // Balance
  const [mockIDRXBalance, setMockIDRXBalance] = useState(0);

  const seriesOptions = ["all", "Economy", "Sport", "Supercar", "Hypercar"];

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Fetch listings
  const fetchListings = useCallback(async () => {
    try {
      setLoadingListings(true);
      const authToken = await getAccessToken();

      const params = new URLSearchParams();
      if (seriesFilter !== "all") params.append("series", seriesFilter);
      params.append("sortBy", sortBy);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/listings?${params}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch listings");

      const data = await response.json();
      setListings(data.listings || []);
    } catch (error) {
      console.error("Failed to fetch listings:", error);
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  }, [getAccessToken, seriesFilter, sortBy]);

  // Fetch my listings
  const fetchMyListings = useCallback(async () => {
    try {
      setLoadingMyListings(true);
      const authToken = await getAccessToken();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/my-listings?status=${myListingsFilter}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch my listings");

      const data = await response.json();
      if (myListingsFilter === "all") {
        setMyListings(data.listings);
      } else {
        setMyListings({ [myListingsFilter]: data.listings, all: [] });
      }
    } catch (error) {
      console.error("Failed to fetch my listings:", error);
      setMyListings({ active: [], sold: [], cancelled: [], all: [] });
    } finally {
      setLoadingMyListings(false);
    }
  }, [getAccessToken, myListingsFilter]);

  // Fetch user's cars for selling
  const fetchMyCars = useCallback(async () => {
    try {
      const authToken = await getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/cars`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch cars");

      const data = await response.json();
      setMyCars(data.cars || []);
    } catch (error) {
      console.error("Failed to fetch cars:", error);
      setMyCars([]);
    }
  }, [getAccessToken]);

  // Fetch MockIDRX balance
  const fetchBalance = useCallback(async () => {
    try {
      const authToken = await getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/overview`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const data = await response.json();
      setMockIDRXBalance(data.user?.mockIDRX || 0);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  }, [getAccessToken]);

  // Initial data fetch
  useEffect(() => {
    if (authenticated) {
      fetchListings();
      fetchBalance();
    }
  }, [authenticated, fetchListings, fetchBalance]);

  useEffect(() => {
    if (authenticated && activeTab === "my-listings") {
      fetchMyListings();
    }
  }, [authenticated, activeTab, fetchMyListings]);

  // Handle buy NFT
  const handleBuyClick = (listing) => {
    setSelectedListing(listing);
    setShowBuyModal(true);
    setBuyStep("approve");
    setBuyError("");
    setBuyTxHash("");
  };

  const handleBuyApprove = async () => {
    if (!embeddedWallet || !selectedListing) return;

    try {
      setBuyStep("buying");

      console.log("Starting purchase:", {
        listingId: selectedListing.id,
        price: selectedListing.price,
        tokenId: selectedListing.carTokenId,
        seller: selectedListing.seller
      });

      // Check user balance
      if (mockIDRXBalance < selectedListing.price) {
        throw new Error(`Insufficient balance. You have ${mockIDRXBalance} IDRX but need ${selectedListing.price} IDRX`);
      }

      // Get backend wallet address from env
      const backendWallet = process.env.NEXT_PUBLIC_BACKEND_WALLET_ADDRESS;
      if (!backendWallet) {
        throw new Error("Backend wallet address not configured");
      }

      // Get Ethereum provider dari Privy
      const ethereumProvider = await embeddedWallet.getEthereumProvider();
      const provider = new BrowserProvider(ethereumProvider);
      const signer = await provider.getSigner();

      // Verify we're on Base Sepolia
      const network = await provider.getNetwork();
      console.log("Current network:", network.chainId.toString());

      if (network.chainId !== 84532n) {
        throw new Error("Please switch to Base Sepolia network (Chain ID: 84532)");
      }

      const mockIDRXAddress = process.env.NEXT_PUBLIC_MOCKIDRX_CONTRACT_ADDRESS;
      const mockIDRXABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) external view returns (uint256)",
      ];

      const mockIDRXContract = new Contract(mockIDRXAddress, mockIDRXABI, signer);

      // Double check balance on-chain
      const balance = await mockIDRXContract.balanceOf(await signer.getAddress());
      const balanceFormatted = parseFloat(balance) / 1e18;
      console.log("On-chain IDRX balance:", balanceFormatted);

      if (balanceFormatted < selectedListing.price) {
        throw new Error(`Insufficient on-chain balance. You have ${balanceFormatted} IDRX`);
      }

      console.log("Approving IDRX spend...");
      const priceWei = parseUnits(selectedListing.price.toString(), 18);
      const approveTx = await mockIDRXContract.approve(backendWallet, priceWei);
      console.log("Approve tx sent:", approveTx.hash);
      await approveTx.wait();
      console.log("Approve tx confirmed");

      // Call backend to buy
      console.log("Calling backend to execute purchase...");
      const authToken = await getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/buy/${selectedListing.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();
      console.log("Backend response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Purchase failed");
      }

      setBuyTxHash(data.purchase.txHash);
      setBuyStep("success");

      // Refresh data
      setTimeout(() => {
        fetchListings();
        fetchBalance();
      }, 2000);
    } catch (error) {
      console.error("Buy error:", error);
      setBuyError(error.message || "Purchase failed");
      setBuyStep("error");
    }
  };

  // Handle sell NFT
  const handleSellClick = () => {
    setShowSellModal(true);
    setSellStep("select");
    setSellError("");
    setSellPrice("");
    setSellCar(null);
    fetchMyCars();
  };

  const handleSellSelectCar = (car) => {
    setSellCar(car);
    setSellStep("price");
  };

  const handleSellSetPrice = () => {
    if (!sellPrice || parseFloat(sellPrice) <= 0) {
      setSellError("Please enter a valid price");
      return;
    }
    setSellStep("approve");
  };

  const handleSellApprove = async () => {
    if (!embeddedWallet || !sellCar || !sellPrice) return;

    try {
      setSellStep("listing");

      // Validate tokenId
      if (!sellCar.tokenId || sellCar.tokenId < 0) {
        throw new Error("Invalid NFT token ID");
      }

      console.log("Approving NFT:", {
        tokenId: sellCar.tokenId,
        carName: sellCar.name,
        series: sellCar.series
      });

      // Get backend wallet address
      const backendWallet = process.env.NEXT_PUBLIC_BACKEND_WALLET_ADDRESS;
      if (!backendWallet) {
        throw new Error("Backend wallet address not configured");
      }

      // Get Ethereum provider dari Privy
      const ethereumProvider = await embeddedWallet.getEthereumProvider();
      const provider = new BrowserProvider(ethereumProvider);
      const signer = await provider.getSigner();

      // Verify we're on Base Sepolia (chainId 84532)
      const network = await provider.getNetwork();
      console.log("Current network:", network.chainId.toString());

      if (network.chainId !== 84532n) {
        throw new Error("Please switch to Base Sepolia network (Chain ID: 84532)");
      }

      const carAddress = process.env.NEXT_PUBLIC_CAR_CONTRACT_ADDRESS;
      const carABI = [
        "function approve(address to, uint256 tokenId) external",
        "function ownerOf(uint256 tokenId) external view returns (address)",
      ];

      const carContract = new Contract(carAddress, carABI, signer);

      // Verify ownership before approving
      try {
        const owner = await carContract.ownerOf(sellCar.tokenId);
        const userAddress = await signer.getAddress();
        console.log("NFT owner:", owner);
        console.log("User address:", userAddress);

        if (owner.toLowerCase() !== userAddress.toLowerCase()) {
          throw new Error("You don't own this NFT");
        }
      } catch (error) {
        console.error("Ownership check failed:", error);
        throw new Error("Failed to verify NFT ownership. Make sure you own this NFT.");
      }

      console.log("Sending approve transaction...");
      const approveTx = await carContract.approve(backendWallet, sellCar.tokenId);
      console.log("Approve tx sent:", approveTx.hash);
      await approveTx.wait();
      console.log("Approve tx confirmed");

      // Create listing
      const authToken = await getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/list`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            tokenId: sellCar.tokenId,
            price: parseFloat(sellPrice),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Listing failed");
      }

      setSellStep("success");

      // Refresh data
      setTimeout(() => {
        fetchListings();
        if (activeTab === "my-listings") {
          fetchMyListings();
        }
      }, 2000);
    } catch (error) {
      console.error("Sell error:", error);
      setSellError(error.message || "Listing failed");
      setSellStep("error");
    }
  };

  // Handle cancel listing
  const handleCancelListing = async (listingId) => {
    if (!confirm("Are you sure you want to cancel this listing?")) return;

    try {
      const authToken = await getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/cancel/${listingId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Cancel failed");
      }

      toast.success("Listing cancelled successfully!");
      fetchMyListings();
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error(error.message || "Failed to cancel listing");
    }
  };

  // Handle pull to refresh
  const handleRefresh = async () => {
    if (activeTab === "browse") {
      await fetchListings();
    } else {
      await fetchMyListings();
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
          `,
        }}
      />

      {/* Main Content */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto pb-24">
          {/* Header */}
        <header className="px-3 sm:px-4 pt-3 pb-3 sm:pb-4">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            {/* MockIDRX Balance Badge */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-yellow-400 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-lg">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-600 rounded-full flex items-center justify-center">
                <Wallet size={12} className="text-yellow-300 sm:w-3.5 sm:h-3.5" strokeWidth={3} />
              </div>
              <span className="font-black text-xs sm:text-sm text-orange-900">
                {Math.floor(mockIDRXBalance).toLocaleString()}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-orange-900 opacity-80">IDRX</span>
            </div>

            {/* Sell Button */}
            <button
              onClick={handleSellClick}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 sm:py-2 px-3 sm:px-4 rounded-full shadow-lg transition-all text-xs sm:text-sm"
            >
              🏷️ Sell NFT
            </button>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
            <ShoppingBag size={28} strokeWidth={2.5} className="sm:w-9 sm:h-9" />
            Marketplace
          </h1>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-3 sm:mb-4">
            <button
              onClick={() => setActiveTab("browse")}
              className={`flex-1 py-2 sm:py-3 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${activeTab === "browse"
                ? "bg-white text-orange-600 shadow-lg"
                : "bg-orange-600/50 text-white hover:bg-orange-600/70"
                }`}
            >
              <Search size={14} strokeWidth={2.5} className="sm:w-4 sm:h-4" />
              Browse
            </button>
            <button
              onClick={() => setActiveTab("my-listings")}
              className={`flex-1 py-2 sm:py-3 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${activeTab === "my-listings"
                ? "bg-white text-orange-600 shadow-lg"
                : "bg-orange-600/50 text-white hover:bg-orange-600/70"
                }`}
            >
              <List size={14} strokeWidth={2.5} className="sm:w-4 sm:h-4" />
              My Listings
            </button>
          </div>

          {/* Filters (Browse tab) */}
          {activeTab === "browse" && (
            <div className="space-y-2">
              {/* Series Filter */}
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {seriesOptions.map((series) => (
                  <button
                    key={series}
                    onClick={() => setSeriesFilter(series)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${seriesFilter === series
                      ? "bg-white text-orange-600 shadow-lg"
                      : "bg-orange-600/50 text-white hover:bg-orange-600/70"
                      }`}
                  >
                    {series === "all" ? "All Series" : series}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSortBy("newest")}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[10px] sm:text-xs flex items-center gap-1 whitespace-nowrap ${sortBy === "newest"
                    ? "bg-white text-orange-600"
                    : "bg-orange-600/50 text-white"
                    }`}
                >
                  <Sparkles size={11} strokeWidth={2.5} className="sm:w-3 sm:h-3" />
                  Newest
                </button>
                <button
                  onClick={() => setSortBy("price_asc")}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[10px] sm:text-xs flex items-center gap-1 whitespace-nowrap ${sortBy === "price_asc"
                    ? "bg-white text-orange-600"
                    : "bg-orange-600/50 text-white"
                    }`}
                >
                  <Wallet size={11} strokeWidth={2.5} className="sm:w-3 sm:h-3" />
                  Low → High
                </button>
                <button
                  onClick={() => setSortBy("price_desc")}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[10px] sm:text-xs flex items-center gap-1 whitespace-nowrap ${sortBy === "price_desc"
                    ? "bg-white text-orange-600"
                    : "bg-orange-600/50 text-white"
                    }`}
                >
                  <Gem size={11} strokeWidth={2.5} className="sm:w-3 sm:h-3" />
                  High → Low
                </button>
              </div>
            </div>
          )}

          {/* My Listings Filter */}
          {activeTab === "my-listings" && (
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {["all", "active", "sold", "cancelled"].map((status) => (
                <button
                  key={status}
                  onClick={() => setMyListingsFilter(status)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${myListingsFilter === status
                    ? "bg-white text-orange-600 shadow-lg"
                    : "bg-orange-600/50 text-white hover:bg-orange-600/70"
                    }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Browse Listings */}
        {activeTab === "browse" && (
          <div className="flex-1 px-3 sm:px-4 mb-4">
            <div className="bg-orange-700/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-3 sm:p-4 min-h-[300px]">
              {loadingListings ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/60 text-sm">Loading listings...</p>
                  </div>
                </div>
              ) : listings.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {listings.map((listing, index) => (
                    <div
                      key={listing.id}
                      onClick={() => {
                        setSelectedListing(listing);
                        setShowDetailModal(true);
                      }}
                      className={`relative bg-gradient-to-br ${rarityColorMap[listing.car.rarity] || "from-gray-500 to-gray-600"
                        } rounded-2xl p-3 shadow-xl cursor-pointer transition-transform hover:scale-105 active:scale-[0.98] group marketplace-card animate-rise`}
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      {/* Rarity Badge */}
                      <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 bg-black/60 backdrop-blur-sm rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 z-10">
                        <span className="text-white text-[9px] sm:text-[10px] font-black uppercase">
                          {listing.car.rarity}
                        </span>
                      </div>

                      {/* Token ID Badge */}
                      <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 bg-black/60 backdrop-blur-sm rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 z-10">
                        <span className="text-white text-[9px] sm:text-[10px] font-bold">
                          #{listing.car.tokenId}
                        </span>
                      </div>

                      {/* Car Image */}
                      <div className="aspect-square flex items-center justify-center mb-1.5 sm:mb-2">
                        <img
                          src={`/assets/car/${listing.car.modelName}.png`}
                          alt={listing.car.modelName}
                          className="w-full h-full object-contain drop-shadow-2xl"
                          onError={(e) => {
                            e.target.src = "/assets/car/placeholder.png";
                          }}
                        />
                      </div>

                      {/* Car Info */}
                      <div className="text-center px-0.5 sm:px-1 mb-1.5 sm:mb-2">
                        <p className="text-white text-[10px] sm:text-xs font-black uppercase truncate">
                          {listing.car.modelName}
                        </p>
                        <p className="text-white/70 text-[8px] sm:text-[10px] font-semibold truncate">
                          {listing.car.series}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="bg-yellow-400 rounded-full py-0.5 sm:py-1 px-1.5 sm:px-2 flex items-center justify-center gap-0.5 sm:gap-1">
                        <span className="text-orange-900 text-[10px] sm:text-xs font-black">
                          {listing.price.toLocaleString()}
                        </span>
                        <span className="text-orange-900 text-[7px] sm:text-[8px] font-bold">IDRX</span>
                      </div>

                      <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-black/40 opacity-0 transition-opacity duration-200 flex items-center justify-center group-hover:opacity-100 group-active:opacity-100">
                        <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-black/60 text-orange-200 text-[9px] sm:text-[10px] font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase">
                          View
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[280px]">
                  <div className="text-center px-4">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <ShoppingBag size={40} className="text-white/40" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-white text-xl font-black mb-2">
                      No Listings Found
                    </h3>
                    <p className="text-white/60 text-sm mb-6 max-w-[220px] mx-auto">
                      {seriesFilter !== "all"
                        ? "Try a different series filter or check back later"
                        : "Be the first to list your car on the marketplace!"}
                    </p>
                    <button
                      onClick={handleSellClick}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-3 px-6 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto"
                    >
                      <Tag size={18} strokeWidth={2.5} />
                      Sell Your Car
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Listings */}
        {activeTab === "my-listings" && (
          <div className="flex-1 px-3 sm:px-4 mb-4">
            <div className="bg-orange-700/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-3 sm:p-4 min-h-[300px]">
              {loadingMyListings ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/60 text-sm">Loading...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {myListingsFilter === "all"
                    ? myListings.all.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        onCancel={handleCancelListing}
                        onClick={() => {
                          setSelectedListing(listing);
                          setShowDetailModal(true);
                        }}
                      />
                    ))
                    : myListings[myListingsFilter]?.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        onCancel={handleCancelListing}
                        onClick={() => {
                          setSelectedListing(listing);
                          setShowDetailModal(true);
                        }}
                      />
                    ))}
                  {((myListingsFilter === "all" && myListings.all.length === 0) ||
                    (myListingsFilter !== "all" && myListings[myListingsFilter]?.length === 0)) && (
                      <div className="flex items-center justify-center min-h-[280px]">
                        <div className="text-center px-4">
                          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <List size={40} className="text-white/40" strokeWidth={1.5} />
                          </div>
                          <h3 className="text-white text-xl font-black mb-2">
                            {myListingsFilter === "all" ? "No Listings Yet" : `No ${myListingsFilter.charAt(0).toUpperCase() + myListingsFilter.slice(1)} Listings`}
                          </h3>
                          <p className="text-white/60 text-sm mb-6 max-w-[220px] mx-auto">
                            {myListingsFilter === "all"
                              ? "Start selling your cars to earn IDRX!"
                              : `You don't have any ${myListingsFilter} listings`}
                          </p>
                          {myListingsFilter === "all" && (
                            <button
                              onClick={handleSellClick}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-3 px-6 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto"
                            >
                              <Tag size={18} strokeWidth={2.5} />
                              List Your First Car
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </PullToRefresh>

      {/* Buy Modal */}
      {showBuyModal && selectedListing && (
        <BuyModal
          listing={selectedListing}
          step={buyStep}
          error={buyError}
          txHash={buyTxHash}
          balance={mockIDRXBalance}
          onClose={() => setShowBuyModal(false)}
          onApprove={handleBuyApprove}
        />
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <SellModal
          step={sellStep}
          car={sellCar}
          price={sellPrice}
          error={sellError}
          cars={myCars}
          onClose={() => setShowSellModal(false)}
          onSelectCar={handleSellSelectCar}
          onSetPrice={(price) => setSellPrice(price)}
          onConfirmPrice={handleSellSetPrice}
          onApprove={handleSellApprove}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedListing && (
        <DetailModal
          listing={selectedListing}
          balance={mockIDRXBalance}
          onClose={() => setShowDetailModal(false)}
          onBuy={() => {
            setShowDetailModal(false);
            handleBuyClick(selectedListing);
          }}
          onCancel={activeTab === "my-listings" ? handleCancelListing : null}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </main>
  );
}

// Listing Card Component for My Listings
function ListingCard({ listing, onCancel, onClick }) {
  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: "bg-green-500", text: "Active" },
      sold: { bg: "bg-blue-500", text: "Sold" },
      cancelled: { bg: "bg-gray-500", text: "Cancelled" },
      processing: { bg: "bg-yellow-500", text: "Processing" },
    };
    const badge = badges[status] || badges.active;
    return (
      <span className={`${badge.bg} text-white text-xs font-bold px-2 py-1 rounded-full`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${rarityColorMap[listing.car.rarity] || "from-gray-500 to-gray-600"
        } rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-transform marketplace-card`}
    >
      <div className="flex gap-2 sm:gap-3">
        {/* Car Image */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
          <img
            src={`/assets/car/${listing.car.modelName}.png`}
            alt={listing.car.modelName}
            className="w-full h-full object-contain drop-shadow-xl"
            onError={(e) => {
              e.target.src = "/assets/car/placeholder.png";
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-1 gap-2">
              <h3 className="text-white font-black text-xs sm:text-sm uppercase truncate">
                {listing.car.modelName}
              </h3>
              {getStatusBadge(listing.status)}
            </div>
            <p className="text-white/70 text-[10px] sm:text-xs mb-2 truncate">{listing.car.series}</p>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <span className="text-yellow-300 text-xs sm:text-sm font-black">
                {listing.price.toLocaleString()}
              </span>
              <span className="text-yellow-300 text-[9px] sm:text-[10px] font-bold">IDRX</span>
            </div>
          </div>

          {/* Actions */}
          {listing.status === "active" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel(listing.id);
              }}
              className="bg-red-500 hover:bg-red-600 text-white text-[10px] sm:text-xs font-bold py-1 px-2.5 sm:px-3 rounded-full mt-2"
            >
              Cancel
            </button>
          )}
          {listing.status === "sold" && listing.buyer && (
            <p className="text-white/60 text-[9px] sm:text-[10px] mt-1">
              Sold to {listing.buyer?.username
                || (listing.buyer?.walletAddress
                  ? `${listing.buyer.walletAddress.slice(0, 6)}...${listing.buyer.walletAddress.slice(-4)}`
                  : 'Unknown')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Buy Modal Component
function BuyModal({ listing, step, error, txHash, balance, onClose, onApprove }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl">
        {step === "approve" && (
          <>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-3 sm:mb-4">Buy NFT</h3>
            <div className="bg-white/20 rounded-2xl p-4 mb-4">
              <p className="text-white font-bold mb-2">{listing.car.modelName}</p>
              <p className="text-white/70 text-sm mb-3">{listing.car.series}</p>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Price:</span>
                <span className="text-yellow-300 font-black">
                  {listing.price.toLocaleString()} IDRX
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-white text-sm">Your Balance:</span>
                <span
                  className={`font-black ${balance >= listing.price ? "text-green-300" : "text-red-300"
                    }`}
                >
                  {Math.floor(balance).toLocaleString()} IDRX
                </span>
              </div>
            </div>
            {balance < listing.price && (
              <div className="bg-red-500/30 border border-red-400 rounded-xl p-3 mb-4">
                <p className="text-red-100 text-xs">⚠️ Insufficient balance!</p>
              </div>
            )}
            <p className="text-white/80 text-sm mb-4">
              This will approve and purchase the NFT in one transaction.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 bg-white/20 text-white font-bold py-3 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={onApprove}
                disabled={balance < listing.price}
                className="flex-1 bg-white text-orange-600 font-black py-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buy Now
              </button>
            </div>
          </>
        )}
        {step === "buying" && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-14 w-14 sm:h-16 sm:w-16 border-b-4 border-white mx-auto mb-4"></div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">Processing...</h3>
            <p className="text-white/80 text-xs sm:text-sm">
              Approving IDRX and completing purchase...
            </p>
          </div>
        )}
        {step === "success" && (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <PartyPopper size={56} className="text-white sm:w-16 sm:h-16" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">Purchase Complete!</h3>
            <p className="text-white/80 text-sm mb-4">
              The NFT is now yours. Check your inventory!
            </p>
            {txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-300 text-xs underline"
              >
                View Transaction
              </a>
            )}
            <button
              onClick={onClose}
              className="w-full bg-white text-orange-600 font-black py-3 rounded-full mt-4"
            >
              Close
            </button>
          </div>
        )}
        {step === "error" && (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <Frown size={56} className="text-white sm:w-16 sm:h-16" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">Purchase Failed</h3>
            <p className="text-white/80 text-sm mb-4">{error}</p>
            <button
              onClick={onClose}
              className="w-full bg-white text-orange-600 font-black py-3 rounded-full"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Sell Modal Component
function SellModal({
  step,
  car,
  price,
  error,
  cars,
  onClose,
  onSelectCar,
  onSetPrice,
  onConfirmPrice,
  onApprove,
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl my-8">
        {step === "select" && (
          <>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-3 sm:mb-4">Select NFT to Sell</h3>
            <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
              {cars.length > 0 ? (
                cars.map((c) => (
                  <div
                    key={c.tokenId}
                    onClick={() => onSelectCar(c)}
                    className="bg-white/20 rounded-xl p-3 cursor-pointer hover:bg-white/30 transition-colors"
                  >
                    <div className="flex gap-3 items-center">
                      <img
                        src={`/assets/car/${c.modelName}.png`}
                        alt={c.modelName}
                        className="w-16 h-16 object-contain"
                        onError={(e) => {
                          e.target.src = "/assets/car/placeholder.png";
                        }}
                      />
                      <div>
                        <p className="text-white font-bold text-sm">{c.modelName}</p>
                        <p className="text-white/70 text-xs">{c.series}</p>
                        <p className="text-yellow-300 text-xs">#{c.tokenId}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-white/60 text-center py-8">No cars available to sell</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full bg-white/20 text-white font-bold py-3 rounded-full"
            >
              Cancel
            </button>
          </>
        )}
        {step === "price" && car && (
          <>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-3 sm:mb-4">Set Price</h3>
            <div className="bg-white/20 rounded-xl p-4 mb-4">
              <p className="text-white font-bold mb-1">{car.modelName}</p>
              <p className="text-white/70 text-xs">#{car.tokenId}</p>
            </div>
            <div className="mb-4">
              <label className="text-white text-sm font-bold mb-2 block">
                Price in IDRX:
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => onSetPrice(e.target.value)}
                placeholder="Enter price..."
                className="w-full bg-white/20 border-2 border-white/30 rounded-xl px-4 py-3 text-white font-bold placeholder-white/50 outline-none focus:border-white"
              />
              {error && (
                <p className="text-red-200 text-xs mt-2">{error}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onSelectCar(null)}
                className="flex-1 bg-white/20 text-white font-bold py-3 rounded-full"
              >
                Back
              </button>
              <button
                onClick={onConfirmPrice}
                className="flex-1 bg-white text-green-600 font-black py-3 rounded-full"
              >
                Next
              </button>
            </div>
          </>
        )}
        {step === "approve" && car && (
          <>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-3 sm:mb-4">Confirm Listing</h3>
            <div className="bg-white/20 rounded-xl p-4 mb-4">
              <p className="text-white font-bold mb-1">{car.modelName}</p>
              <p className="text-white/70 text-xs mb-3">#{car.tokenId}</p>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">List Price:</span>
                <span className="text-yellow-300 font-black">
                  {parseFloat(price).toLocaleString()} IDRX
                </span>
              </div>
            </div>
            <p className="text-white/80 text-sm mb-4">
              This will approve the NFT for transfer and create the listing.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 bg-white/20 text-white font-bold py-3 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={onApprove}
                className="flex-1 bg-white text-green-600 font-black py-3 rounded-full"
              >
                List NFT
              </button>
            </div>
          </>
        )}
        {step === "listing" && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-14 w-14 sm:h-16 sm:w-16 border-b-4 border-white mx-auto mb-4"></div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">Creating Listing...</h3>
            <p className="text-white/80 text-sm">
              Approving NFT and creating listing...
            </p>
          </div>
        )}
        {step === "success" && (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle size={56} className="text-white sm:w-16 sm:h-16" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">Listed Successfully!</h3>
            <p className="text-white/80 text-sm mb-4">
              Your NFT is now on the marketplace!
            </p>
            <button
              onClick={onClose}
              className="w-full bg-white text-green-600 font-black py-3 rounded-full"
            >
              Close
            </button>
          </div>
        )}
        {step === "error" && (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <X size={56} className="text-white sm:w-16 sm:h-16" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">Listing Failed</h3>
            <p className="text-white/80 text-sm mb-4">{error}</p>
            <button
              onClick={onClose}
              className="w-full bg-white text-green-600 font-black py-3 rounded-full"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Detail Modal Component
function DetailModal({ listing, balance, onClose, onBuy, onCancel }) {
  const isOwner = onCancel !== null;
  const canBuy = !isOwner && listing.status === "active" && balance >= listing.price;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-gradient-to-br ${rarityColorMap[listing.car.rarity] || "from-gray-500 to-gray-600"
          } rounded-3xl p-6 max-w-sm w-full shadow-2xl`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-black text-white">NFT Details</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={18} className="text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Car Image */}
        <div className="bg-white/10 rounded-2xl p-6 mb-4">
          <img
            src={`/assets/car/${listing.car.modelName}.png`}
            alt={listing.car.modelName}
            className="w-full h-48 object-contain drop-shadow-2xl"
            onError={(e) => {
              e.target.src = "/assets/car/placeholder.png";
            }}
          />
        </div>

        {/* Info */}
        <div className="bg-white/20 rounded-2xl p-4 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">Name:</span>
            <span className="text-white font-bold">{listing.car.modelName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">Series:</span>
            <span className="text-white font-bold">{listing.car.series}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">Rarity:</span>
            <span className="text-white font-bold uppercase">{listing.car.rarity}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">Token ID:</span>
            <span className="text-white font-bold">#{listing.car.tokenId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">Price:</span>
            <span className="text-yellow-300 font-black text-lg">
              {listing.price.toLocaleString()} IDRX
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">Seller:</span>
            <span className="text-white font-bold text-sm">
              {listing.seller?.username
                || (listing.seller?.walletAddress
                  ? `${listing.seller.walletAddress.slice(0, 6)}...${listing.seller.walletAddress.slice(-4)}`
                  : 'Unknown')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">Status:</span>
            <span className="text-white font-bold uppercase">{listing.status}</span>
          </div>
        </div>

        {/* Actions */}
        {!isOwner && listing.status === "active" && (
          <button
            onClick={onBuy}
            disabled={!canBuy}
            className="w-full bg-white text-orange-600 font-black py-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!canBuy && balance < listing.price
              ? "Insufficient Balance"
              : "Buy Now"}
          </button>
        )}
        {isOwner && listing.status === "active" && (
          <button
            onClick={() => {
              onClose();
              onCancel(listing.id);
            }}
            className="w-full bg-red-500 text-white font-black py-3 rounded-full"
          >
            Cancel Listing
          </button>
        )}
        {listing.status !== "active" && (
          <button
            onClick={onClose}
            className="w-full bg-white/20 text-white font-bold py-3 rounded-full"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
