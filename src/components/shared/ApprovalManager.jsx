"use client";

import React, { useState } from 'react';
import { useNFTApprovals } from '@/hooks/useNFTApprovals';
import { toast } from 'sonner';

/**
 * Approval Manager Component
 * Shows orphaned NFT approvals and allows revocation
 */
export default function ApprovalManager({ contract, onRevoke }) {
  const { getOrphanedApprovals, clearApproval } = useNFTApprovals();
  const [revoking, setRevoking] = useState(null);

  const orphanedApprovals = getOrphanedApprovals();

  const handleRevoke = async (approval) => {
    try {
      setRevoking(approval.tokenId);

      // Call the contract to revoke approval
      const tx = await contract.approve(
        '0x0000000000000000000000000000000000000000', // Zero address = revoke
        approval.tokenId
      );

      toast.info('Revoking approval...');
      await tx.wait();

      // Clear from tracking
      clearApproval(approval.tokenId);

      toast.success('Approval revoked successfully');

      if (onRevoke) {
        onRevoke(approval.tokenId);
      }
    } catch (error) {
      console.error('Failed to revoke approval:', error);
      toast.error(error.message || 'Failed to revoke approval');
    } finally {
      setRevoking(null);
    }
  };

  const formatTimestamp = (timestamp) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  if (orphanedApprovals.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-yellow-500"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <h3 className="text-sm font-medium text-yellow-400">
          Orphaned Approvals Detected
        </h3>
      </div>

      <p className="text-sm text-yellow-300">
        These NFTs were approved but listing may have failed. You can revoke approval to regain full control.
      </p>

      <div className="space-y-2">
        {orphanedApprovals.map((approval) => (
          <div
            key={approval.tokenId}
            className="flex items-center justify-between bg-gray-800/50 rounded p-3"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                Token #{approval.tokenId}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Approved {formatTimestamp(approval.timestamp)}
              </p>
            </div>

            <button
              onClick={() => handleRevoke(approval)}
              disabled={revoking === approval.tokenId}
              className="px-3 py-1.5 text-sm font-medium text-yellow-400 border border-yellow-500/50 rounded hover:bg-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {revoking === approval.tokenId ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Revoking...
                </span>
              ) : (
                'Revoke Approval'
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
