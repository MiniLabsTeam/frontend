/**
 * Gacha API Client
 * Handles gacha-related API calls to backend
 */

import { apiGet, apiPost } from "./api";
import { RARITY_CONFIG } from "@/constants";

/**
 * Get all gacha tiers from backend
 * @param {string} authToken
 * @returns {Promise<Array>} Array of tier objects
 */
export async function getGachaTiers(authToken) {
  const res = await apiGet("/api/gacha/tiers", authToken);
  return res.data ?? res;
}

/**
 * Get pricing for a gacha tier (with backend signature)
 * @param {number} tierId - Tier ID (1, 2, or 3)
 * @param {string} authToken
 * @returns {Promise<Object>} Pricing info
 */
export async function getGachaPricing(tierId, authToken) {
  const res = await apiPost("/api/gacha/pricing", { tierId }, authToken);
  return res.data ?? res;
}

/**
 * Reveal gacha result for a tier (after on-chain commit)
 * @param {number} tierId - Tier ID (1, 2, or 3)
 * @param {string} authToken
 * @param {boolean} isCar - Must match the is_car committed on-chain
 * @returns {Promise<Object>} Reveal data with reward + signature for on-chain tx
 */
export async function revealGacha(tierId, authToken, isCar) {
  const res = await apiPost("/api/gacha/reveal", { tierId, is_car: isCar }, authToken);
  return res.data ?? res;
}

/**
 * Get user's gacha history
 * @param {string} authToken
 * @param {number} limit
 */
export async function getGachaHistory(authToken, limit = 20) {
  const res = await apiGet(`/api/gacha/history?limit=${limit}`, authToken);
  return res.data ?? res;
}

export { RARITY_CONFIG };

/**
 * Get rarity display config
 */
export function getRarityConfig(rarity) {
  return RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
}

/**
 * Map tier name string to backend integer ID
 * standard → 1, rare/premium → 2, legendary → 3
 */
export function tierNameToId(tierName) {
  const map = { standard: 1, rare: 2, premium: 2, legendary: 3 };
  return map[tierName?.toLowerCase()] ?? 1;
}
