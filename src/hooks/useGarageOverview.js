"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";

/**
 * Custom hook for fetching garage overview (balance + user info)
 * More efficient than separate hooks since it fetches from one endpoint
 *
 * @returns {Object} Garage overview state and methods
 * @returns {number} returns.balance - MockIDRX balance
 * @returns {Object} returns.userInfo - User information object
 * @returns {string|null} returns.userInfo.username - User's username
 * @returns {string|null} returns.userInfo.email - User's email
 * @returns {boolean} returns.userInfo.usernameSet - Whether username is set
 * @returns {boolean} returns.loading - Loading state
 * @returns {Function} returns.refetch - Function to refetch data
 *
 * @example
 * const { balance, userInfo, loading, refetch } = useGarageOverview();
 */
export function useGarageOverview() {
  const [balance, setBalance] = useState(0);
  const [userInfo, setUserInfo] = useState({
    username: null,
    email: null,
    usernameSet: false,
  });
  const [loading, setLoading] = useState(false);
  const { getAuthToken, isConnected } = useWallet();

  const fetchOverview = useCallback(async () => {
    if (!isConnected) {
      setBalance(0);
      setUserInfo({
        username: null,
        email: null,
        usernameSet: false,
      });
      return;
    }

    try {
      setLoading(true);
      const authToken = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/garage/overview`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const data = await response.json();

      setBalance(data.user?.mockIDRX || 0);
      setUserInfo({
        username: data.user?.username || null,
        email: data.user?.email || null,
        usernameSet: data.user?.usernameSet || false,
      });
    } catch (error) {
      console.error("Failed to fetch garage overview:", error);
      setBalance(0);
      setUserInfo({
        username: null,
        email: null,
        usernameSet: false,
      });
    } finally {
      setLoading(false);
    }
  }, [isConnected, getAuthToken]);

  useEffect(() => {
    if (isConnected) {
      fetchOverview();
    }
  }, [isConnected, fetchOverview]);

  return { balance, userInfo, loading, refetch: fetchOverview };
}
