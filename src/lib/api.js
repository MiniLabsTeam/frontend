/**
 * API Client for Backend Communication
 * Handles authentication with Privy tokens
 */

// Backend API URL - change this to your deployed backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

/**
 * Make authenticated API request to backend
 * @param {string} endpoint - API endpoint (e.g., "/api/gacha/spin")
 * @param {Object} options - Fetch options
 * @param {string} authToken - Privy auth token
 * @returns {Promise<any>} Response data
 */
export async function apiRequest(endpoint, options = {}, authToken = null) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add Privy auth token if provided
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Request Error:", error);
    throw error;
  }
}

/**
 * GET request
 */
export async function apiGet(endpoint, authToken) {
  return apiRequest(endpoint, { method: "GET" }, authToken);
}

/**
 * POST request
 */
export async function apiPost(endpoint, data, authToken) {
  return apiRequest(
    endpoint,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    authToken
  );
}

/**
 * PUT request
 */
export async function apiPut(endpoint, data, authToken) {
  return apiRequest(
    endpoint,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    authToken
  );
}

/**
 * DELETE request
 */
export async function apiDelete(endpoint, authToken) {
  return apiRequest(endpoint, { method: "DELETE" }, authToken);
}
