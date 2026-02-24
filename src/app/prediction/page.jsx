"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trophy, TrendingUp, CheckCircle, ChevronDown, ChevronUp,
  Loader2, Eye, Wallet, ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react";
import BottomNavigation from "@/components/shared/BottomNavigation";
import WalletButton from "@/components/shared/WalletButton";
import { useWallet } from "@/hooks/useWallet";
import { useSignAndExecuteTransaction } from "@onelabs/dapp-kit";
import { Transaction } from "@onelabs/sui/transactions";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";

const TABS = ["Active Pools", "My Bets", "Claimable"];
const MIST_PER_OCT = 1_000_000_000;
const toOCT = (mist) => (Number(mist || 0) / MIST_PER_OCT).toFixed(2);

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;

export default function PredictionPage() {
  const { isConnected, getAuthToken } = useWallet();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [activeTab, setActiveTab] = useState(0);
  const [pools, setPools] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [claimable, setClaimable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPool, setExpandedPool] = useState(null);
  const [bettingPlayer, setBettingPlayer] = useState(null); // address of player currently being bet on
  const [claimingId, setClaimingId] = useState(null);

  // Deposit/Withdraw state
  const [predictionBalance, setPredictionBalance] = useState("0");
  const [depositModal, setDepositModal] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [depositError, setDepositError] = useState(null); // { txDigest, gasLost }

  const fetchBalance = useCallback(async () => {
    if (!isConnected) return;
    try {
      const token = await getAuthToken();
      const res = await apiGet("/api/prediction/balance", token);
      setPredictionBalance(res.data?.balanceMist || "0");
    } catch (err) {
      console.error("Failed to fetch prediction balance:", err);
    }
  }, [isConnected, getAuthToken]);

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
      const rawPools = poolsData.data || [];
      const mappedPools = rawPools.map((p) => ({
        ...p,
        status: p.isSettled ? "SETTLED" : p.room?.status === "FINISHED" ? "CLOSED" : p.room?.status === "STARTED" ? "RACING" : "OPEN",
        players: (p.room?.players || []).map((rp) => ({
          id: rp.playerAddress,
          address: rp.user?.address || rp.playerAddress,
          username: rp.user?.username,
          odds: null,
        })),
      }));
      setPools(mappedPools);
      setMyBets(betsData.data || []);
      setClaimable(claimData.data || []);
    } catch (err) {
      console.error("Failed to fetch prediction data:", err);
      toast.error("Failed to load prediction data");
    } finally {
      setLoading(false);
    }
  }, [isConnected, getAuthToken]);

  useEffect(() => {
    fetchData();
    fetchBalance();
  }, [fetchData, fetchBalance]);

  // Deposit OCT: sign on-chain transfer to treasury, then verify via backend
  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) < 1) return;

    // Pre-check: minimum deposit is 10 OCT (validate BEFORE signing!)
    const amountNum = Math.floor(Number(depositAmount));
    if (amountNum < 10) {
      toast.error("Minimum deposit is 10 OCT");
      return;
    }

    setDepositLoading(true);
    let failedTxDigest = null;
    let gasLostOCT = null;

    try {
      const amountMist = BigInt(amountNum) * BigInt(MIST_PER_OCT);

      // Build transaction: transfer OCT to treasury
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist.toString())]);
      tx.transferObjects([coin], tx.pure.address(TREASURY_ADDRESS));

      // Sign and execute via wallet
      const result = await signAndExecute({
        transaction: tx,
      });

      const txDigest = result.digest;
      if (!txDigest) throw new Error("No transaction digest returned");

      failedTxDigest = txDigest;

      // Wait a moment for the transaction to be indexed
      await new Promise((r) => setTimeout(r, 2000));

      // Verify deposit on backend
      const token = await getAuthToken();
      const verifyRes = await apiPost("/api/prediction/deposit", { txDigest }, token);

      toast.success(verifyRes.message || `Deposited ${depositAmount} OCT!`);
      setDepositModal(false);
      setDepositAmount("");
      fetchBalance();
    } catch (err) {
      console.error("Deposit failed:", err);

      // Check if error message contains gas loss info
      const errorMsg = err.message || "";
      const gasMatch = errorMsg.match(/Gas consumed: ([\d.]+) OCT/);
      if (gasMatch) {
        gasLostOCT = parseFloat(gasMatch[1]);
      }

      // Show error with recovery option if transaction failed with gas consumed
      if (failedTxDigest && gasLostOCT) {
        toast.error(
          `Deposit failed but gas was consumed (${gasLostOCT.toFixed(6)} OCT). You can request a recovery.`,
          { duration: 5000 }
        );

        // Store failed transaction info for recovery
        setDepositError({
          txDigest: failedTxDigest,
          gasLost: gasLostOCT,
        });
      } else {
        toast.error(err.message || "Deposit failed");
      }
    } finally {
      setDepositLoading(false);
    }
  };

  // Request recovery for failed deposit
  const handleRecoverDeposit = async (txDigest, gasLostOCT) => {
    if (!txDigest || !gasLostOCT) return;

    try {
      const token = await getAuthToken();
      const res = await apiPost("/api/prediction/recover-deposit", {
        txDigest,
        gasLostOCT,
      }, token);

      toast.success(res.message || `Recovered ${gasLostOCT.toFixed(6)} OCT!`);
      setDepositError(null);
      setDepositModal(false);
      setDepositAmount("");
      fetchBalance();
    } catch (err) {
      toast.error(err.message || "Recovery failed");
    }
  };

  // Withdraw OCT from prediction balance back to wallet
  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) return;
    setWithdrawLoading(true);
    try {
      const token = await getAuthToken();
      const res = await apiPost("/api/prediction/withdraw", { amount: Number(withdrawAmount) }, token);
      toast.success(res.message || `Withdrawn ${withdrawAmount} OCT!`);
      setWithdrawModal(false);
      setWithdrawAmount("");
      fetchBalance();
    } catch (err) {
      toast.error(err.message || "Withdrawal failed");
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Place instant 2 OCT bet
  const handleBet = async (poolId, playerId, playerName) => {
    if (bettingPlayer) return; // prevent double-tap
    setBettingPlayer(playerId);
    try {
      const token = await getAuthToken();
      await apiPost(
        "/api/prediction/bet",
        { poolId, predictedWinnerId: playerId, amount: 2 },
        token
      );
      toast.success(`+2 OCT on ${playerName}!`);
      fetchData();
      fetchBalance();
    } catch (err) {
      toast.error(err.message || "Failed to place bet");
    } finally {
      setBettingPlayer(null);
    }
  };

  // Claim winnings
  const handleClaim = async (betId) => {
    setClaimingId(betId);
    try {
      const token = await getAuthToken();
      await apiPost(`/api/prediction/claim/${betId}`, {}, token);
      toast.success("Winnings claimed to your prediction balance!");
      fetchData();
      fetchBalance();
    } catch (err) {
      toast.error(err.message || "Failed to claim");
    } finally {
      setClaimingId(null);
    }
  };

  const statusColor = (status) => {
    if (status === "OPEN") return "text-green-400 bg-green-400/10 border-green-400/30";
    if (status === "RACING") return "text-orange-400 bg-orange-400/10 border-orange-400/30";
    if (status === "CLOSED") return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    if (status === "SETTLED") return "text-gray-400 bg-gray-400/10 border-gray-400/30";
    return "text-blue-400 bg-blue-400/10 border-blue-400/30";
  };

  const balanceOCT = toOCT(predictionBalance);
  const balanceOCTPrecise = (Number(predictionBalance || 0) / MIST_PER_OCT);

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/view-car-running-high-speed%20(1).jpg')] bg-cover bg-center opacity-10" />

      <div className="relative z-10 flex flex-col min-h-screen max-w-md mx-auto pb-24">
        {/* Header */}
        <header className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={28} className="text-yellow-400" />
              <div>
                <h1 className="text-2xl font-black text-white">PREDICTION</h1>
                <p className="text-gray-400 text-xs">Bet on race winners</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/game/index.html"
                target="_blank"
                className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-black text-xs px-3 py-2 rounded-full transition-all active:scale-95"
              >
                <Eye size={14} />
                WATCH LIVE
              </a>
              <WalletButton />
            </div>
          </div>

          {/* Prediction Balance Card */}
          {isConnected && (
            <div className="bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/30 rounded-2xl p-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-purple-400" />
                  <div>
                    <p className="text-gray-400 text-xs">Prediction Balance</p>
                    <p className="text-white font-black text-lg">{balanceOCT} OCT</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDepositModal(true)}
                    className="flex items-center gap-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 font-bold text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
                  >
                    <ArrowDownToLine size={12} />
                    DEPOSIT
                  </button>
                  <button
                    onClick={() => setWithdrawModal(true)}
                    className="flex items-center gap-1 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-400 font-bold text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
                  >
                    <ArrowUpFromLine size={12} />
                    WITHDRAW
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-800/50 rounded-2xl p-1">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex-1 text-xs font-bold py-2 px-1 rounded-xl transition-all ${activeTab === i
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

            {/* Tab 0: Active Pools */}
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
                              Pool: {toOCT(pool.totalPool)} OCT
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pool.status === "RACING" && (
                            <a
                              href={`/game/index.html?spectate=${encodeURIComponent(pool.roomUid)}`}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs px-2.5 py-1.5 rounded-full transition-all"
                            >
                              <Eye size={12} />
                              WATCH
                            </a>
                          )}
                          {expandedPool === pool.id ? (
                            <ChevronUp size={18} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={18} className="text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded: Player List */}
                      {expandedPool === pool.id && (
                        <div className="px-4 pb-4 space-y-2 border-t border-gray-700/50 pt-3">
                          <p className="text-gray-400 text-xs font-bold mb-2">
                            PLAYERS — Tap to bet 2 OCT
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
                                    {player.username || `${(player.address || "").slice(0, 8)}...`}
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
                                      handleBet(
                                        pool.id,
                                        player.id || player.address,
                                        player.username || `${(player.address || "").slice(0, 8)}...`
                                      )
                                    }
                                    disabled={bettingPlayer === (player.id || player.address)}
                                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black px-4 py-2 rounded-full transition-all active:scale-95 disabled:opacity-60"
                                  >
                                    {bettingPlayer === (player.id || player.address) ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      "BET 2 OCT"
                                    )}
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

            {/* Tab 1: My Bets */}
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
                          🏁 {bet.pool?.roomUid || bet.poolId}
                        </p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColor(bet.pool?.isSettled ? "SETTLED" : "OPEN")}`}>
                          {bet.pool?.isSettled ? "SETTLED" : "OPEN"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="bg-gray-900/60 rounded-xl p-2 text-center">
                          <p className="text-gray-400 text-xs">Bet On</p>
                          <p className="text-white font-black text-xs mt-1">
                            {bet.predictedWinner ? `${bet.predictedWinner.slice(0, 8)}...` : "—"}
                          </p>
                        </div>
                        <div className="bg-gray-900/60 rounded-xl p-2 text-center">
                          <p className="text-gray-400 text-xs">Amount</p>
                          <p className="text-yellow-400 font-black text-xs mt-1">
                            {toOCT(bet.amount)} OCT
                          </p>
                        </div>
                        <div className="bg-gray-900/60 rounded-xl p-2 text-center">
                          <p className="text-gray-400 text-xs">Payout</p>
                          <p className="text-purple-400 font-black text-xs mt-1">
                            {bet.payout && Number(bet.payout) > 0 ? `${toOCT(bet.payout)} OCT` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Tab 2: Claimable */}
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
                            🏁 {bet.pool?.roomUid || bet.poolId}
                          </p>
                          <p className="text-yellow-300 font-black text-lg mt-1">
                            +{toOCT(bet.payout)} OCT
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

      {/* Deposit Modal */}
      {depositModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDepositModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-gray-900 border border-gray-700 rounded-3xl p-6">
            <h3 className="text-white font-black text-lg mb-1 flex items-center gap-2">
              <ArrowDownToLine size={20} className="text-green-400" />
              Deposit OCT
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Transfer OCT from your wallet to your prediction balance.
              This will sign an on-chain transaction.
            </p>

            <div className="bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2 mb-4">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Amount (OCT)"
                className="flex-1 bg-transparent text-white font-black text-lg outline-none placeholder:text-gray-600"
                min="1"
              />
              <span className="text-green-400 font-bold text-sm">OCT</span>
            </div>

            {depositError && (
              <div className="bg-red-900/30 border border-red-600 rounded-2xl px-4 py-3 mb-4">
                <p className="text-red-300 text-sm mb-2">
                  Last deposit failed but consumed ~{depositError.gasLost.toFixed(6)} OCT in gas.
                </p>
                <p className="text-gray-400 text-xs">
                  TX: {depositError.txDigest.substring(0, 16)}...
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDepositModal(false);
                  setDepositError(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-2xl transition-all"
              >
                Cancel
              </button>
              {depositError ? (
                <button
                  onClick={() => handleRecoverDeposit(depositError.txDigest, depositError.gasLost)}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-2xl transition-all active:scale-95"
                >
                  Recover {depositError.gasLost.toFixed(6)} OCT
                </button>
              ) : (
                <button
                  onClick={handleDeposit}
                  disabled={!depositAmount || depositLoading}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-60"
                >
                  {depositLoading ? (
                    <Loader2 size={18} className="animate-spin mx-auto" />
                  ) : (
                    "DEPOSIT"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setWithdrawModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-gray-900 border border-gray-700 rounded-3xl p-6">
            <h3 className="text-white font-black text-lg mb-1 flex items-center gap-2">
              <ArrowUpFromLine size={20} className="text-orange-400" />
              Withdraw OCT
            </h3>
            <p className="text-gray-400 text-sm mb-2">
              Transfer OCT from your prediction balance back to your wallet.
            </p>
            <p className="text-purple-400 text-xs mb-4">
              Available: <span className="font-black">{balanceOCTPrecise} OCT</span>
            </p>

            <div className="bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2 mb-4">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount (OCT)"
                className="flex-1 bg-transparent text-white font-black text-lg outline-none placeholder:text-gray-600"
                min="0"
                step="any"
              />
              <button
                type="button"
                onClick={() => setWithdrawAmount(String(balanceOCTPrecise))}
                className="text-purple-400 hover:text-purple-300 font-black text-xs px-2 py-1 border border-purple-500/40 rounded-lg transition-all"
              >
                MAX
              </button>
              <span className="text-orange-400 font-bold text-sm">OCT</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setWithdrawModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || withdrawLoading}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-60"
              >
                {withdrawLoading ? (
                  <Loader2 size={18} className="animate-spin mx-auto" />
                ) : (
                  "WITHDRAW"
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
