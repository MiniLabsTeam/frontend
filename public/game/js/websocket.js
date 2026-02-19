/**
 * WebSocket Client - Socket.io integration
 *
 * Manages WebSocket connection to the backend server.
 * Handles:
 * - Connection/reconnection management
 * - Event broadcasting and listening
 * - Room operations (join, ready, input)
 */

class WebSocketClient {
  constructor(apiBaseUrl, token) {
    // Extract base URL without /api path
    const baseUrl = apiBaseUrl.replace('/api', '');

    console.log('🔌 Initializing WebSocket client to:', baseUrl);

    // Initialize Socket.io client
    this.socket = io(baseUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.connected = false;
    this.setupBaseHandlers();
  }

  /**
   * Setup base event handlers for connection lifecycle
   */
  setupBaseHandlers() {
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.connected = false;

      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        console.log('🔄 Reconnecting...');
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      this.connected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      this.connected = true;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after all attempts');
    });

    // Global error handler
    this.socket.on('ERROR', (error) => {
      console.error('❌ Server error:', error.message || error);
    });
  }

  /**
   * Register event listener
   */
  on(event, handler) {
    this.socket.on(event, handler);
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    this.socket.off(event, handler);
  }

  /**
   * Emit event to server
   */
  emit(event, data, callback) {
    if (!this.connected) {
      console.warn('⚠️ Not connected, event may be queued:', event);
    }

    this.socket.emit(event, data, callback);
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    console.log('🔌 Disconnecting WebSocket...');
    this.socket.disconnect();
  }

  /**
   * Reconnect to server
   */
  reconnect() {
    console.log('🔄 Manual reconnect...');
    this.socket.connect();
  }

  // ==================== Room Operations ====================

  /**
   * Join a game room
   */
  async joinRoom(roomUid, carUid) {
    return new Promise((resolve, reject) => {
      console.log(`📥 Joining room ${roomUid} with car ${carUid}...`);

      this.emit('PLAYER_JOIN', { roomUid, carUid }, (response) => {
        if (response && response.success) {
          console.log('✅ Successfully joined room');
          resolve(response.data);
        } else {
          const errorMsg = response?.message || 'Failed to join room';
          console.error('❌ Join room error:', errorMsg);
          reject(new Error(errorMsg));
        }
      });
    });
  }

  /**
   * Mark player as ready
   */
  async markReady(roomUid) {
    return new Promise((resolve, reject) => {
      console.log(`✋ Marking ready in room ${roomUid}...`);

      this.emit('PLAYER_READY', { roomUid }, (response) => {
        if (response && response.success) {
          console.log('✅ Marked as ready');
          resolve(response.data);
        } else {
          const errorMsg = response?.message || 'Failed to mark ready';
          console.error('❌ Mark ready error:', errorMsg);
          reject(new Error(errorMsg));
        }
      });
    });
  }

  /**
   * Send player input
   */
  sendInput(roomUid, action) {
    this.emit('PLAYER_INPUT', { roomUid, action }, (response) => {
      if (response && !response.success) {
        console.error('❌ Input error:', response.message);
      }
    });
  }

  /**
   * Get room state
   */
  async getRoomState(roomUid) {
    return new Promise((resolve, reject) => {
      this.emit('GET_ROOM_STATE', { roomUid }, (response) => {
        if (response && response.success) {
          resolve(response.data);
        } else {
          const errorMsg = response?.message || 'Failed to get room state';
          reject(new Error(errorMsg));
        }
      });
    });
  }

  /**
   * Leave room
   */
  async leaveRoom(roomUid) {
    return new Promise((resolve, reject) => {
      console.log(`👋 Leaving room ${roomUid}...`);

      this.emit('PLAYER_LEAVE', { roomUid }, (response) => {
        if (response && response.success) {
          console.log('✅ Left room');
          resolve();
        } else {
          const errorMsg = response?.message || 'Failed to leave room';
          console.error('❌ Leave room error:', errorMsg);
          reject(new Error(errorMsg));
        }
      });
    });
  }
}

// Global WebSocket client instance
window.wsClient = null;

/**
 * Initialize WebSocket client with credentials
 */
window.initWebSocket = function(apiBaseUrl, token) {
  if (window.wsClient) {
    console.log('⚠️ WebSocket already initialized, disconnecting old connection...');
    window.wsClient.disconnect();
  }

  window.wsClient = new WebSocketClient(apiBaseUrl, token);
  console.log('✅ WebSocket client initialized');

  return window.wsClient;
};
