/**
 * Blockchain utility functions for reliable transaction handling
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validates that the wallet is connected to the correct network (Base Sepolia)
 * @param {Object} embeddedWallet - The wallet instance
 * @returns {Promise<boolean>} - true if valid, false otherwise
 */
export async function validateNetwork(embeddedWallet) {
  try {
    if (!embeddedWallet) {
      throw new Error("No wallet connected");
    }

    const provider = await embeddedWallet.getEthereumProvider();
    const network = await provider.request({ method: "eth_chainId" });
    const chainId = parseInt(network, 16);

    const expectedChainId = 84532; // Base Sepolia

    if (chainId !== expectedChainId) {
      return {
        valid: false,
        error: `Please switch to Base Sepolia network. Current: ${chainId}, Expected: ${expectedChainId}`
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error.message || "Failed to validate network"
    };
  }
}

/**
 * Waits for a transaction with retry logic and exponential backoff
 * @param {Object} tx - The transaction object
 * @param {Object} provider - The ethers provider
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<Object>} - The transaction receipt
 */
export async function waitForTransaction(tx, provider, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const receipt = await tx.wait();

      // Verify the transaction succeeded
      if (receipt && receipt.status === 1) {
        return receipt;
      } else if (receipt && receipt.status === 0) {
        throw new Error("Transaction failed on-chain");
      }

      return receipt;
    } catch (error) {
      // If this is the last retry, give up
      if (i === maxRetries - 1) {
        throw error;
      }

      // Wait with exponential backoff
      const backoffMs = 2000 * Math.pow(2, i);
      console.warn(`Transaction wait failed (attempt ${i + 1}/${maxRetries}), retrying in ${backoffMs}ms...`, error);
      await sleep(backoffMs);

      // Try to get the receipt directly as a fallback
      try {
        if (provider && tx.hash) {
          const receipt = await provider.getTransactionReceipt(tx.hash);
          if (receipt && receipt.status === 1) {
            console.log("Transaction succeeded despite wait() error");
            return receipt;
          }
        }
      } catch (receiptError) {
        console.warn("Failed to get receipt directly:", receiptError);
      }
    }
  }

  throw new Error("Failed to confirm transaction after multiple retries");
}

/**
 * Validates transaction parameters before sending
 * @param {Object} params - Transaction parameters
 * @returns {Object} - Validation result
 */
export function validateTransactionParams(params) {
  const errors = [];

  if (params.value && isNaN(parseFloat(params.value))) {
    errors.push("Invalid transaction value");
  }

  if (params.value && parseFloat(params.value) < 0) {
    errors.push("Transaction value cannot be negative");
  }

  if (params.to && !params.to.match(/^0x[a-fA-F0-9]{40}$/)) {
    errors.push("Invalid recipient address");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Formats error messages for user display
 * @param {Error} error - The error object
 * @returns {string} - User-friendly error message
 */
export function formatBlockchainError(error) {
  const message = error?.message || error?.toString() || "Unknown error";

  // Common error patterns
  if (message.includes("user rejected")) {
    return "Transaction cancelled by user";
  }

  if (message.includes("insufficient funds")) {
    return "Insufficient funds for transaction";
  }

  if (message.includes("nonce")) {
    return "Transaction nonce error. Please try again.";
  }

  if (message.includes("gas")) {
    return "Transaction failed due to gas estimation. Please try again.";
  }

  if (message.includes("network")) {
    return "Network error. Please check your connection and try again.";
  }

  if (message.includes("timeout")) {
    return "Transaction timeout. Please check your connection.";
  }

  // Return original message if no pattern matches
  return message.length > 100
    ? message.substring(0, 100) + "..."
    : message;
}

/**
 * Checks if user has sufficient balance for transaction
 * @param {Object} provider - The ethers provider
 * @param {string} address - User's wallet address
 * @param {string} amount - Amount in wei
 * @returns {Promise<boolean>} - true if sufficient balance
 */
export async function checkBalance(provider, address, amount) {
  try {
    const balance = await provider.getBalance(address);
    return balance.gte(amount);
  } catch (error) {
    console.error("Failed to check balance:", error);
    return false;
  }
}

/**
 * Estimates gas for a transaction with buffer
 * @param {Object} contract - The contract instance
 * @param {string} method - The method name
 * @param {Array} args - Method arguments
 * @param {number} bufferPercent - Buffer percentage (default: 20%)
 * @returns {Promise<Object>} - Gas limit
 */
export async function estimateGasWithBuffer(contract, method, args, bufferPercent = 20) {
  try {
    const estimated = await contract.estimateGas[method](...args);
    const buffer = estimated.mul(bufferPercent).div(100);
    return estimated.add(buffer);
  } catch (error) {
    console.error("Gas estimation failed:", error);
    // Return a high default gas limit
    return 500000;
  }
}
