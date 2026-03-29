"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Tag, Search, List, Sparkles, Gem,
  ShoppingBag, X, Plus, Trash2
} from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { PullToRefresh } from "@/components/shared";
import PageHeader from "@/components/shared/PageHeader";
import { RARITY_CONFIG } from "@/constants";
import { useSignAndExecuteTransaction } from "@onelabs/dapp-kit";
import { Transaction } from "@onelabs/sui/transactions";

const PACKAGE_ID     = process.env.NEXT_PUBLIC_PACKAGE_ID;
const MARKETPLACE_ID = process.env.NEXT_PUBLIC_MARKETPLACE_ID;
const OCT_TYPE       = "0x2::oct::OCT";
const EXPIRY_MS      = (Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

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
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Find on-chain objectId via backend proxy (avoids CORS)
  const getOnChainObjectId = useCallback(async (nftType, name, uid) => {
    if (!walletAddress) return null;
    let token = await getAuthToken();
    const typeStr = nftType === "car"
      ? `${PACKAGE_ID}::car::Car`
      : `${PACKAGE_ID}::sparepart::SparePart`;

    let res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/owned-objects?structType=${encodeURIComponent(typeStr)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 401) {
      localStorage.removeItem("auth_token");
      token = await getAuthToken();
      res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/owned-objects?structType=${encodeURIComponent(typeStr)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
    const data = await res.json();
    console.log("[Marketplace] owned objects:", JSON.stringify(data.data?.slice(0, 2)));
    for (const obj of data.data || []) {
      const fields = obj.data?.content?.fields;
      if (!fields) continue;
      // Match by uid first (most reliable), then by name
      if (uid && (fields.uid === uid || fields.id === uid)) return obj.data.objectId;
      if (fields.name === name) return obj.data.objectId;
      // Partial match: DB name includes "#number" suffix, blockchain may not
      if (name && fields.name && name.startsWith(fields.name)) return obj.data.objectId;
    }
    return null;
  }, [walletAddress, getAuthToken]);

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

  // Sell modal
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellInventory, setSellInventory] = useState({ cars: [], parts: [] });
  const [loadingSellInventory, setLoadingSellInventory] = useState(false);
  const [sellItem, setSellItem] = useState(null); // { nftType, uid, name, imageUrl }
  const [sellPrice, setSellPrice] = useState("");
  const [listing, setListing] = useState(false);

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

  const openSellModal = async () => {
    setShowSellModal(true);
    setSellItem(null);
    setSellPrice("");
    setLoadingSellInventory(true);
    try {
      const token = await getAuthToken();
      const [carsRes, partsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/cars`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/spareparts`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const carsData = await carsRes.json();
      const partsData = await partsRes.json();
      setSellInventory({
        cars: (carsData.data || []).filter((c) => !c.isListed && !c.isClaimed),
        parts: (partsData.data || []).filter((p) => !p.isListed && !p.isClaimed && !p.isEquipped),
      });
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoadingSellInventory(false);
    }
  };

  const handleList = async () => {
    if (!sellItem) { toast.error("Select an item to list"); return; }
    const priceNum = parseFloat(sellPrice);
    if (!sellPrice || isNaN(priceNum) || priceNum <= 0) { toast.error("Enter a valid price"); return; }
    const priceMist = BigInt(Math.floor(priceNum * 1_000_000_000)); // OCT → MIST
    if (!MARKETPLACE_ID) { toast.error("Marketplace not configured"); return; }
    setListing(true);
    try {
      // 1. Find on-chain object ID
      toast.loading("Finding NFT on-chain...", { id: "list-tx" });
      const objectId = await getOnChainObjectId(sellItem.nftType, sellItem.name, sellItem.uid);
      if (!objectId) throw new Error("NFT not found in wallet. Make sure it's minted on-chain.");

      // 2. Build on-chain transaction
      const tx = new Transaction();
      const fnName = sellItem.nftType === "car" ? "list_car" : "list_sparepart";
      tx.moveCall({
        target: `${PACKAGE_ID}::marketplace::${fnName}`,
        typeArguments: [OCT_TYPE],
        arguments: [
          tx.object(MARKETPLACE_ID),
          tx.object(objectId),
          tx.pure.u64(priceMist),
          tx.pure.u64(BigInt(EXPIRY_MS)),
        ],
      });

      toast.loading("Waiting for wallet approval...", { id: "list-tx" });
      const result = await signAndExecute({
        transaction: tx,
        options: { showEvents: true, showObjectChanges: true },
      });

      // 3. Parse on-chain listing ID
      let onChainListingId = null;
      console.log("[Marketplace] signAndExecute result:", JSON.stringify(result));

      // Try from result.events directly (if hook returns them)
      if (result?.events?.length) {
        for (const ev of result.events) {
          const p = ev.parsedJson || {};
          const id = p.listing_id ?? p.id ?? p.listingId ?? p.listing ?? p.list_id;
          if (id !== undefined && id !== null) { onChainListingId = String(id); break; }
        }
      }

      // Fallback: fetch events from backend proxy
      if (onChainListingId === null && result?.digest) {
        try {
          const token2 = await getAuthToken();
          // Small delay to let RPC index the TX
          await new Promise(r => setTimeout(r, 2000));
          const evRes = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/tx-events/${result.digest}`,
            { headers: { Authorization: `Bearer ${token2}` } }
          );
          const evData = await evRes.json();
          console.log("[Marketplace] TX events from proxy:", JSON.stringify(evData));
          for (const ev of (evData.events || [])) {
            const p = ev.parsedJson || {};
            const id = p.listing_id ?? p.id ?? p.listingId ?? p.listing ?? p.list_id;
            if (id !== undefined && id !== null) { onChainListingId = String(id); break; }
          }
          // Also check objectChanges for created objects
          if (onChainListingId === null) {
            const changes = evData.objectChanges || result?.objectChanges || [];
            console.log("[Marketplace] objectChanges:", JSON.stringify(changes));
          }
        } catch (e) {
          console.warn("[Marketplace] Could not fetch events:", e);
        }
      }
      console.log("[Marketplace] onChainListingId:", onChainListingId);

      // 4. Record in backend DB
      toast.loading("Saving to database...", { id: "list-tx" });
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/list`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          nftType: sellItem.nftType,
          nftUid: sellItem.uid,
          price: priceMist.toString(),
          ...(result?.digest && { txDigest: result.digest }),
          ...(onChainListingId !== null && { onChainListingId }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save listing");

      toast.success("Item listed on-chain!", { id: "list-tx" });
      setShowSellModal(false);
      fetchMyListings();
      fetchListings();
    } catch (err) {
      const msg = err.message || "Failed to list item";
      const isRejected = msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("denied");
      toast.error(isRejected ? "Transaction cancelled." : msg, { id: "list-tx" });
    } finally {
      setListing(false);
    }
  };

  const handleDelist = async (listing) => {
    if (!MARKETPLACE_ID) { toast.error("Marketplace not configured"); return; }
    try {
      // 1. Cancel on-chain if we have onChainListingId
      if (listing.onChainListingId !== null && listing.onChainListingId !== undefined) {
        toast.loading("Cancelling on-chain...", { id: "delist-tx" });
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::marketplace::cancel_listing`,
          typeArguments: [OCT_TYPE],
          arguments: [
            tx.object(MARKETPLACE_ID),
            tx.pure.u64(BigInt(listing.onChainListingId)),
          ],
        });
        await signAndExecute({ transaction: tx });
        toast.loading("Updating database...", { id: "delist-tx" });
      }

      // 2. Update backend DB
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/listing/${listing.listingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel listing");
      toast.success("Listing cancelled", { id: "delist-tx" });
      fetchMyListings();
    } catch (err) {
      const msg = err.message || "Failed to cancel";
      const isRejected = msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("denied");
      toast.error(isRejected ? "Transaction cancelled." : msg, { id: "delist-tx" });
    }
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
          <header className="pt-0 pb-4">
            <PageHeader />

            <h1 className="text-4xl font-black text-white mb-4 px-4 flex items-center gap-3">
              <ShoppingBag size={36} strokeWidth={2.5} />
              Marketplace
            </h1>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-4 px-4">
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
              <div className="space-y-2 px-4">
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
              <div className="flex items-center gap-2 px-4">
                <div className="flex gap-2 flex-1">
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
                {/* Sell button */}
                <button
                  onClick={openSellModal}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-black px-4 py-2 rounded-full text-sm transition-all active:scale-95 flex-shrink-0"
                >
                  <Plus size={16} />
                  Sell
                </button>
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
                              src={listing.car?.imageUrl || listing.sparePart?.imageUrl || getItemImage(name)}
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
                              {(Number(listing.price) / 1_000_000_000).toLocaleString()} ONE
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
                              src={listing.car?.imageUrl || listing.sparePart?.imageUrl || getItemImage(name)}
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
                                {(Number(listing.price) / 1_000_000_000).toLocaleString()} ONE
                              </p>
                              {listing.isSold && listing.soldAt && (
                                <p className="text-green-300 text-xs">
                                  Sold {new Date(listing.soldAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                listing.isSold ? "bg-blue-500 text-white" :
                                listing.isActive ? "bg-green-500 text-white" :
                                "bg-gray-500 text-white"
                              }`}>
                                {listing.isSold ? "Sold" : listing.isActive ? "Active" : "Ended"}
                              </span>
                              {listing.isActive && !listing.isSold && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelist(listing); }}
                                  className="flex items-center gap-1 bg-red-500/80 hover:bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full transition-all"
                                >
                                  <Trash2 size={10} /> Cancel
                                </button>
                              )}
                            </div>
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

                {activeTab === "my-listings" && myTab === "active" && (
                  <button
                    onClick={openSellModal}
                    className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Plus size={16} />
                    List New Item
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
                src={selectedListing.car?.imageUrl || selectedListing.sparePart?.imageUrl || getItemImage(getItemName(selectedListing))}
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
                ["Price", `${(Number(selectedListing.price) / 1_000_000_000).toLocaleString()} ONE`],
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

            {/* Buy button */}
            {selectedListing.isActive && !selectedListing.isSold &&
             selectedListing.sellerUser?.address !== walletAddress && (
              <button
                onClick={async () => {
                  if (!MARKETPLACE_ID) { toast.error("Marketplace not configured"); return; }
                  try {
                    // Resolve onChainListingId — fetch from txDigest if missing
                    let listingId = selectedListing.onChainListingId;
                    if ((listingId === null || listingId === undefined) && selectedListing.txDigest) {
                      toast.loading("Fetching on-chain listing ID...", { id: "buy-tx" });
                      const tokenEv = await getAuthToken();
                      const evRes = await fetch(
                        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/tx-events/${selectedListing.txDigest}`,
                        { headers: { Authorization: `Bearer ${tokenEv}` } }
                      );
                      const evData = await evRes.json();
                      console.log("[Marketplace] Buy fallback events:", JSON.stringify(evData.events));
                      for (const ev of (evData.events || [])) {
                        const p = ev.parsedJson || {};
                        const id = p.listing_id ?? p.id ?? p.listingId ?? p.listing ?? p.list_id;
                        if (id !== undefined && id !== null) { listingId = String(id); break; }
                      }
                    }
                    if (listingId === null || listingId === undefined) {
                      toast.error("This listing is not on-chain yet", { id: "buy-tx" });
                      return;
                    }

                    toast.loading("Waiting for wallet approval...", { id: "buy-tx" });
                    const tx = new Transaction();
                    const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(BigInt(selectedListing.price))]);
                    tx.moveCall({
                      target: `${PACKAGE_ID}::marketplace::buy`,
                      typeArguments: [OCT_TYPE],
                      arguments: [
                        tx.object(MARKETPLACE_ID),
                        tx.pure.u64(BigInt(listingId)),
                        payment,
                        tx.object("0x6"),
                      ],
                    });
                    await signAndExecute({ transaction: tx });

                    // Update DB — transfer ownership to buyer
                    let token = await getAuthToken();
                    let buyRes = await fetch(
                      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/buy/${selectedListing.listingId}`,
                      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
                    );
                    // If 401, clear stale token and retry with fresh auth
                    if (buyRes.status === 401) {
                      localStorage.removeItem("auth_token");
                      token = await getAuthToken();
                      buyRes = await fetch(
                        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/buy/${selectedListing.listingId}`,
                        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
                      );
                    }
                    if (!buyRes.ok) {
                      const errData = await buyRes.json().catch(() => ({}));
                      console.error("[Marketplace] buy DB update failed:", errData);
                      toast.warning("On-chain TX succeeded but inventory update failed: " + (errData.message || buyRes.status), { id: "buy-tx" });
                    } else {
                      toast.success("Purchase successful! Check your inventory.", { id: "buy-tx" });
                    }
                    setSelectedListing(null);
                    fetchListings();
                  } catch (err) {
                    const msg = err.message || "Purchase failed";
                    const isRejected = msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("denied");
                    toast.error(isRejected ? "Transaction cancelled." : msg, { id: "buy-tx" });
                  }
                }}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black py-3 rounded-xl mb-3 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <ShoppingBag size={16} />
                Buy for {(Number(selectedListing.price) / 1_000_000_000).toLocaleString()} ONE
              </button>
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

      {/* Sell Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-[100] p-0">
          <div className="bg-gray-900 rounded-t-3xl w-full max-w-md flex flex-col" style={{ maxHeight: "calc(100dvh - 70px)" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h3 className="text-white font-black text-lg">List Item for Sale</h3>
              <button onClick={() => setShowSellModal(false)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
              {loadingSellInventory ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400" />
                </div>
              ) : (
                <>
                  {/* Cars */}
                  {sellInventory.cars.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-2">Cars</p>
                      <div className="grid grid-cols-3 gap-2">
                        {sellInventory.cars.map((car) => {
                          const rc = RARITY_CONFIG[RARITY_MAP[car.rarity]] || RARITY_CONFIG.common;
                          const selected = sellItem?.uid === car.uid;
                          return (
                            <button
                              key={car.uid}
                              onClick={() => setSellItem({ nftType: "car", uid: car.uid, name: car.name, imageUrl: car.imageUrl })}
                              className={`relative bg-gradient-to-br ${rc.gradient} rounded-xl p-2 text-center transition-all ${selected ? "ring-2 ring-orange-400 scale-105" : "opacity-80"}`}
                            >
                              <img src={car.imageUrl || getItemImage(car.name)} alt={car.name} className="w-full h-14 object-contain mb-1" onError={(e) => { e.target.src = "/assets/car/High Speed.png"; }} />
                              <p className="text-white text-[9px] font-black truncate">{car.name}</p>
                              {selected && <div className="absolute top-1 right-1 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center"><span className="text-[8px] text-white font-black">✓</span></div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Parts */}
                  {sellInventory.parts.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-2">Spare Parts</p>
                      <div className="grid grid-cols-3 gap-2">
                        {sellInventory.parts.map((part) => {
                          const rc = RARITY_CONFIG[RARITY_MAP[part.rarity]] || RARITY_CONFIG.common;
                          const selected = sellItem?.uid === part.uid;
                          return (
                            <button
                              key={part.uid}
                              onClick={() => setSellItem({ nftType: "sparePart", uid: part.uid, name: part.name, imageUrl: part.imageUrl })}
                              className={`relative bg-gradient-to-br ${rc.gradient} rounded-xl p-2 text-center transition-all ${selected ? "ring-2 ring-orange-400 scale-105" : "opacity-80"}`}
                            >
                              <img src={part.imageUrl || getItemImage(part.name)} alt={part.name} className="w-full h-14 object-contain mb-1" onError={(e) => { e.target.src = "/assets/car/High Speed.png"; }} />
                              <p className="text-white text-[9px] font-black truncate">{part.name}</p>
                              {selected && <div className="absolute top-1 right-1 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center"><span className="text-[8px] text-white font-black">✓</span></div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sellInventory.cars.length === 0 && sellInventory.parts.length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-gray-400 font-bold">No items available to list</p>
                      <p className="text-gray-600 text-sm mt-1">All your items are already listed or claimed</p>
                    </div>
                  )}

                </>
              )}
            </div>

            {/* Price + submit — pinned at bottom, always visible */}
            {!loadingSellInventory && (sellInventory.cars.length > 0 || sellInventory.parts.length > 0) && (
              <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-gray-800 space-y-3 bg-gray-900">
                {sellItem && (
                  <div className="bg-gray-800 rounded-xl p-2.5 flex items-center gap-3">
                    <img src={sellItem.imageUrl || getItemImage(sellItem.name)} alt={sellItem.name} className="w-10 h-10 object-contain flex-shrink-0" onError={(e) => { e.target.src = "/assets/car/High Speed.png"; }} />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-black truncate">{sellItem.name}</p>
                      <p className="text-gray-400 text-xs">{sellItem.nftType === "car" ? "Car" : "Spare Part"}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Price (ONE)"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="flex-1 bg-gray-800 text-white font-black rounded-xl px-4 py-3 border border-gray-700 focus:border-orange-400 outline-none"
                  />
                  <button
                    onClick={handleList}
                    disabled={listing || !sellItem || !sellPrice}
                    className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-black px-5 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <Tag size={16} />
                    {listing ? "..." : "List"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNavigation />
    </main>
  );
}
