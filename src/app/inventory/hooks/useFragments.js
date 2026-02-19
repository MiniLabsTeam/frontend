"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";

/**
 * Custom hook for managing fragments state and fetching
 */
export function useFragments() {
  const [fragmentsData, setFragmentsData] = useState([]);
  const [loadingFragments, setLoadingFragments] = useState(true);
  const { getAuthToken } = useWallet();

  const fetchFragments = useCallback(async () => {
    try {
      setLoadingFragments(true);
      const authToken = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/fragments`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch fragments");
      }

      const data = await response.json();
      setFragmentsData(data.fragments || []);
    } catch (error) {
      console.error("Failed to fetch fragments:", error);
      setFragmentsData([]);
    } finally {
      setLoadingFragments(false);
    }
  }, [getAuthToken]);

  return {
    fragmentsData,
    loadingFragments,
    fetchFragments,
  };
}
