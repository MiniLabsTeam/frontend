"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, TrendingUp, Clock, CheckCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import WalletButton from "@/components/shared/WalletButton";
import { useWallet } from "@/hooks/useWallet";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";

const TABS = ["Active Pools", "My Bets", "Claimable"];

export default function PredictionPage() {
  const { isConnected, getAuthToken } = useWallet();
  const [activeTab, setActiveTab] = useState(0);
  const [pools, setPools] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [claimable, setClaimable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPool, setExpandedPool] = useState(null);
  const [betModal, setBetModal] = useState(null); // { poolId, playerId, playerName, odds }
  const [betAmount, setBetAmount] = useState("");
  const [betLoading, setBetLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      const [poolsData, betsData, claimData] = await Promise.all([
        apiGet("/api/prediction/pools", token),
        apiGet("/api/prediction/my-bets", token),
        apiGet("/api/prediction/claimable", token),
      ]);
      setPools(poolsData.pools || []);
      setMyBets(betsData.bets || []);
      setClaimable(claimData.bets || []);
    } catch (err) {
      console.error("Failed to fetch prediction data:", err);
      toast.error("Failed to load prediction data");
    } finally {
      setLoading(false);
    }
  }, [isConnected, getAuthToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit a bet
  const handleBet = async () => {
    if (!betModal || !betAmount || isNaN(Number(betAmount))) return;
    setBetLoading(true);
    try {
      const token = await getAuthToken();
      await apiPost(
        "/api/prediction/bet",
        {
          poolId: betModal.poolId,
          predictedWinnerId: betModal.playerId,
          amount: Number(betAmount),
        },
        token
      );
      toast.success(`Bet placed on ${betModal.playerName}!`);
      setBetModal(null);
      setBetAmount("");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to place bet");
    } finally {
      setBetLoading(false);
    }
  };

  // Claim winnings
  const handleClaim = async (betId) => {
    setClaimingId(betId);
    try {
      const token = await getAuthToken();
      await apiPost(`/api/prediction/claim/${betId}`, {}, token);
      toast.success("Winnings claimed!");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to claim");
    } finally {
      setClaimingId(null);
    }
  };

  const statusColor = (status) => {
    if (status === "OPEN") return "text-green-400 bg-green-400/10 border-green-400/30";
    if (status === "CLOSED") return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    if (status === "SETTLED") return "text-gray-400 bg-gray-400/10 border-gray-400/30";
    return "text-blue-400 bg-blue-400/10 border-blue-400/30";
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/view-car-running-high-speed%20(1).jpg')] bg-cover bg-center opacity-10" />

      <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto pb-24">
        {/* Header */}
        <header className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={28} className="text-yellow-400" />
              <div>
                <h1 className="text-2xl font-black text-white">PREDICTION</h1>
                <p className="text-gray-400 text-xs">Bet on race winners</p>
              </div>
            </div>
            <WalletButton />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-800/50 rounded-2xl p-1">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex-1 text-xs font-bold py-2 px-1 rounded-xl transition-all ${
                  activeTab === i
                    ? "bg-purple-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab}
                {i === 2 && claimable.length > 0 && (
                  <span className="ml-1 bg-yellow-400 text-gray-900 text-xs rounded-full px-1.5 font-black">
                    {claimable.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        {/* Wallet Not Connected */}
        {!isConnected && (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-black text-white mb-2">Connect Wallet</h2>
            <p className="text-gray-400 text-sm text-center mb-6">
              Connect your OneChain wallet to bet on races
            </p>
            <WalletButton />
          </div>
        )}

        {/* Loading */}
        {isConnected && loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={36} className="text-purple-400 animate-spin" />
          </div>
        )}

        {/* Content */}
        {isConnected && !loading && (
          <div className="flex-1 px-4 py-2 overflow-y-auto space-y-3">

            {/* ── Tab 0: Active Pools ── */}
            {activeTab === 0 && (
              <>
                {pools.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">🏁</div>
                    <p className="text-gray-400">No active prediction pools right now</p>
                    <p className="text-gray-600 text-sm mt-2">Check back when a race is running</p>
                  </div>
                ) : (
                  pools.map((pool) => (
                    <div
                      key={pool.id}
                      className="bg-gray-800/60 border border-gray-700/50 rounded-3xl overflow-hidden"
                    >
                      {/* Pool Header */}
                      <button
                        onClick={() => setExpandedPool(expandedPool === pool.id ? null : pool.id)}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="text-left">
                          <p className="text-white font-black text-sm">
                            🏁 {pool.roomUid || pool.id}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColor(pool.status)}`}>
                              {pool.status}
                            </span>
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                              <TrendingUp size={10} />
                              Pool: {(pool.totalPool || 0).toLocaleString()} IDRX
                            </span>
                          </div>
                        </div>
                        {expandedPool === pool.id ? (
                          <ChevronUp size={18} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={18} className="text-gray-400" />
                        )}
                      </button>

                      {/* Expanded: Player List */}
                      {expandedPool === pool.id && (
                        <div className="px-4 pb-4 space-y-2 border-t border-gray-700/50 pt-3">
                          <p className="text-gray-400 text-xs font-bold mb-2">
                            PLAYERS — Tap to bet
                          </p>
                          {(pool.players || []).length === 0 ? (
                            <p className="text-gray-600 text-sm">No players yet</p>
                          ) : (
                            (pool.players || []).map((player) => (
                              <div
                                key={player.id || player.address}
                                className="flex items-center justify-between bg-gray-900/60 rounded-2xl px-4 py-3"
                              >
                                <div>
                                  <p className="text-white text-sm font-bold">
                                    👤 {player.username || `${(player.address || "").slice(0, 8)}...`}
                                  </p>
                                  <p className="text-gray-400 text-xs mt-0.5">
                                    Odds:{" "}
                                    <span className="text-yellow-400 font-black">
                                      {player.odds ? `${player.odds.toFixed(2)}x` : "—"}
                                    </span>
                                  </p>
                                </div>
                                {pool.status === "OPEN" && (
                                  <button
                                    onClick={() =>
                                      setBetModal({
                                        poolId: pool.id,
                                        playerId: player.id || player.address,
                                        playerName:
                                          player.username ||
                                          `${(player.address || "").slice(0, 8)}...`,
                                        odds: player.odds,
                                      })
                                    }
                                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black px-4 py-2 rounded-full transition-all active:scale-95"
                                  >
                                    BET
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            )}

            {/* ── Tab 1: My Bets ── */}
            {activeTab === 1 && (
              <>
                {myBets.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">🎯</div>
                    <p className="text-gray-400">You have no active bets</p>
                    <button
                      onClick={() => setActiveTab(0)}
                      className="mt-4 text-purple-400 text-sm font-bold underline"
                    >
                      Browse Active Pools →
                    </button>
                  </div>
                ) : (
                  myBets.map((bet) => (
                    <div
                      key={bet.id}
                      className="bg-gray-800/60 border border-gray-700/50 rounded-3xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-black text-sm">
                          🏁 {bet.roomUid || bet.poolId}
                        </p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColor(bet.status)}`}>
                          {bet.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="bg-gray-900/60 rounded-xl p-2 text-center">
                          <p className="text-gray-400 text-xs">Bet On</p>
                          <p className="text-white font-black text-xs mt-1">
                            {bet.predictedWinner?.username || "—"}
                          </p>
                        </div>
                        <div className="bg-gray-900/60 rounded-xl p-2 text-center">
                          <p className="text-gray-400 text-xs">Amount</p>
                          <p className="text-yellow-400 font-black text-xs mt-1">
                            {(bet.amount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gray-900/60 rounded-xl p-2 text-center">
                          <p className="text-gray-400 text-xs">Odds</p>
                          <p className="text-purple-400 font-black text-xs mt-1">
                            {bet.odds ? `${bet.odds.toFixed(2)}x` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* ── Tab 2: Claimable ── */}
            {activeTab === 2 && (
              <>
                {claimable.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">🏆</div>
                    <p className="text-gray-400">No winnings to claim</p>
                    <p className="text-gray-600 text-sm mt-2">Win a bet to claim your rewards</p>
                  </div>
                ) : (
                  claimable.map((bet) => (
                    <div
                      key={bet.id}
                      className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-3xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={18} className="text-yellow-400" />
                        <p className="text-yellow-400 font-black text-sm">YOU WON!</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-bold">
                            🏁 {bet.roomUid || bet.poolId}
                          </p>
                          <p className="text-yellow-300 font-black text-lg mt-1">
                            +{(bet.payout || 0).toLocaleString()} IDRX
                          </p>
                        </div>
                        <button
                          onClick={() => handleClaim(bet.id)}
                          disabled={claimingId === bet.id}
                          className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black text-sm px-5 py-2.5 rounded-full transition-all active:scale-95 disabled:opacity-60"
                        >
                          {claimingId === bet.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            "CLAIM"
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bet Modal */}
      {betModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setBetModal(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-gray-900 border-t border-gray-700 rounded-t-3xl p-6">
            <h3 className="text-white font-black text-lg mb-1">Place Bet</h3>
            <p className="text-gray-400 text-sm mb-4">
              Betting on:{" "}
              <span className="text-white font-bold">{betModal.playerName}</span>
              {betModal.odds && (
                <span className="text-yellow-400 font-black ml-1">
                  ({betModal.odds.toFixed(2)}x)
                </span>
              )}
            </p>

            <div className="bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2 mb-4">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Amount (IDRX)"
                className="flex-1 bg-transparent text-white font-black text-lg outline-none placeholder:text-gray-600"
                min="1"
              />
              <span className="text-orange-400 font-bold text-sm">IDRX</span>
            </div>

            {betAmount && betModal.odds && (
              <p className="text-gray-400 text-xs mb-4">
                Potential win:{" "}
                <span className="text-yellow-400 font-black">
                  {(Number(betAmount) * betModal.odds).toFixed(0)} IDRX
                </span>
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setBetModal(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBet}
                disabled={!betAmount || betLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-60"
              >
                {betLoading ? (
                  <Loader2 size={18} className="animate-spin mx-auto" />
                ) : (
                  "CONFIRM BET"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </main>
  );
}
