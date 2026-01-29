/**
 * Form validation utilities
 */

/**
 * Validates price input
 * @param {string|number} price - The price value
 * @returns {Object} - Validation result with valid flag and error message
 */
export function validatePrice(price) {
  const numPrice = parseFloat(price);

  if (isNaN(numPrice)) {
    return {
      valid: false,
      error: "Please enter a valid number"
    };
  }

  if (numPrice < 0) {
    return {
      valid: false,
      error: "Price must be positive"
    };
  }

  if (numPrice === 0) {
    return {
      valid: false,
      error: "Price must be greater than 0"
    };
  }

  if (numPrice > 10000000) {
    return {
      valid: false,
      error: "Price exceeds maximum allowed (10,000,000 IDRX)"
    };
  }

  // Check for too many decimal places
  const decimalPlaces = price.toString().split('.')[1]?.length || 0;
  if (decimalPlaces > 2) {
    return {
      valid: false,
      error: "Price can have at most 2 decimal places"
    };
  }

  return { valid: true };
}

/**
 * Validates shipping address fields
 * @param {Object} address - Address object with name, street, city, state, zip
 * @returns {Object} - Validation result
 */
export function validateShippingAddress(address) {
  const errors = {};

  if (!address.name || address.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  if (address.name && address.name.length > 100) {
    errors.name = "Name is too long (max 100 characters)";
  }

  if (!address.street || address.street.trim().length < 5) {
    errors.street = "Street address must be at least 5 characters";
  }

  if (address.street && address.street.length > 200) {
    errors.street = "Street address is too long (max 200 characters)";
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.city = "City must be at least 2 characters";
  }

  if (address.city && address.city.length > 100) {
    errors.city = "City is too long (max 100 characters)";
  }

  if (!address.state || address.state.trim().length < 2) {
    errors.state = "State/Province is required";
  }

  if (address.state && address.state.length > 100) {
    errors.state = "State/Province is too long (max 100 characters)";
  }

  if (!address.zip || address.zip.trim().length < 3) {
    errors.zip = "Postal code must be at least 3 characters";
  }

  if (address.zip && address.zip.length > 20) {
    errors.zip = "Postal code is too long (max 20 characters)";
  }

  // Check for potentially dangerous characters (XSS prevention)
  const dangerousPattern = /[<>\"']/;
  Object.keys(address).forEach(key => {
    if (address[key] && dangerousPattern.test(address[key])) {
      errors[key] = `${key} contains invalid characters`;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates email format
 * @param {string} email - Email address
 * @returns {Object} - Validation result
 */
export function validateEmail(email) {
  if (!email || email.trim().length === 0) {
    return {
      valid: false,
      error: "Email is required"
    };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return {
      valid: false,
      error: "Please enter a valid email address"
    };
  }

  if (email.length > 254) {
    return {
      valid: false,
      error: "Email is too long"
    };
  }

  return { valid: true };
}

/**
 * Validates phone number
 * @param {string} phone - Phone number
 * @returns {Object} - Validation result
 */
export function validatePhone(phone) {
  if (!phone || phone.trim().length === 0) {
    return {
      valid: false,
      error: "Phone number is required"
    };
  }

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Check if it's numeric and has reasonable length
  if (!/^\+?\d{7,15}$/.test(cleaned)) {
    return {
      valid: false,
      error: "Please enter a valid phone number (7-15 digits)"
    };
  }

  return { valid: true };
}

/**
 * Validates token ID
 * @param {string|number} tokenId - NFT token ID
 * @returns {Object} - Validation result
 */
export function validateTokenId(tokenId) {
  const num = parseInt(tokenId);

  if (isNaN(num)) {
    return {
      valid: false,
      error: "Invalid token ID"
    };
  }

  if (num < 0) {
    return {
      valid: false,
      error: "Token ID must be positive"
    };
  }

  return { valid: true };
}

/**
 * Validates wallet address
 * @param {string} address - Ethereum address
 * @returns {Object} - Validation result
 */
export function validateWalletAddress(address) {
  if (!address) {
    return {
      valid: false,
      error: "Wallet address is required"
    };
  }

  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return {
      valid: false,
      error: "Invalid Ethereum address format"
    };
  }

  return { valid: true };
}

/**
 * Sanitizes user input to prevent XSS
 * @param {string} input - User input
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
