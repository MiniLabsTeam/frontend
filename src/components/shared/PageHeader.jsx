"use client";

import { useState, useEffect } from "react";
import { Coins } from "lucide-react";
import { useSuiClientQuery } from "@onelabs/dapp-kit";
import { useWallet } from "@/hooks/useWallet";
import WalletButton from "./WalletButton";

const OCT_COIN_TYPE = "0x2::oct::OCT";
const MIST_PER_OCT = 1_000_000_000;

export default function PageHeader() {
  const { isConnected, walletAddress, getAuthToken } = useWallet();
  const [tokenBalance, setTokenBalance] = useState(null);

  const { data: balanceData, isLoading: balanceLoading } = useSuiClientQuery(
    "getBalance",
    { owner: walletAddress ?? "", coinType: OCT_COIN_TYPE },
    { enabled: !!walletAddress }
  );
  const octBalance = balanceData
    ? (Number(balanceData.totalBalance) / MIST_PER_OCT).toFixed(2)
    : null;

  useEffect(() => {
    if (!isConnected) return;
    getAuthToken()
      .then((token) =>
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((r) => r.json())
      .then((d) => setTokenBalance(d.data?.tokenBalance ?? 0))
      .catch(() => {});
  }, [isConnected, getAuthToken]);

  return (
    <div className="flex items-center justify-end gap-2 px-4 pt-3 pb-3">
      {walletAddress && tokenBalance !== null && (
        <div className="bg-purple-600/90 border-2 border-purple-400 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
          <span className="text-yellow-300 text-xs">🪙</span>
          <span className="text-white text-xs font-black">
            {tokenBalance.toLocaleString()}
          </span>
        </div>
      )}
      {walletAddress && (
        <div className="bg-orange-500/90 border-2 border-orange-400 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
          <Coins size={12} className="text-yellow-200" />
          {balanceLoading ? (
            <span className="w-10 h-3 bg-orange-400/60 rounded animate-pulse inline-block" />
          ) : (
            <span className="text-white text-xs font-black">
              {octBalance ?? "—"} OCT
            </span>
          )}
        </div>
      )}
      <WalletButton />
    </div>
  );
}
