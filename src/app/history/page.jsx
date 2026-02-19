"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useRouter } from "next/navigation";
import { Clock, TrendingUp, Package, ShoppingCart, DollarSign, Tag, Sparkles, Wrench, BadgeDollarSign, ChevronLeft } from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import { toast } from "sonner";

export default function HistoryPage() {
  const { isConnected, getAuthToken } = useWallet();
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, gacha, redeem, marketplace

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  // Fetch activity history
  useEffect(() => {
    if (isConnected) {
      fetchHistory();
    }
  }, [isConnected]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const authToken = await getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/activity/history`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setActivities(data.activities || []);
      setSummary(data.summary || {});
    } catch (error) {
      console.error("Failed to fetch history:", error);
      toast.error("Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'gacha') return activity.type === 'gacha';
    if (filter === 'assembly') return activity.type === 'assembly';
    if (filter === 'redeem') return activity.type === 'redeem';
    if (filter === 'marketplace') return ['listed', 'sold', 'purchased'].includes(activity.type);
    if (filter === 'buyback') return activity.type === 'buyback';
    return true;
  });

  // Get icon and color for activity type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'gacha': return { Icon: Sparkles, color: 'text-yellow-400' };
      case 'redeem': return { Icon: Package, color: 'text-green-400' };
      case 'listed': return { Icon: Tag, color: 'text-blue-400' };
      case 'sold': return { Icon: DollarSign, color: 'text-emerald-400' };
      case 'purchased': return { Icon: ShoppingCart, color: 'text-purple-400' };
      case 'buyback': return { Icon: BadgeDollarSign, color: 'text-orange-400' };
      case 'assembly': return { Icon: Wrench, color: 'text-cyan-400' };
      default: return { Icon: Clock, color: 'text-gray-400' };
    }
  };

  // Get rarity color
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'text-orange-400 bg-orange-500/20';
      case 'epic': return 'text-purple-400 bg-purple-500/20';
      case 'rare': return 'text-blue-400 bg-blue-500/20';
      case 'uncommon': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden pb-20">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px),
            repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)
          `
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <header className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors active:scale-95"
              aria-label="Go back"
            >
              <ChevronLeft size={24} className="text-white" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 sm:gap-3">
              <Clock size={28} className="text-orange-400 sm:w-8 sm:h-8" />
              <span className="leading-tight">Transaction History</span>
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-400 ml-12">Your complete activity timeline</p>
        </header>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <div className="text-yellow-400 text-[10px] sm:text-xs font-bold mb-1 uppercase">Gacha Wins</div>
              <div className="text-xl sm:text-2xl font-black text-white">{summary.totalMints || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <div className="text-cyan-400 text-[10px] sm:text-xs font-bold mb-1 uppercase">Assembled</div>
              <div className="text-xl sm:text-2xl font-black text-white">{summary.totalAssemblies || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <div className="text-green-400 text-[10px] sm:text-xs font-bold mb-1 uppercase">Redeemed</div>
              <div className="text-xl sm:text-2xl font-black text-white">{summary.totalRedeems || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <div className="text-blue-400 text-[10px] sm:text-xs font-bold mb-1 uppercase">Listed</div>
              <div className="text-xl sm:text-2xl font-black text-white">{summary.totalListings || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <div className="text-emerald-400 text-[10px] sm:text-xs font-bold mb-1 uppercase">Sold</div>
              <div className="text-xl sm:text-2xl font-black text-white">{summary.totalSales || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <div className="text-purple-400 text-[10px] sm:text-xs font-bold mb-1 uppercase">Purchased</div>
              <div className="text-xl sm:text-2xl font-black text-white">{summary.totalPurchases || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <div className="text-orange-400 text-[10px] sm:text-xs font-bold mb-1 uppercase">Admin Buyback</div>
              <div className="text-xl sm:text-2xl font-black text-white">{summary.totalBuybacks || 0}</div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { key: 'all', label: 'All', icon: TrendingUp },
            { key: 'gacha', label: 'Gacha', icon: Sparkles },
            { key: 'assembly', label: 'Assembly', icon: Wrench },
            { key: 'redeem', label: 'Redeemed', icon: Package },
            { key: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
            { key: 'buyback', label: 'Buyback', icon: BadgeDollarSign },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${filter === key
                ? 'bg-orange-500 text-white'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                }`}
            >
              <Icon size={14} className="sm:w-4 sm:h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Activity Timeline */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-orange-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-4 text-sm sm:text-base">Loading history...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl sm:text-6xl mb-4">📋</div>
            <p className="text-gray-400 text-base sm:text-lg mb-2">No transactions yet</p>
            <p className="text-gray-500 text-xs sm:text-sm">Your activity history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredActivities.map((activity) => {
              const { Icon, color } = getActivityIcon(activity.type);
              const rarityColor = getRarityColor(activity.rarity);

              return (
                <div
                  key={activity.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:bg-gray-700/50 transition-all"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-700/50 flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon size={20} strokeWidth={2} className="sm:w-6 sm:h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-white text-base sm:text-lg truncate">{activity.action}</h3>
                          <p className="text-gray-400 text-xs sm:text-sm truncate">{activity.carModel}</p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <div className="text-gray-400 text-[10px] sm:text-xs">{activity.time}</div>
                          <div className="text-gray-500 text-[10px] sm:text-xs">{activity.date}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {/* Rarity Badge */}
                        {activity.rarity && (
                          <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 rounded uppercase ${rarityColor}`}>
                            {activity.rarity}
                          </span>
                        )}

                        {/* Series Badge */}
                        {activity.series && (
                          <span className="text-[10px] sm:text-xs bg-gray-700/50 text-gray-300 px-2 py-0.5 sm:py-1 rounded">
                            {activity.series}
                          </span>
                        )}

                        {/* Token ID */}
                        {activity.tokenId !== undefined && (
                          <span className="text-[10px] sm:text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 sm:py-1 rounded">
                            #{activity.tokenId}
                          </span>
                        )}

                        {/* Price */}
                        {activity.price !== undefined && (
                          <span className="text-[10px] sm:text-xs bg-green-500/20 text-green-400 px-2 py-0.5 sm:py-1 rounded font-bold">
                            {Math.floor(activity.price).toLocaleString()} IDRX
                          </span>
                        )}

                        {/* TX Hash */}
                        {activity.txHash && (
                          <a
                            href={`https://sepolia.basescan.org/tx/${activity.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] sm:text-xs text-orange-400 hover:text-orange-300 underline"
                          >
                            View TX
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </main>
  );
}
