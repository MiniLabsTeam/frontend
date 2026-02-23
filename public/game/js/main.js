/**
 * Phaser Game Initialization
 */

// Game configuration
const gameConfig = {
  type: Phaser.AUTO,
  width: CONFIG.CANVAS_WIDTH,
  height: CONFIG.CANVAS_HEIGHT,
  parent: 'game-container',
  backgroundColor: CONFIG.COLORS.BACKGROUND,
  scene: [], // Will be populated after scene classes are loaded
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }, // No gravity for top-down view
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

// Wait for DOM to load
window.addEventListener('load', () => {
  // Add scenes to config (they're loaded from separate files)
  gameConfig.scene = [MenuScene, LobbyScene, SpectateListScene, GameScene, PredictionScene, ResultScene];

  // Create Phaser game instance
  const game = new Phaser.Game(gameConfig);

  // Make API and game globally accessible
  window.game = game;

  // Get credentials from UI inputs
  const playerAddressInput = document.getElementById('player-address');
  const jwtTokenInput = document.getElementById('jwt-token');
  const carUidInput = document.getElementById('car-uid');
  const panelStatus = document.getElementById('panel-status');

  // Auto-fill from localStorage (set by Next.js game page)
  const lsAddress = localStorage.getItem('wallet_address');
  const lsToken   = localStorage.getItem('auth_token');
  const lsCarUid  = localStorage.getItem('game_car_uid');
  const lsBackend = localStorage.getItem('backend_url');

  if (lsAddress && playerAddressInput) {
    playerAddressInput.value = lsAddress;
    window.playerAddress = lsAddress;
  }
  if (lsToken && jwtTokenInput) {
    jwtTokenInput.value = lsToken;
    window.gameAPI.setToken(lsToken);
  }
  if (lsCarUid && carUidInput) {
    carUidInput.value = lsCarUid;
    window.carUid = lsCarUid;
  }
  if (lsBackend) {
    CONFIG.API_BASE_URL = lsBackend;
    window.gameAPI.baseUrl = lsBackend;
  }

  if ((lsAddress || lsToken || lsCarUid) && panelStatus) {
    panelStatus.textContent = '✅ Auto-filled from MiniLabs';
    // Hide credentials panel when auto-filled from Next.js
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.style.display = 'none';
  }

  // Listen for manual changes
  if (playerAddressInput) {
    playerAddressInput.addEventListener('input', (e) => {
      window.playerAddress = e.target.value;
    });
  }
  if (jwtTokenInput) {
    jwtTokenInput.addEventListener('change', (e) => {
      window.gameAPI.setToken(e.target.value);
    });
  }
  if (carUidInput) {
    carUidInput.addEventListener('change', (e) => {
      window.carUid = e.target.value;
    });
  }

  console.log('🎮 OneChain Racing Game Initialized');
  console.log('📡 API Base URL:', CONFIG.API_BASE_URL);

  // Handle ?spectate=roomUid query param (from prediction page WATCH button)
  const urlParams = new URLSearchParams(window.location.search);
  const spectateRoomUid = urlParams.get('spectate');

  if (spectateRoomUid) {
    // Hide credentials panel in spectate mode
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.style.display = 'none';

    console.log('👁️ Auto-spectate requested for room:', spectateRoomUid);
    const autoSpectate = async () => {
      try {
        // Wait for WebSocket to be connected (setToken triggers initWebSocket)
        let attempts = 0;
        while ((!window.wsClient || !window.wsClient.connected) && attempts < 25) {
          await new Promise(r => setTimeout(r, 200));
          attempts++;
        }
        if (!window.wsClient || !window.wsClient.connected) {
          console.error('❌ WebSocket not connected, cannot auto-spectate');
          return;
        }
        await window.wsClient.spectateJoin(spectateRoomUid);
        // Skip MenuScene → go directly to GameScene in spectator mode
        game.scene.stop('MenuScene');
        game.scene.start('GameScene', { roomUid: spectateRoomUid, spectator: true });
      } catch (err) {
        console.error('❌ Auto-spectate failed:', err);
      }
    };
    setTimeout(autoSpectate, 500);
  }
});
