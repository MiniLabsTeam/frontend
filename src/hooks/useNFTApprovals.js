"use client";

import { useState, useEffect, useCallback } from 'react';

const APPROVALS_KEY = 'nft_approvals';
const APPROVAL_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Hook to track NFT approvals in localStorage
 * Helps identify orphaned approvals where approval succeeded but listing failed
 */
export function useNFTApprovals() {
  const [approvals, setApprovals] = useState({});

  // Load approvals from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(APPROVALS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Clean up old approvals (> 30 minutes)
        const now = Date.now();
        const filtered = Object.entries(parsed).reduce((acc, [tokenId, data]) => {
          if (now - data.timestamp < APPROVAL_TIMEOUT) {
            acc[tokenId] = data;
          }
          return acc;
        }, {});
        setApprovals(filtered);
        localStorage.setItem(APPROVALS_KEY, JSON.stringify(filtered));
      }
    } catch (error) {
      console.error('Failed to load NFT approvals:', error);
    }
  }, []);

  /**
   * Track a new approval
   */
  const trackApproval = useCallback((tokenId, operator, txHash = null) => {
    try {
      const newApproval = {
        tokenId: tokenId.toString(),
        operator,
        txHash,
        timestamp: Date.now()
      };

      const updated = {
        ...approvals,
        [tokenId.toString()]: newApproval
      };

      setApprovals(updated);
      localStorage.setItem(APPROVALS_KEY, JSON.stringify(updated));

      console.log('Tracked NFT approval:', newApproval);
    } catch (error) {
      console.error('Failed to track approval:', error);
    }
  }, [approvals]);

  /**
   * Clear an approval after successful listing
   */
  const clearApproval = useCallback((tokenId) => {
    try {
      const updated = { ...approvals };
      delete updated[tokenId.toString()];

      setApprovals(updated);
      localStorage.setItem(APPROVALS_KEY, JSON.stringify(updated));

      console.log('Cleared NFT approval:', tokenId);
    } catch (error) {
      console.error('Failed to clear approval:', error);
    }
  }, [approvals]);

  /**
   * Check if a token has a pending approval
   */
  const hasApproval = useCallback((tokenId) => {
    return !!approvals[tokenId.toString()];
  }, [approvals]);

  /**
   * Get approval details for a token
   */
  const getApproval = useCallback((tokenId) => {
    return approvals[tokenId.toString()] || null;
  }, [approvals]);

  /**
   * Get all orphaned approvals (older than 5 minutes)
   */
  const getOrphanedApprovals = useCallback(() => {
    const now = Date.now();
    const ORPHAN_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    return Object.values(approvals).filter(
      approval => now - approval.timestamp > ORPHAN_THRESHOLD
    );
  }, [approvals]);

  /**
   * Clear all approvals
   */
  const clearAllApprovals = useCallback(() => {
    setApprovals({});
    localStorage.setItem(APPROVALS_KEY, JSON.stringify({}));
  }, []);

  return {
    approvals: Object.values(approvals),
    trackApproval,
    clearApproval,
    hasApproval,
    getApproval,
    getOrphanedApprovals,
    clearAllApprovals
  };
}
