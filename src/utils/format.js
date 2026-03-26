/**
 * Formatting Utilities
 * Functions for formatting numbers, addresses, time, etc.
 */

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number (e.g., "1,000,000")
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString();
}

/**
 * Format wallet address to short form
 * @param {string} address - Wallet address
 * @param {number} prefixLength - Number of characters to show at start
 * @param {number} suffixLength - Number of characters to show at end
 * @returns {string} Formatted address (e.g., "0x1234...5678")
 */
export function formatAddress(address, prefixLength = 6, suffixLength = 4) {
  if (!address) return "";
  if (address.length <= prefixLength + suffixLength) return address;
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

/**
 * Format cooldown time in seconds to human readable
 * @param {number} seconds - Seconds remaining
 * @returns {string} Formatted time (e.g., "5h 30m", "23h 15m", "Ready!")
 */
export function formatCooldown(seconds) {
  if (seconds <= 0) return "Ready!";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format OCT token balance
 * @param {number} balance - Balance in OCT
 * @returns {string} Formatted balance
 */
export function formatBalance(balance) {
  return formatNumber(Math.floor(balance));
}

/**
 * Format price with currency
 * @param {number} price - Price value
 * @param {string} currency - Currency symbol
 * @returns {string} Formatted price
 */
export function formatPrice(price, currency = "OCT") {
  return `${formatNumber(price)} ${currency}`;
}
