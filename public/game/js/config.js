/**
 * Game Configuration & Constants
 */

const CONFIG = {
  // Backend API
  API_BASE_URL: 'http://localhost:3000/api',

  // Canvas dimensions
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,

  // Track layout (matches backend)
  TRACK_WIDTH: 15,       // Total track width in game units
  LANE_COUNT: 3,         // Number of lanes
  LANE_WIDTH: 5,         // Width of each lane

  // Visual scale (pixels per game unit)
  SCALE: 20,  // 1 game unit = 20 pixels

  // Camera settings
  CAMERA_OFFSET_Y: 200,  // How far ahead of player to show

  // Polling intervals (milliseconds)
  LOBBY_POLL_INTERVAL: 1000,   // 1 second
  GAME_POLL_INTERVAL: 100,     // 100ms (10 FPS polling for 60 FPS server)

  // Color palette (minimalist design)
  COLORS: {
    // Background & Track
    BACKGROUND: 0x2d3436,
    TRACK: 0x636e72,
    LANE_LINE: 0xffffff,

    // Players (4 distinct colors)
    PLAYER_1: 0x00b894,  // Green
    PLAYER_2: 0x0984e3,  // Blue
    PLAYER_3: 0xfdcb6e,  // Yellow
    PLAYER_4: 0xe17055,  // Orange

    // Obstacles
    OBSTACLE_BARRIER: 0xd63031,    // Red (instant elimination)
    OBSTACLE_HAZARD: 0xe17055,     // Orange (50% slow)
    OBSTACLE_SLOW: 0xfdcb6e,       // Yellow (30% slow)

    // Power-ups
    POWERUP_BOOST: 0x00b894,       // Green (+50% speed)
    POWERUP_SHIELD: 0x74b9ff,      // Light blue (immunity)
    POWERUP_SLOW: 0xa29bfe,        // Purple (slow others)

    // UI
    TEXT_PRIMARY: 0xffffff,
    TEXT_SECONDARY: 0xb2bec3,
    TEXT_SUCCESS: 0x00b894,
    TEXT_DANGER: 0xd63031,
  },

  // Object sizes (pixels)
  SIZES: {
    PLAYER_WIDTH: 16,
    PLAYER_HEIGHT: 32,
    POWERUP_RADIUS: 12,
  },

  // Fonts
  FONTS: {
    TITLE: { fontSize: '48px', fontFamily: 'Arial', color: '#ffffff' },
    HEADING: { fontSize: '24px', fontFamily: 'Arial', color: '#ffffff' },
    BODY: { fontSize: '16px', fontFamily: 'Arial', color: '#b2bec3' },
    SMALL: { fontSize: '14px', fontFamily: 'Arial', color: '#b2bec3' },
  },

  // Input actions (matches backend GameAction enum)
  ACTIONS: {
    ACCELERATE: 'ACCELERATE',
    BRAKE: 'BRAKE',
    TURN_LEFT: 'TURN_LEFT',
    TURN_RIGHT: 'TURN_RIGHT',
    DRIFT: 'DRIFT',
    BOOST: 'BOOST',
  },

  // Helper functions
  getPlayerColor(index) {
    const colors = [
      this.COLORS.PLAYER_1,
      this.COLORS.PLAYER_2,
      this.COLORS.PLAYER_3,
      this.COLORS.PLAYER_4,
    ];
    return colors[index % colors.length];
  },

  getObstacleColor(type) {
    switch (type) {
      case 'BARRIER':
        return this.COLORS.OBSTACLE_BARRIER;
      case 'HAZARD':
        return this.COLORS.OBSTACLE_HAZARD;
      case 'SLOW_ZONE':
        return this.COLORS.OBSTACLE_SLOW;
      default:
        return this.COLORS.OBSTACLE_HAZARD;
    }
  },

  getPowerUpColor(type) {
    switch (type) {
      case 'BOOST':
        return this.COLORS.POWERUP_BOOST;
      case 'SHIELD':
        return this.COLORS.POWERUP_SHIELD;
      case 'SLOW_OTHERS':
        return this.COLORS.POWERUP_SLOW;
      default:
        return this.COLORS.POWERUP_BOOST;
    }
  },

  // Convert game coordinates to screen coordinates
  gameToScreenX(gameX) {
    return (gameX + this.TRACK_WIDTH / 2) * this.SCALE + (this.CANVAS_WIDTH - this.TRACK_WIDTH * this.SCALE) / 2;
  },

  gameToScreenY(gameZ, cameraZ = 0) {
    return this.CANVAS_HEIGHT - (gameZ - cameraZ) * this.SCALE;
  },
};

// Make CONFIG globally accessible
window.CONFIG = CONFIG;
