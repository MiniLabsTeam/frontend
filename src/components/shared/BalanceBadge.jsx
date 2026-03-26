"use client";

import { Wallet } from "lucide-react";
import { formatNumber } from "@/utils";

/**
 * Reusable balance display badge
 * @param {Object} props
 * @param {number} props.balance - OCT token balance
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onClick - Click handler
 */
export function BalanceBadge({ balance, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 hover:bg-white/20 transition-all"
    >
      <Wallet size={18} className="text-yellow-400" />
      <span className="font-bold text-white">
        {loading ? "..." : formatNumber(balance)}
      </span>
      <span className="text-white/60 text-sm">OCT</span>
    </button>
  );
}
