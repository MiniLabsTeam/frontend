"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Package, Truck, CheckCircle, Clock, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import PageHeader from "@/components/shared/PageHeader";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";

const RARITY_COLORS = {
  0: { label: "Common", color: "text-gray-400", border: "border-gray-600", bg: "from-gray-700 to-gray-800" },
  1: { label: "Rare", color: "text-blue-400", border: "border-blue-600", bg: "from-blue-900 to-blue-950" },
  2: { label: "Epic", color: "text-purple-400", border: "border-purple-600", bg: "from-purple-900 to-purple-950" },
  3: { label: "Legendary", color: "text-yellow-400", border: "border-yellow-600", bg: "from-yellow-900 to-amber-950" },
};

const STATUS_CONFIG = {
  PENDING: { label: "Pending", icon: <Clock size={14} />, color: "text-yellow-400 bg-yellow-400/10" },
  PROCESSING: { label: "Processing", icon: <Package size={14} />, color: "text-blue-400 bg-blue-400/10" },
  SHIPPED: { label: "Shipped", icon: <Truck size={14} />, color: "text-orange-400 bg-orange-400/10" },
  DELIVERED: { label: "Delivered", icon: <CheckCircle size={14} />, color: "text-green-400 bg-green-400/10" },
};

function EligibleCarCard({ item, onClaim, claiming }) {
  const [showAddress, setShowAddress] = useState(false);
  const [address, setAddress] = useState({ name: "", phone: "", street: "", city: "", postal: "", country: "" });
  const car = item.car;
  const rarity = RARITY_COLORS[car?.rarity] || RARITY_COLORS[0];

  if (!item.isEligible) return null;

  const handleSubmitClaim = async () => {
    if (!address.name || !address.street || !address.city) {
      toast.error("Please fill in name, street, and city");
      return;
    }
    onClaim(car.uid, address);
  };

  return (
    <div className={`bg-gradient-to-br ${rarity.bg} rounded-2xl p-4 border ${rarity.border} shadow-xl`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-black ${rarity.color} uppercase tracking-wider`}>{rarity.label}</span>
          </div>
          <h3 className="text-white font-black text-base">{car?.name || "Unknown Car"}</h3>
          <p className="text-gray-400 text-xs">Brand #{car?.brand} · UID: {car?.uid?.slice(0, 8)}...</p>
        </div>
        <div className="bg-black/30 rounded-xl p-2">
          <Package size={24} className={rarity.color} />
        </div>
      </div>

      {/* Parts Available */}
      {item.availableParts && (
        <div className="bg-black/20 rounded-xl p-3 mb-3">
          <p className="text-gray-300 text-xs font-bold mb-2 uppercase tracking-wide">Included Parts</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: "wheels", icon: "🔄", label: "Wheels" },
              { key: "engine", icon: "⚙️", label: "Engine" },
              { key: "body", icon: "🚗", label: "Body" },
              { key: "shocks", icon: "🔧", label: "Shocks" },
            ].map(({ key, icon, label }) => (
              <div
                key={key}
                className={`text-center rounded-lg p-1.5 ${item.availableParts[key] ? "bg-white/10" : "bg-black/20 opacity-40"}`}
              >
                <span className="text-base">{icon}</span>
                <p className="text-[9px] text-gray-300 mt-0.5">{label}</p>
                {item.availableParts[key] ? (
                  <p className="text-[9px] text-green-400">✓</p>
                ) : (
                  <p className="text-[9px] text-gray-600">—</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipping Address Form */}
      <button
        onClick={() => setShowAddress(!showAddress)}
        className="w-full flex items-center justify-between bg-orange-500/20 border border-orange-500/40 rounded-xl px-4 py-2.5 text-orange-300 text-sm font-bold hover:bg-orange-500/30 transition-all mb-2"
      >
        <div className="flex items-center gap-2">
          <MapPin size={14} />
          <span>Claim Physical NFT</span>
        </div>
        {showAddress ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showAddress && (
        <div className="space-y-2 bg-black/20 rounded-xl p-3">
          <p className="text-gray-300 text-xs font-bold uppercase tracking-wide mb-2">Shipping Details</p>
          {[
            { field: "name", placeholder: "Full Name", required: true },
            { field: "phone", placeholder: "Phone Number" },
            { field: "street", placeholder: "Street Address", required: true },
            { field: "city", placeholder: "City", required: true },
            { field: "postal", placeholder: "Postal Code" },
            { field: "country", placeholder: "Country" },
          ].map(({ field, placeholder, required }) => (
            <input
              key={field}
              type="text"
              placeholder={`${placeholder}${required ? " *" : ""}`}
              value={address[field]}
              onChange={(e) => setAddress((a) => ({ ...a, [field]: e.target.value }))}
              className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 border border-gray-700 focus:border-orange-500 outline-none"
            />
          ))}
          <button
            onClick={handleSubmitClaim}
            disabled={claiming === car?.uid}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black py-3 rounded-xl mt-2 disabled:opacity-50 transition-all"
          >
            {claiming === car?.uid ? "Submitting..." : "Submit Claim"}
          </button>
        </div>
      )}
    </div>
  );
}

function ClaimStatusCard({ claim }) {
  const status = STATUS_CONFIG[claim.status] || STATUS_CONFIG.PENDING;
  const rarity = RARITY_COLORS[claim.car?.rarity] || RARITY_COLORS[0];

  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-bold text-sm">{claim.car?.name || "Unknown Car"}</h3>
          <p className="text-gray-500 text-xs">UID: {claim.carUid?.slice(0, 10)}...</p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${status.color}`}>
          {status.icon}
          {status.label}
        </span>
      </div>

      {claim.trackingNumber && (
        <div className="bg-gray-800/60 rounded-xl px-3 py-2 mb-2">
          <p className="text-gray-400 text-xs">Tracking: <span className="text-orange-400 font-bold">{claim.trackingNumber}</span></p>
        </div>
      )}

      <div className="flex gap-3 text-xs text-gray-500">
        {claim.claimedAt && <span>Claimed: {new Date(claim.claimedAt).toLocaleDateString()}</span>}
        {claim.shippedAt && <span>Shipped: {new Date(claim.shippedAt).toLocaleDateString()}</span>}
        {claim.deliveredAt && <span className="text-green-400">Delivered: {new Date(claim.deliveredAt).toLocaleDateString()}</span>}
      </div>
    </div>
  );
}

const TABS = ["Eligible Cars", "My Claims"];

export default function ClaimPage() {
  const { isConnected, getAuthToken } = useWallet();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(0);
  const [eligible, setEligible] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  const fetchData = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      const [eligibleRes, claimsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rwa/eligible`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rwa/claims`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const eligibleData = await eligibleRes.json();
      const claimsData = await claimsRes.json();
      setEligible(eligibleData.data || []);
      setClaims(claimsData.data || []);
    } catch (err) {
      console.error("Failed to fetch claim data:", err);
      toast.error("Failed to load claim data");
    } finally {
      setLoading(false);
    }
  }, [isConnected, getAuthToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClaim = async (carUid, shippingAddress) => {
    setClaiming(carUid);
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rwa/claim/${carUid}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ shippingAddress }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit claim");
      toast.success("Claim submitted! We'll contact you soon.");
      fetchData();
      setActiveTab(1); // switch to My Claims
    } catch (err) {
      toast.error(err.message || "Failed to submit claim");
    } finally {
      setClaiming(null);
    }
  };

  const eligibleCars = eligible.filter((e) => e.isEligible);

  if (!isConnected) return null;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-emerald-900/10 to-gray-900 text-white">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 30px, rgba(16,185,129,0.08) 30px, rgba(16,185,129,0.08) 60px)`,
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto pb-24">
        {/* Header */}
        <header className="pt-0 pb-3">
          <PageHeader />
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl flex items-center justify-center">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">RWA Claim</h1>
              <p className="text-gray-400 text-xs">Claim your NFT as a physical car model</p>
            </div>
          </div>

          <div className="px-4">
          {/* Summary Badges */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-gray-800/80 rounded-xl p-3 text-center">
              <p className="text-emerald-400 font-black text-2xl">{eligibleCars.length}</p>
              <p className="text-gray-400 text-xs uppercase tracking-wide">Eligible</p>
            </div>
            <div className="bg-gray-800/80 rounded-xl p-3 text-center">
              <p className="text-orange-400 font-black text-2xl">{claims.length}</p>
              <p className="text-gray-400 text-xs uppercase tracking-wide">Claims</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-800/80 rounded-xl p-1 gap-1">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === i
                    ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          </div>{/* end px-4 wrapper */}
        </header>

        {/* Content */}
        <div className="flex-1 px-4 space-y-3 overflow-y-auto">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-gray-900 rounded-2xl p-4 border border-gray-700 animate-pulse h-40" />
            ))
          ) : activeTab === 0 ? (
            // Eligible Cars
            eligibleCars.length > 0 ? (
              eligibleCars.map((item) => (
                <EligibleCarCard
                  key={item.car?.uid}
                  item={item}
                  onClaim={handleClaim}
                  claiming={claiming}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Package size={28} className="text-gray-600" />
                </div>
                <p className="text-gray-400 font-bold">No eligible cars</p>
                <p className="text-gray-600 text-sm mt-1">Win races or open gacha to get Legendary cars</p>
              </div>
            )
          ) : (
            // My Claims
            claims.length > 0 ? (
              claims.map((claim) => (
                <ClaimStatusCard key={claim.carUid} claim={claim} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Truck size={28} className="text-gray-600" />
                </div>
                <p className="text-gray-400 font-bold">No claims yet</p>
                <p className="text-gray-600 text-sm mt-1">Claim an eligible car to see it here</p>
              </div>
            )
          )}
        </div>
      </div>

      <BottomNavigation />
    </main>
  );
}
