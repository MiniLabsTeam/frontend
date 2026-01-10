/**
 * Gacha API Client
 * Handles gacha-related API calls to backend
 */

import { apiGet, apiPost } from "./api";

/**
 * Get available gacha boxes and user coins
 * @param {string} authToken - Privy authentication token
 * @returns {Promise<{userCoins: number, boxes: Array}>}
 */
export async function getGachaBoxes(authToken) {
  try {
    const data = await apiGet("/api/gacha/boxes", authToken);
    return data;
  } catch (error) {
    console.error("Failed to fetch gacha boxes:", error);
    throw error;
  }
}

/**
 * Open a gacha box and mint NFT
 * @param {string} boxType - Type of box: "standard" | "premium" | "legendary"
 * @param {string} authToken - Privy authentication token
 * @returns {Promise<{success: boolean, reward: Object, coins: Object}>}
 */
export async function openGachaBox(boxType, authToken) {
  try {
    const data = await apiPost(
      "/api/gacha/open",
      { boxType },
      authToken
    );
    return data;
  } catch (error) {
    console.error("Failed to open gacha box:", error);
    throw error;
  }
}

/**
 * Map backend rarity to frontend display
 */
export const RARITY_CONFIG = {
  common: {
    color: "from-gray-500 to-gray-600",
    label: "COMMON",
  },
  rare: {
    color: "from-blue-500 to-cyan-500",
    label: "RARE",
  },
  epic: {
    color: "from-purple-500 to-pink-500",
    label: "EPIC",
  },
  legendary: {
    color: "from-yellow-500 to-orange-500",
    label: "LEGEND",
  },
};

/**
 * Get rarity display config
 */
export function getRarityConfig(rarity) {
  return RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
}
