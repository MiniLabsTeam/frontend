"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";

export function useMarketplaceListings() {
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const { getAuthToken } = useWallet();

  const fetchListings = useCallback(async () => {
    try {
      setLoadingListings(true);
      const authToken = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/listings`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }

      const data = await response.json();
      setListings(data.listings || []);
    } catch (error) {
      console.error("Failed to fetch listings:", error);
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  }, [getAuthToken]);

  const filteredListings = listings
    .filter((listing) => seriesFilter === "all" || listing.car.series === seriesFilter)
    .sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return b.createdAt - a.createdAt;
    });

  return {
    listings: filteredListings,
    loadingListings,
    seriesFilter,
    setSeriesFilter,
    sortBy,
    setSortBy,
    fetchListings,
  };
}
