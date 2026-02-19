"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Tag, Search, List, Sparkles, Gem,
  ShoppingBag, X
} from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { PullToRefresh } from "@/components/shared";
import { RARITY_CONFIG } from "@/constants";

const RARITY_MAP = { 0: "common", 1: "rare", 2: "epic", 3: "legendary" };

// Map car/part name → image
const getItemImage = (name = "") => {
  const n = name.toLowerCase();
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
  if (n.includes("porsche 911 turbo")) return "/assets/car_no_background/01-Porche-911-Turbo-removebg-preview.png";
  if (n.includes("porsche")) return "/assets/car_no_background/13-Proche-911-removebg-preview.png";
  if (n.includes("720s") || n.includes("mclaren")) return "/assets/car_no_background/14-McLAREN-720s-removebg-preview.png";
  if (n.includes("body")) return "/assets/Fragments/Body.png";
  if (n.includes("engine")) return "/assets/Fragments/Engine.png";
  if (n.includes("wheel")) return "/assets/Fragments/Wheels.png";
  return "/assets/car/High Speed.png";
};

// Helper: get rarity config from listing
function getRarityConfig(listing) {
  const item = listing.car || listing.sparePart;
  if (!item) return RARITY_CONFIG.common;
  const rarityKey =
    typeof item.rarity === "number"
      ? RARITY_MAP[item.rarity]
      : item.rarity?.toLowerCase() || "common";
  return RARITY_CONFIG[rarityKey] || RARITY_CONFIG.common;
}

function getItemName(listing) {
  return listing.car?.name || listing.sparePart?.name || "Unknown";
}


export default function MarketplacePage() {
  const { isConnected, walletAddress, getAuthToken } = useWallet();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("browse");

  // Browse state
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [typeFilter, setTypeFilter] = useState("all"); // all | car | sparePart

  // My listings state
  const [myListings, setMyListings] = useState([]);
  const [soldListings, setSoldListings] = useState([]);
  const [loadingMyListings, setLoadingMyListings] = useState(false);
  const [myTab, setMyTab] = useState("active"); // active | sold

  // Detail modal
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  // Fetch all listings
  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams({ sortBy });
      if (typeFilter !== "all") params.append("nftType", typeFilter);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/listings?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setListings(data.data || []);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
      toast.error("Failed to load listings");
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  }, [getAuthToken, sortBy, typeFilter]);

  // Fetch my listings and sold
  const fetchMyListings = useCallback(async () => {
    setLoadingMyListings(true);
    try {
      const token = await getAuthToken();
      const [activeRes, soldRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/my-listings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/sold`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const activeData = await activeRes.json();
      const soldData = await soldRes.json();
      setMyListings(activeData.data || []);
      setSoldListings(soldData.data || []);
    } catch (err) {
      console.error("Failed to fetch my listings:", err);
      toast.error("Failed to load your listings");
    } finally {
      setLoadingMyListings(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    if (isConnected) fetchListings();
  }, [isConnected, fetchListings]);

  useEffect(() => {
    if (isConnected && activeTab === "my-listings") fetchMyListings();
  }, [isConnected, activeTab, fetchMyListings]);

  const handleRefresh = async () => {
    if (activeTab === "browse") await fetchListings();
    else await fetchMyListings();
  };

  if (!isConnected) return null;

  const displayedMyListings = myTab === "active" ? myListings : soldListings;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-white overflow-hidden">
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
          <header className="px-4 pt-3 pb-4">
            <div className="flex items-center justify-end mb-3">
              {walletAddress && (
                <div className="bg-emerald-500 border-2 border-emerald-400 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-xs font-bold">
                    {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-4xl font-black text-white mb-4 flex items-center gap-3">
              <ShoppingBag size={36} strokeWidth={2.5} />
              Marketplace
            </h1>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab("browse")}
                className={`flex-1 py-3 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === "browse"
                    ? "bg-white text-orange-600 shadow-lg"
                    : "bg-orange-600/50 text-white"
                }`}
              >
                <Search size={16} strokeWidth={2.5} />
                Browse
              </button>
              <button
                onClick={() => setActiveTab("my-listings")}
                className={`flex-1 py-3 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === "my-listings"
                    ? "bg-white text-orange-600 shadow-lg"
                    : "bg-orange-600/50 text-white"
                }`}
              >
                <List size={16} strokeWidth={2.5} />
                My Listings
              </button>
            </div>

            {/* Browse Filters */}
            {activeTab === "browse" && (
              <div className="space-y-2">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {["all", "car", "sparePart"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                        typeFilter === t
                          ? "bg-white text-orange-600 shadow-lg"
                          : "bg-orange-600/50 text-white"
                      }`}
                    >
                      {t === "all" ? "All" : t === "car" ? "Cars" : "Parts"}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {[
                    { key: "newest", label: "Newest", Icon: Sparkles },
                    { key: "price_asc", label: "↑ Price", Icon: null },
                    { key: "price_desc", label: "↓ Price", Icon: Gem },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setSortBy(key)}
                      className={`px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
                        sortBy === key
                          ? "bg-white text-orange-600"
                          : "bg-orange-600/50 text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* My Listings Sub-tabs */}
            {activeTab === "my-listings" && (
              <div className="flex gap-2">
                {["active", "sold"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setMyTab(t)}
                    className={`px-4 py-2 rounded-full font-bold text-sm capitalize transition-all ${
                      myTab === t
                        ? "bg-white text-orange-600 shadow-lg"
                        : "bg-orange-600/50 text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </header>

          {/* Browse Content */}
          {activeTab === "browse" && (
            <div className="flex-1 px-4 mb-4">
              <div className="bg-orange-700/50 backdrop-blur-sm rounded-3xl p-4 min-h-[300px]">
                {loadingListings ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                  </div>
                ) : listings.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {listings.map((listing) => {
                      const rc = getRarityConfig(listing);
                      const name = getItemName(listing);
                      return (
                        <div
                          key={listing.listingId}
                          onClick={() => setSelectedListing(listing)}
                          className={`relative bg-gradient-to-br ${rc.gradient} rounded-2xl p-3 shadow-xl cursor-pointer hover:scale-105 active:scale-[0.98] transition-transform`}
                        >
                          {/* Rarity */}
                          <div className="absolute top-2 left-2 bg-black/60 rounded-full px-2 py-0.5">
                            <span className="text-white text-[9px] font-black uppercase">{rc.label}</span>
                          </div>

                          {/* NFT type badge */}
                          <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5">
                            <span className="text-white text-[9px] font-bold">
                              {listing.nftType === "car" ? "🚗" : "🔧"}
                            </span>
                          </div>

                          {/* Image */}
                          <div className="aspect-square flex items-center justify-center mb-2 mt-4">
                            <img
                              src={getItemImage(name)}
                              alt={name}
                              className="w-full h-full object-contain drop-shadow-2xl"
                              onError={(e) => { e.target.src = "/assets/car/High Speed.png"; }}
                            />
                          </div>

                          {/* Name */}
                          <p className="text-white text-xs font-black uppercase truncate text-center mb-1">{name}</p>

                          {/* Price */}
                          <div className="bg-yellow-400 rounded-full py-1 flex items-center justify-center">
                            <span className="text-orange-900 text-xs font-black">
                              {Number(listing.price).toLocaleString()} ONE
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48">
                    <ShoppingBag size={40} className="text-white/30 mb-3" />
                    <p className="text-white/60 font-bold">No listings found</p>
                    <p className="text-white/40 text-sm">Try a different filter</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* My Listings Content */}
          {activeTab === "my-listings" && (
            <div className="flex-1 px-4 mb-4">
              <div className="bg-orange-700/50 backdrop-blur-sm rounded-3xl p-4 min-h-[300px]">
                {loadingMyListings ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                  </div>
                ) : displayedMyListings.length > 0 ? (
                  <div className="space-y-3">
                    {displayedMyListings.map((listing) => {
                      const rc = getRarityConfig(listing);
                      const name = getItemName(listing);
                      return (
                        <div
                          key={listing.listingId}
                          onClick={() => setSelectedListing(listing)}
                          className={`bg-gradient-to-br ${rc.gradient} rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-transform`}
                        >
                          <div className="flex gap-3 items-center">
                            <img
                              src={getItemImage(name)}
                              alt={name}
                              className="w-16 h-16 object-contain flex-shrink-0"
                              onError={(e) => { e.target.src = "/assets/car/High Speed.png"; }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-black text-sm uppercase truncate">{name}</p>
                              <p className="text-white/60 text-xs">
                                {listing.nftType === "car" ? "Car" : "Spare Part"}
                              </p>
                              <p className="text-yellow-300 font-black text-sm mt-1">
                                {Number(listing.price).toLocaleString()} ONE
                              </p>
                              {listing.isSold && listing.soldAt && (
                                <p className="text-green-300 text-xs">
                                  Sold {new Date(listing.soldAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              listing.isSold ? "bg-blue-500 text-white" :
                              listing.isActive ? "bg-green-500 text-white" :
                              "bg-gray-500 text-white"
                            }`}>
                              {listing.isSold ? "Sold" : listing.isActive ? "Active" : "Ended"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48">
                    <List size={40} className="text-white/30 mb-3" />
                    <p className="text-white/60 font-bold">No {myTab} listings</p>
                    {myTab === "active" && (
                      <p className="text-white/40 text-sm mt-1">Go to Inventory to sell your NFTs</p>
                    )}
                  </div>
                )}

                {/* Link to inventory for selling */}
                {activeTab === "my-listings" && myTab === "active" && (
                  <button
                    onClick={() => router.push("/inventory")}
                    className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Tag size={16} />
                    Go to Inventory to Sell
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`bg-gradient-to-br ${getRarityConfig(selectedListing).gradient} rounded-3xl p-6 max-w-sm w-full shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-white">Listing Details</h3>
              <button
                onClick={() => setSelectedListing(null)}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Image */}
            <div className="bg-white/10 rounded-2xl p-4 mb-4">
              <img
                src={getItemImage(getItemName(selectedListing))}
                alt={getItemName(selectedListing)}
                className="w-full h-40 object-contain"
                onError={(e) => { e.target.src = "/assets/car/High Speed.png"; }}
              />
            </div>

            {/* Info */}
            <div className="bg-white/20 rounded-xl p-4 space-y-2 mb-4">
              {[
                ["Name", getItemName(selectedListing)],
                ["Type", selectedListing.nftType === "car" ? "Car NFT" : "Spare Part"],
                ["Rarity", getRarityConfig(selectedListing).label],
                ["Price", `${Number(selectedListing.price).toLocaleString()} ONE`],
                ["Seller", selectedListing.sellerUser?.username ||
                  (selectedListing.sellerUser?.address
                    ? `${selectedListing.sellerUser.address.slice(0, 6)}...${selectedListing.sellerUser.address.slice(-4)}`
                    : "Unknown")],
                ["Status", selectedListing.isSold ? "Sold" : selectedListing.isActive ? "Active" : "Ended"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">{label}:</span>
                  <span className="text-white font-bold text-sm">{value}</span>
                </div>
              ))}
            </div>

            {/* Note: Buy requires on-chain tx */}
            {selectedListing.isActive && !selectedListing.isSold && (
              <div className="bg-black/20 rounded-xl p-3 mb-4">
                <p className="text-white/70 text-xs text-center">
                  On-chain purchase coming soon via OneChain wallet
                </p>
              </div>
            )}

            <button
              onClick={() => setSelectedListing(null)}
              className="w-full bg-white/20 text-white font-bold py-3 rounded-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <BottomNavigation />
    </main>
  );
}
