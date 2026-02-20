/**
 * API Client for Backend Communication
 */

class GameAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  /**
   * Set JWT token for authenticated requests
   */
  setToken(token) {
    this.token = token;
    console.log('✅ JWT Token set');

    // Initialize WebSocket connection with token
    if (typeof initWebSocket === 'function') {
      initWebSocket(this.baseUrl, token);
      console.log('✅ WebSocket initialized');
    } else {
      console.warn('⚠️ WebSocket initialization function not found');
    }
  }

  /**
   * Make HTTP request to backend
   */
  async _request(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return result;
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Create a new game room
   */
  async createRoom(gameMode, maxPlayers, entryFee, deadline) {
    return await this._request('POST', '/game/room/create', {
      gameMode,
      maxPlayers,
      entryFee,
      deadline,
    });
  }

  /**
   * Create a room with AI opponent
   */
  async createRoomWithAI(carUid) {
    return await this._request('POST', '/game/room/create-vs-ai', { carUid });
  }

  /**
   * Join an existing room
   */
  async joinRoom(roomUid, carUid) {
    return await this._request('POST', `/game/room/${roomUid}/join`, {
      carUid,
    });
  }

  /**
   * Mark player as ready
   */
  async markReady(roomUid) {
    return await this._request('POST', `/game/room/${roomUid}/ready`);
  }

  /**
   * Get room information (for lobby polling)
   */
  async getRoomInfo(roomUid) {
    return await this._request('GET', `/game/room/${roomUid}`);
  }

  /**
   * Get list of available rooms
   */
  async listRooms(filters = {}) {
    let endpoint = '/game/rooms';
    const params = new URLSearchParams();

    if (filters.gameMode) params.append('gameMode', filters.gameMode);
    if (filters.status) params.append('status', filters.status);

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return await this._request('GET', endpoint);
  }

  /**
   * Get current game state (for game polling)
   */
  async getGameState(roomUid) {
    return await this._request('GET', `/game/${roomUid}/state`);
  }

  /**
   * Submit player input
   */
  async submitInput(roomUid, action) {
    return await this._request('POST', `/game/${roomUid}/input`, {
      action,
    });
  }

  /**
   * Get race result
   */
  async getResult(roomUid) {
    return await this._request('GET', `/game/${roomUid}/result`);
  }

  /**
   * Get list of active games (debug)
   */
  async getActiveGames() {
    return await this._request('GET', '/game/active');
  }
}

// Create global API instance
window.gameAPI = new GameAPI(CONFIG.API_BASE_URL);
