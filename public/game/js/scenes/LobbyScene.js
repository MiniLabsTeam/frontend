/**
 * LobbyScene - Waiting room for players to ready up
 */

class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
    this.roomUid = null;
    this.isHost = false;
    this.lastPollTime = 0;
    this.isReady = false;
  }

  init(data) {
    this.roomUid = data.roomUid;
    this.isHost = data.isHost || false;
    console.log('LobbyScene initialized with room:', this.roomUid, 'host:', this.isHost);
  }

  create() {
    const centerX = CONFIG.CANVAS_WIDTH / 2;

    // Title
    this.add.text(centerX, 50, 'LOBBY', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Room UID
    this.roomText = this.add.text(centerX, 100, `Room: ${this.roomUid ? this.roomUid.substring(0, 15) + '...' : 'Loading...'}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#b2bec3',
    }).setOrigin(0.5);

    // Game Mode & Players
    this.modeText = this.add.text(centerX, 130, 'Endless Race • ?/? Players', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Status
    this.statusText = this.add.text(centerX, 170, 'Status: WAITING', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#fdcb6e',
    }).setOrigin(0.5);

    // Players list header
    this.add.text(centerX, 220, 'Players:', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Players container
    this.playersContainer = this.add.container(0, 260);

    // Ready Button
    const readyButton = this.add.rectangle(centerX, 480, 200, 50, 0x00b894);
    readyButton.setInteractive({ useHandCursor: true });

    this.readyButtonText = this.add.text(centerX, 480, 'MARK READY', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    readyButton.on('pointerover', () => {
      if (!this.isReady) {
        readyButton.setFillStyle(0x00d2a5);
      }
    });

    readyButton.on('pointerout', () => {
      if (!this.isReady) {
        readyButton.setFillStyle(0x00b894);
      } else {
        readyButton.setFillStyle(0x636e72);
      }
    });

    readyButton.on('pointerdown', () => {
      if (!this.isReady) {
        this.markReady();
      }
    });

    this.readyButton = readyButton;

    // Instructions
    this.instructionText = this.add.text(centerX, 540, 'Game starts when all players are ready', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#636e72',
    }).setOrigin(0.5);

    // Setup WebSocket event handlers
    this.setupWebSocket();
  }

  setupWebSocket() {
    if (!window.wsClient) {
      console.error('❌ WebSocket not initialized');
      this.statusText.setText('Error: WebSocket not connected').setColor('#d63031');
      return;
    }

    // Listen for lobby updates
    window.wsClient.on('LOBBY_UPDATE', (room) => {
      console.log('📡 Lobby updated:', room);

      // Update room info
      this.modeText.setText(`${room.gameMode} • ${room.currentPlayers}/${room.maxPlayers} Players`);
      this.statusText.setText(`Status: ${room.status}`);

      // Update status color
      if (room.status === 'WAITING') {
        this.statusText.setColor('#fdcb6e');
      } else if (room.status === 'COUNTDOWN') {
        this.statusText.setColor('#00b894');
      } else if (room.status === 'RACING') {
        this.statusText.setColor('#0984e3');
      }

      // Update players list
      this.updatePlayersList(room.players || []);
    });

    // Listen for player join
    window.wsClient.on('PLAYER_JOINED', (data) => {
      console.log('👤 Player joined:', data.playerAddress);
      // Room update will be sent via LOBBY_UPDATE
    });

    // Listen for player leave
    window.wsClient.on('PLAYER_LEFT', (data) => {
      console.log('👋 Player left:', data.playerId);
      // Room update will be sent via LOBBY_UPDATE
    });

    // Listen for game start
    window.wsClient.on('GAME_START', (data) => {
      console.log('🏁 Game starting!', data);
      setTimeout(() => {
        this.scene.start('GameScene', { roomUid: this.roomUid });
      }, 100);
    });

    // Listen for errors
    window.wsClient.on('ERROR', (error) => {
      console.error('❌ Lobby error:', error);
      this.statusText.setText(`Error: ${error.message}`).setColor('#d63031');
    });

    // Request initial room state
    window.wsClient.getRoomState(this.roomUid)
      .then((room) => {
        console.log('📥 Initial room state:', room);

        this.modeText.setText(`${room.gameMode} • ${room.currentPlayers}/${room.maxPlayers} Players`);
        this.statusText.setText(`Status: ${room.status}`);
        this.updatePlayersList(room.players || []);
      })
      .catch((error) => {
        console.error('Failed to get initial room state:', error);
        this.statusText.setText(`Error: ${error.message}`).setColor('#d63031');
      });
  }

  update(time, delta) {
    // No more polling - WebSocket handles updates
  }

  updatePlayersList(players) {
    // Clear existing player list
    this.playersContainer.removeAll(true);

    const centerX = CONFIG.CANVAS_WIDTH / 2;
    let yOffset = 0;

    players.forEach((player, index) => {
      const playerAddress = player.playerAddress || player.user?.address || '0x???';
      const isReady = player.isReady;

      // Player background
      const bg = this.add.rectangle(0, yOffset, 400, 35, 0x2d3436);
      bg.setStrokeStyle(1, 0x636e72);

      // Player address (shortened)
      const addressText = this.add.text(-180, yOffset, `${playerAddress.substring(0, 10)}...`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0, 0.5);

      // Ready status
      const readyIcon = isReady ? '✓ READY' : '⏳ WAITING';
      const readyColor = isReady ? '#00b894' : '#fdcb6e';
      const readyText = this.add.text(180, yOffset, readyIcon, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: readyColor,
      }).setOrigin(1, 0.5);

      this.playersContainer.add([bg, addressText, readyText]);

      yOffset += 40;
    });

    // Center the container
    this.playersContainer.x = centerX;
  }

  async markReady() {
    try {
      this.readyButtonText.setText('MARKING READY...');

      // Use WebSocket instead of HTTP
      await window.wsClient.markReady(this.roomUid);

      this.isReady = true;
      this.readyButton.setFillStyle(0x636e72);
      this.readyButtonText.setText('✓ READY');
      this.instructionText.setText('Waiting for other players...');
      console.log('✅ Marked as ready');

      // Lobby update will be sent via WebSocket automatically
    } catch (error) {
      console.error('Failed to mark ready:', error);
      this.readyButtonText.setText('MARK READY');
      this.instructionText.setText(`Error: ${error.message}`).setColor('#d63031');
    }
  }

  /**
   * Cleanup when leaving this scene
   */
  shutdown() {
    console.log('🧹 Cleaning up LobbyScene...');

    // Remove all WebSocket event listeners to prevent stacking
    if (window.wsClient) {
      window.wsClient.off('LOBBY_UPDATE');
      window.wsClient.off('PLAYER_JOINED');
      window.wsClient.off('PLAYER_LEFT');
      window.wsClient.off('GAME_START');
      window.wsClient.off('ERROR');
    }
  }
}
