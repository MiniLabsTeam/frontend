"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";

export function useDashboardStats() {
  const [stats, setStats] = useState({
    totalCars: 0,
    totalValue: 0,
    legendaryCount: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const { getAuthToken } = useWallet();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const authToken = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/stats`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats({
        totalCars: data.totalCars || 0,
        totalValue: data.totalValue || 0,
        legendaryCount: data.legendaryCount || 0,
        recentActivity: data.recentActivity || [],
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setStats({
        totalCars: 0,
        totalValue: 0,
        legendaryCount: 0,
        recentActivity: [],
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  return {
    stats,
    loading,
    fetchStats,
  };
}
