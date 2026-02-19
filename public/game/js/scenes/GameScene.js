/**
 * GameScene - Main racing game (top-down 2D view)
 */

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.roomUid = null;
    this.lastPollTime = 0;
    this.gameState = null;
    this.myPlayerId = null; // Will be set in create()

    // Sprite pools
    this.playerSprites = {};
    this.obstacleSprites = {};
    this.powerUpSprites = {};

    // Camera tracking
    this.cameraZ = 0;
  }

  init(data) {
    this.roomUid = data.roomUid;
    console.log('GameScene initialized with room:', this.roomUid);
  }

  create() {
    // Set player ID - try multiple sources
    this.myPlayerId = window.playerAddress ||
                      document.getElementById('player-address')?.value ||
                      'UNKNOWN';

    console.log('🎮 My Player ID:', this.myPlayerId);

    // Create track background
    this.createTrack();

    // Create UI
    this.createUI();

    // Setup input
    this.cursors = this.input.keyboard.createCursorKeys();

    // Setup WebSocket event handlers (replaces polling)
    this.setupWebSocket();

    console.log('🏁 Game started! Use arrow keys to change lanes.');
  }

  createTrack() {
    const trackWidthPixels = CONFIG.TRACK_WIDTH * CONFIG.SCALE;
    const trackX = (CONFIG.CANVAS_WIDTH - trackWidthPixels) / 2;

    // Track background (extends vertically for scrolling)
    this.trackBg = this.add.rectangle(
      trackX + trackWidthPixels / 2,
      CONFIG.CANVAS_HEIGHT / 2,
      trackWidthPixels,
      CONFIG.CANVAS_HEIGHT * 3, // Extra height for scrolling
      CONFIG.COLORS.TRACK
    );

    // Lane markers (white lines)
    for (let i = 1; i < CONFIG.LANE_COUNT; i++) {
      const laneX = trackX + (i * CONFIG.LANE_WIDTH * CONFIG.SCALE);

      // Create dashed lane line
      const line = this.add.rectangle(
        laneX,
        CONFIG.CANVAS_HEIGHT / 2,
        2,
        CONFIG.CANVAS_HEIGHT * 3,
        CONFIG.COLORS.LANE_LINE
      );
    }

    console.log('Track created with', CONFIG.LANE_COUNT, 'lanes');
  }

  createUI() {
    // UI background
    const uiBg = this.add.rectangle(CONFIG.CANVAS_WIDTH / 2, 30, CONFIG.CANVAS_WIDTH - 40, 50, 0x000000, 0.7);

    // Distance text
    this.distanceText = this.add.text(20, 15, 'Distance: 0m', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });

    // Rank text
    this.rankText = this.add.text(200, 15, 'Rank: -', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });

    // Speed text
    this.speedText = this.add.text(350, 15, 'Speed: 0', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });

    // Status text
    this.statusText = this.add.text(550, 15, 'Status: Racing', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#00b894',
    });

    // Keep UI fixed (not affected by camera)
    this.distanceText.setScrollFactor(0);
    this.rankText.setScrollFactor(0);
    this.speedText.setScrollFactor(0);
    this.statusText.setScrollFactor(0);
    uiBg.setScrollFactor(0);
  }

  update(time, delta) {
    // No more polling - WebSocket handles updates at 60 FPS
    // Just handle input
    this.handleInput();
  }

  setupWebSocket() {
    if (!window.wsClient) {
      console.error('❌ WebSocket not initialized');
      this.statusText.setText('Error: WebSocket not connected').setColor('#d63031');
      return;
    }

    // Listen for game state updates (60 FPS from server)
    window.wsClient.on('GAME_STATE', (state) => {
      this.gameState = state;

      // Check if game ended
      if (state.status === 'FINISHED') {
        console.log('🏁 Game finished! Switching to ResultScene...');
        this.scene.start('ResultScene', { roomUid: this.roomUid });
        return;
      }

      // Update visuals from state
      this.renderGameState();
    });

    // Listen for game end event
    window.wsClient.on('GAME_END', (result) => {
      console.log('🏆 Game ended:', result);
      setTimeout(() => {
        this.scene.start('ResultScene', {
          roomUid: this.roomUid,
          result
        });
      }, 100);
    });

    // Listen for errors
    window.wsClient.on('ERROR', (error) => {
      console.error('❌ Game error:', error);
      this.statusText.setText(`Error: ${error.message}`).setColor('#d63031');
    });

    console.log('✅ WebSocket event handlers setup for GameScene');
  }

  renderGameState() {
    if (!this.gameState) return;

    // Debug: Log game state every 60 frames (~1 second)
    if (!this.frameCount) this.frameCount = 0;
    this.frameCount++;
    if (this.frameCount % 60 === 0) {
      console.log('🎮 Game state:', {
        myPlayerId: this.myPlayerId,
        players: this.gameState.players.map(p => ({ id: p.playerId, pos: p.position, lane: p.lane })),
        cameraZ: this.cameraZ
      });
    }

    // Render players
    this.renderPlayers(this.gameState.players);

    // Render obstacles
    this.renderObstacles(this.gameState.obstacles);

    // Render power-ups
    this.renderPowerUps(this.gameState.powerUps);

    // Update UI
    this.updateUI();

    // Update camera to follow player
    this.updateCamera();
  }

  renderPlayers(players) {
    if (!players) return;

    // Track which sprites are still active
    const activeSpriteIds = new Set();

    players.forEach((player, index) => {
      const playerId = player.playerId;
      activeSpriteIds.add(playerId);

      let sprite = this.playerSprites[playerId];

      // Create sprite if it doesn't exist
      if (!sprite) {
        sprite = this.add.rectangle(
          0, 0,
          CONFIG.SIZES.PLAYER_WIDTH,
          CONFIG.SIZES.PLAYER_HEIGHT,
          CONFIG.getPlayerColor(index)
        );
        this.playerSprites[playerId] = sprite;
      }

      // Update position
      sprite.x = CONFIG.gameToScreenX(player.position.x);
      sprite.y = CONFIG.gameToScreenY(player.position.z, this.cameraZ);

      // Highlight current player
      if (playerId === this.myPlayerId) {
        sprite.setStrokeStyle(3, 0xffffff);
      }

      // Gray out finished players
      if (player.isFinished) {
        sprite.setAlpha(0.3);
      } else {
        sprite.setAlpha(1.0);
      }
    });

    // Remove sprites for players that left
    for (const id in this.playerSprites) {
      if (!activeSpriteIds.has(id)) {
        this.playerSprites[id].destroy();
        delete this.playerSprites[id];
      }
    }
  }

  renderObstacles(obstacles) {
    if (!obstacles) return;

    const activeIds = new Set();

    obstacles.forEach((obstacle) => {
      activeIds.add(obstacle.id);

      let sprite = this.obstacleSprites[obstacle.id];

      if (!sprite) {
        const width = obstacle.size.x * CONFIG.SCALE;
        const height = obstacle.size.z * CONFIG.SCALE;

        sprite = this.add.rectangle(
          0, 0,
          width,
          height,
          CONFIG.getObstacleColor(obstacle.type)
        );
        this.obstacleSprites[obstacle.id] = sprite;
      }

      sprite.x = CONFIG.gameToScreenX(obstacle.position.x);
      sprite.y = CONFIG.gameToScreenY(obstacle.position.z, this.cameraZ);

      // Only show if on screen
      sprite.setVisible(sprite.y > -50 && sprite.y < CONFIG.CANVAS_HEIGHT + 50);
    });

    // Remove old obstacles
    for (const id in this.obstacleSprites) {
      if (!activeIds.has(id)) {
        this.obstacleSprites[id].destroy();
        delete this.obstacleSprites[id];
      }
    }
  }

  renderPowerUps(powerUps) {
    if (!powerUps) return;

    const activeIds = new Set();

    powerUps.forEach((powerUp) => {
      if (powerUp.collected) return; // Skip collected power-ups

      activeIds.add(powerUp.id);

      let sprite = this.powerUpSprites[powerUp.id];

      if (!sprite) {
        sprite = this.add.circle(
          0, 0,
          CONFIG.SIZES.POWERUP_RADIUS,
          CONFIG.getPowerUpColor(powerUp.type)
        );
        this.powerUpSprites[powerUp.id] = sprite;
      }

      sprite.x = CONFIG.gameToScreenX(powerUp.position.x);
      sprite.y = CONFIG.gameToScreenY(powerUp.position.z, this.cameraZ);

      // Pulse animation
      const scale = 1 + Math.sin(Date.now() / 200) * 0.2;
      sprite.setScale(scale);

      sprite.setVisible(sprite.y > -50 && sprite.y < CONFIG.CANVAS_HEIGHT + 50);
    });

    // Remove old power-ups
    for (const id in this.powerUpSprites) {
      if (!activeIds.has(id)) {
        this.powerUpSprites[id].destroy();
        delete this.powerUpSprites[id];
      }
    }
  }

  updateUI() {
    if (!this.gameState) return;

    // Find my player
    const myPlayer = this.gameState.players.find(p => p.playerId === this.myPlayerId);

    if (myPlayer) {
      this.distanceText.setText(`Distance: ${Math.floor(myPlayer.position.z)}m`);
      this.rankText.setText(`Rank: ${myPlayer.rank || '?'}${this.getRankSuffix(myPlayer.rank)}`);
      this.speedText.setText(`Speed: ${Math.floor(myPlayer.speed)}`);
    }

    this.statusText.setText(`Status: ${this.gameState.status}`);
  }

  getRankSuffix(rank) {
    if (!rank) return '';
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  }

  updateCamera() {
    if (!this.gameState) return;

    // Find my player
    const myPlayer = this.gameState.players.find(p => p.playerId === this.myPlayerId);

    if (myPlayer) {
      // Update camera Z to follow player
      this.cameraZ = myPlayer.position.z;
    } else {
      // Player not found - log error once
      if (!this.playerNotFoundLogged) {
        console.error('❌ Player not found in game state!', {
          myPlayerId: this.myPlayerId,
          availablePlayers: this.gameState.players.map(p => p.playerId)
        });
        this.playerNotFoundLogged = true;
      }
    }
  }

  handleInput() {
    // Lane switching with arrow keys
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.sendInput(CONFIG.ACTIONS.TURN_LEFT);
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.sendInput(CONFIG.ACTIONS.TURN_RIGHT);
    }
  }

  sendInput(action) {
    // Use WebSocket instead of HTTP for instant input
    if (window.wsClient) {
      window.wsClient.sendInput(this.roomUid, action);
      console.log('Input sent:', action);
    } else {
      console.error('❌ WebSocket not connected');
    }
  }

  /**
   * Cleanup when leaving this scene
   */
  shutdown() {
    console.log('🧹 Cleaning up GameScene...');

    // Remove all WebSocket event listeners to prevent stacking
    if (window.wsClient) {
      window.wsClient.off('GAME_STATE');
      window.wsClient.off('GAME_END');
      window.wsClient.off('ERROR');
    }
  }
}
