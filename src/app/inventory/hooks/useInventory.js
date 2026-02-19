"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { RARITY_CONFIG } from "@/constants";

/**
 * Custom hook for managing cars inventory state and fetching
 */
export function useInventory() {
  const [inventoryData, setInventoryData] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const { getAuthToken } = useWallet();

  const fetchInventory = useCallback(async () => {
    try {
      setLoadingInventory(true);
      const authToken = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/cars`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const data = await response.json();

      const transformedCars = data.cars.map((car) => ({
        id: car.tokenId,
        tokenId: car.tokenId,
        name: car.modelName?.toUpperCase() || "UNKNOWN",
        modelName: car.modelName || "Unknown",
        series: car.series || "Unknown",
        rarity: car.rarity || "common",
        rarityColor: RARITY_CONFIG[car.rarity]?.gradient || "from-gray-500 to-gray-600",
        image: `/assets/car/${car.modelName}.png`,
        mintTxHash: car.mintTxHash,
        isRedeemed: car.isRedeemed,
      }));

      setInventoryData(transformedCars);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      setInventoryData([]);
    } finally {
      setLoadingInventory(false);
    }
  }, [getAuthToken]);

  const filteredInventory =
    selectedFilter === "all"
      ? inventoryData
      : inventoryData.filter((car) => car.rarity === selectedFilter);

  return {
    inventoryData,
    filteredInventory,
    loadingInventory,
    selectedFilter,
    setSelectedFilter,
    fetchInventory,
  };
}
