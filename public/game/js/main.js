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
  gameConfig.scene = [MenuScene, LobbyScene, GameScene, ResultScene];

  // Create Phaser game instance
  const game = new Phaser.Game(gameConfig);

  // Make API and game globally accessible
  window.game = game;

  // Get credentials from UI inputs
  const playerAddressInput = document.getElementById('player-address');
  const jwtTokenInput = document.getElementById('jwt-token');
  const carUidInput = document.getElementById('car-uid');

  // Auto-fill credentials from Next.js frontend (shared localStorage - same origin)
  if (window.__AUTH_TOKEN__) {
    window.gameAPI.setToken(window.__AUTH_TOKEN__);
    console.log('✅ JWT token auto-loaded from frontend');
  }
  if (window.__WALLET_ADDRESS__) {
    window.playerAddress = window.__WALLET_ADDRESS__;
    if (playerAddressInput) playerAddressInput.value = window.__WALLET_ADDRESS__;
    console.log('✅ Wallet address auto-loaded:', window.__WALLET_ADDRESS__);
  }
  if (window.__CAR_UID__) {
    window.carUid = window.__CAR_UID__;
    if (carUidInput) carUidInput.value = window.__CAR_UID__;
    console.log('✅ Car UID auto-loaded:', window.__CAR_UID__);
  }

  // Store credentials when they change
  if (playerAddressInput) {
    // Use 'input' event for real-time updates
    playerAddressInput.addEventListener('input', (e) => {
      window.playerAddress = e.target.value;
      console.log('Player address set:', window.playerAddress);
    });
    // Also set initial value if present
    if (playerAddressInput.value) {
      window.playerAddress = playerAddressInput.value;
      console.log('Player address initialized:', window.playerAddress);
    }
  }

  if (jwtTokenInput) {
    jwtTokenInput.addEventListener('change', (e) => {
      const token = e.target.value;
      window.gameAPI.setToken(token);
    });
  }

  if (carUidInput) {
    carUidInput.addEventListener('change', (e) => {
      window.carUid = e.target.value;
      console.log('Car UID set:', window.carUid);
    });
  }

  console.log('🎮 OneChain Racing Game Initialized');
  console.log('📡 API Base URL:', CONFIG.API_BASE_URL);
});
