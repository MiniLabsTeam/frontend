/**
 * MenuScene - Racing-themed main menu with live rooms list
 */

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.roomCards = [];
    this.roomsContainer = null;
  }

  create() {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const cx = W / 2;

    // ── Background ─────────────────────────────────────────────────────────
    this.cameras.main.setBackgroundColor(0x080a10);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0xffffff, 0.04);
    for (let x = 0; x <= W; x += 40) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 40) grid.lineBetween(0, y, W, y);

    // Orange accent lines
    const accent = this.add.graphics();
    accent.lineStyle(2, 0xff7800, 0.6);
    accent.lineBetween(0, 110, W, 110);
    accent.lineBetween(0, 112, W, 112);

    // Corner decorations
    const corners = this.add.graphics();
    corners.lineStyle(2, 0xff7800, 0.8);
    corners.strokeRect(20, 20, 40, 40);
    corners.fillStyle(0xff7800, 1);
    corners.fillRect(20, 20, 8, 8);
    corners.strokeRect(W - 60, 20, 40, 40);
    corners.fillRect(W - 28, 20, 8, 8);

    // ── Title ──────────────────────────────────────────────────────────────
    this.add.text(cx, 55, 'ONECHAIN RACING', {
      fontSize: '46px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ff7800',
      strokeThickness: 1,
    }).setOrigin(0.5);

    const underline = this.add.graphics();
    underline.fillStyle(0xff7800, 1);
    underline.fillRect(cx - 160, 85, 320, 3);

    this.add.text(cx, 100, '🏁  ENDLESS RACE MODE  🏁', {
      fontSize: '14px',
      fontFamily: 'Rajdhani, Arial',
      fontStyle: 'bold',
      color: '#ff7800',
      letterSpacing: 4,
    }).setOrigin(0.5);

    // ── Top buttons row ─────────────────────────────────────────────────────
    const btnY = 155;
    const btnW = 180, btnH = 42;
    const gap = 10;

    // CREATE ROOM
    const createBg = this.add.graphics();
    this._drawButton(createBg, cx - btnW / 2 - gap / 2, btnY, btnW, btnH, 0xff7800, 1);
    this.add.text(cx - btnW / 2 - gap / 2, btnY, '⚡ CREATE ROOM', {
      fontSize: '13px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#000000',
    }).setOrigin(0.5);
    this.add.rectangle(cx - btnW / 2 - gap / 2, btnY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.createRoom());

    // VS AI
    const vsAiBg = this.add.graphics();
    this._drawButton(vsAiBg, cx + btnW / 2 + gap / 2, btnY, btnW, btnH, 0x0d1020, 1, 0xff7800);
    this.add.text(cx + btnW / 2 + gap / 2, btnY, '🤖 VS AI', {
      fontSize: '13px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#ff7800',
    }).setOrigin(0.5);
    this.add.rectangle(cx + btnW / 2 + gap / 2, btnY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.createRoomVsAI());

    // ── Live Rooms Section ──────────────────────────────────────────────────
    const listY = 195;
    const divG = this.add.graphics();
    divG.fillStyle(0xff7800, 0.15);
    divG.fillRect(20, listY, W - 40, 1);

    this.add.text(30, listY + 8, 'LIVE ROOMS', {
      fontSize: '12px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ff7800',
    });

    this.refreshText = this.add.text(W - 30, listY + 10, '↻', {
      fontSize: '14px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ff7800',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.fetchRooms());

    // Loading text
    this.loadingText = this.add.text(cx, 320, 'Loading rooms...', {
      fontSize: '12px', fontFamily: 'Rajdhani, Arial', color: '#666666',
    }).setOrigin(0.5);

    // Scrollable rooms container
    this.roomsContainer = this.add.container(0, 0);

    // Room list area — clip mask
    const listAreaY = listY + 28;
    const listAreaH = H - listAreaY - 50;
    this.listAreaY = listAreaY;
    this.listAreaH = listAreaH;

    // Status text
    this.statusText = this.add.text(cx, H - 25, '', {
      fontSize: '12px', fontFamily: 'Rajdhani, Arial', fontStyle: 'bold', color: '#ff7800',
    }).setOrigin(0.5);

    // Fetch rooms
    this.fetchRooms();

    // Auto-refresh every 5s
    this.refreshTimer = this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => this.fetchRooms(),
    });
  }

  async fetchRooms() {
    try {
      const response = await window.gameAPI.getLiveRooms();
      const allRooms = response.data || [];
      // Filter out FINISHED/CANCELLED rooms (safety net)
      const rooms = allRooms.filter(r => ['WAITING', 'BETTING', 'STARTED', 'RACING'].includes(r.status));
      this.loadingText.setVisible(false);
      this.renderRooms(rooms);
    } catch (err) {
      this.loadingText.setText('Failed to load rooms').setColor('#ff4444').setVisible(true);
    }
  }

  renderRooms(rooms) {
    // Clear old cards
    this.roomsContainer.removeAll(true);

    if (rooms.length === 0) {
      this.loadingText.setText('No active rooms — Create one!').setColor('#666666').setVisible(true);
      return;
    }
    this.loadingText.setVisible(false);

    const W = CONFIG.CANVAS_WIDTH;
    const cardW = W - 40;
    const cardH = 70;
    const startY = this.listAreaY;

    rooms.forEach((room, idx) => {
      const y = startY + idx * (cardH + 8);
      const isWaiting = room.status === 'WAITING';
      const isBetting = room.status === 'BETTING';
      const borderColor = isWaiting ? 0x00e676 : isBetting ? 0x9b59b6 : 0xff0040;
      const statusLabel = isWaiting ? 'WAITING' : isBetting ? 'BETTING' : 'LIVE';
      const statusColor = isWaiting ? '#00e676' : isBetting ? '#9b59b6' : '#ff0040';

      // Card bg
      const bg = this.add.graphics();
      bg.fillStyle(0x0d1020, 1);
      bg.fillRoundedRect(20, y, cardW, cardH, 8);
      bg.lineStyle(1, borderColor, 0.5);
      bg.strokeRoundedRect(20, y, cardW, cardH, 8);

      // Status badge
      const badgeBg = this.add.graphics();
      const badgeW = isWaiting ? 65 : isBetting ? 65 : 45;
      badgeBg.fillStyle(borderColor, 0.15);
      badgeBg.fillRoundedRect(30, y + 8, badgeW, 18, 4);
      const badgeText = this.add.text(30 + badgeW / 2, y + 17, statusLabel, {
        fontSize: '10px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: statusColor,
      }).setOrigin(0.5);

      // Room ID (copyable — click to copy)
      const shortId = room.roomUid.length > 16 ? room.roomUid.substring(0, 16) + '…' : room.roomUid;
      const roomIdText = this.add.text(30 + badgeW + 10, y + 11, shortId, {
        fontSize: '11px', fontFamily: 'Rajdhani, Arial', fontStyle: 'bold', color: '#ffffff',
      }).setInteractive({ useHandCursor: true });

      roomIdText.on('pointerdown', () => {
        // Copy full room ID to clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(room.roomUid);
          this.statusText.setText(`📋 Copied: ${room.roomUid.substring(0, 20)}…`).setColor('#00e676');
          this.time.delayedCall(2000, () => this.statusText.setText(''));
        }
      });
      roomIdText.on('pointerover', () => roomIdText.setColor('#ff7800'));
      roomIdText.on('pointerout', () => roomIdText.setColor('#ffffff'));

      // Player info
      const players = room.players || [];
      const playerNames = players.map(p => p.user?.username || p.playerAddress?.substring(0, 8) + '…').join(', ');
      const playerInfo = `${players.length}/${room.maxPlayers} • ${playerNames || 'Empty'}`;
      this.add.text(30, y + 34, playerInfo, {
        fontSize: '10px', fontFamily: 'Rajdhani, Arial', color: '#888888',
      });

      // Game mode
      this.add.text(30, y + 50, room.gameMode, {
        fontSize: '9px', fontFamily: 'Rajdhani, Arial', color: '#555555',
      });

      // Action button
      const actionW = 80;
      const actionH = 32;
      const actionX = W - 30 - actionW / 2;
      const actionY = y + cardH / 2;

      if (isWaiting) {
        // JOIN button
        const joinBg = this.add.graphics();
        joinBg.fillStyle(0x00e676, 1);
        joinBg.fillRoundedRect(actionX - actionW / 2, actionY - actionH / 2, actionW, actionH, 6);

        this.add.text(actionX, actionY, 'JOIN', {
          fontSize: '12px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#000000',
        }).setOrigin(0.5);

        const joinHit = this.add.rectangle(actionX, actionY, actionW, actionH, 0x000000, 0)
          .setInteractive({ useHandCursor: true });

        joinHit.on('pointerover', () => {
          joinBg.clear();
          joinBg.fillStyle(0x33ff99, 1);
          joinBg.fillRoundedRect(actionX - actionW / 2, actionY - actionH / 2, actionW, actionH, 6);
        });
        joinHit.on('pointerout', () => {
          joinBg.clear();
          joinBg.fillStyle(0x00e676, 1);
          joinBg.fillRoundedRect(actionX - actionW / 2, actionY - actionH / 2, actionW, actionH, 6);
        });
        joinHit.on('pointerdown', () => this.joinRoomById(room.roomUid));

        this.roomsContainer.add([bg, badgeBg, badgeText, roomIdText, joinBg, joinHit]);
      } else {
        // WATCH button
        const watchBg = this.add.graphics();
        watchBg.fillStyle(0xff0040, 0.2);
        watchBg.fillRoundedRect(actionX - actionW / 2, actionY - actionH / 2, actionW, actionH, 6);
        watchBg.lineStyle(1, 0xff0040, 0.6);
        watchBg.strokeRoundedRect(actionX - actionW / 2, actionY - actionH / 2, actionW, actionH, 6);

        this.add.text(actionX, actionY, '👁 WATCH', {
          fontSize: '11px', fontFamily: 'Orbitron, Arial', fontStyle: 'bold', color: '#ff0040',
        }).setOrigin(0.5);

        const watchHit = this.add.rectangle(actionX, actionY, actionW, actionH, 0x000000, 0)
          .setInteractive({ useHandCursor: true });

        watchHit.on('pointerover', () => {
          watchBg.clear();
          watchBg.fillStyle(0xff0040, 0.35);
          watchBg.fillRoundedRect(actionX - actionW / 2, actionY - actionH / 2, actionW, actionH, 6);
          watchBg.lineStyle(1, 0xff0040, 0.8);
          watchBg.strokeRoundedRect(actionX - actionW / 2, actionY - actionH / 2, actionW, actionH, 6);
        });
        watchHit.on('pointerout', () => {
          watchBg.clear();
          watchBg.fillStyle(0xff0040, 0.2);
          watchBg.fillRoundedRect(actionX - actionW / 2, actionY - actionH / 2, actionW, actionH, 6);
          watchBg.lineStyle(1, 0xff0040, 0.6);
          watchBg.strokeRoundedRect(actionX - actionW / 2, actionY - actionH / 2, actionW, actionH, 6);
        });
        watchHit.on('pointerdown', () => this.watchRoom(room.roomUid));

        this.roomsContainer.add([bg, badgeBg, badgeText, roomIdText, watchBg, watchHit]);
      }
    });
  }

  // ── Helper: draw a rounded button ────────────────────────────────────────
  _drawButton(g, x, y, w, h, fillColor, fillAlpha, strokeColor = null) {
    g.fillStyle(fillColor, fillAlpha);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    if (strokeColor) {
      g.lineStyle(1.5, strokeColor, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  async createRoom() {
    try {
      this.statusText.setText('Creating room…').setColor('#ff7800');
      if (!window.gameAPI.token) {
        this.statusText.setText('❌ Please enter JWT token first').setColor('#e74c3c');
        return;
      }

      // PvP: check prediction balance >= 2 OCT
      try {
        const balRes = await window.gameAPI.getPredictionBalance();
        const balOCT = balRes?.data?.balanceOCT || 0;
        if (balOCT < 2) {
          this.statusText.setText('❌ Need 2+ OCT deposit. Visit Prediction page.').setColor('#e74c3c');
          return;
        }
      } catch (e) {
        this.statusText.setText('❌ Cannot check balance').setColor('#e74c3c');
        return;
      }

      const response = await window.gameAPI.createRoom(
        'ENDLESS_RACE', 2, '1000000',
        new Date(Date.now() + 3600000).toISOString()
      );

      if (response.success && response.data) {
        const roomUid = response.data.roomUid;
        if (!roomUid) {
          this.statusText.setText('❌ Room created but UID missing').setColor('#e74c3c');
          return;
        }

        this.statusText.setText(`✅ Room: ${roomUid.substring(0, 12)}…`).setColor('#2ecc71');

        if (!window.carUid) {
          this.statusText.setText('❌ Please enter Car UID first').setColor('#e74c3c');
          return;
        }

        await window.wsClient.joinRoom(roomUid, window.carUid);
        setTimeout(() => {
          this.scene.start('LobbyScene', { roomUid, isHost: true });
        }, 500);
      }
    } catch (error) {
      this.statusText.setText(`❌ ${error.message}`).setColor('#e74c3c');
    }
  }

  async createRoomVsAI() {
    try {
      this.statusText.setText('Setting up AI match…').setColor('#ff7800');
      if (!window.gameAPI.token) {
        this.statusText.setText('❌ Please enter JWT token first').setColor('#e74c3c');
        return;
      }
      if (!window.carUid) {
        this.statusText.setText('❌ Please enter Car UID first').setColor('#e74c3c');
        return;
      }

      const response = await window.gameAPI.createRoomWithAI(window.carUid);
      if (response.success && response.data) {
        const roomUid = response.data.roomUid;
        this.statusText.setText('✅ Joining AI match…').setColor('#2ecc71');
        await window.wsClient.joinRoom(roomUid, window.carUid);
        setTimeout(() => {
          this.scene.start('LobbyScene', { roomUid, isHost: true, vsAI: true });
        }, 500);
      }
    } catch (error) {
      this.statusText.setText(`❌ ${error.message}`).setColor('#e74c3c');
    }
  }

  async joinRoomById(roomUid) {
    try {
      if (!window.gameAPI.token) {
        this.statusText.setText('❌ Please enter JWT token first').setColor('#e74c3c');
        return;
      }
      if (!window.carUid) {
        this.statusText.setText('❌ Please enter Car UID first').setColor('#e74c3c');
        return;
      }

      // PvP: check prediction balance >= 2 OCT
      try {
        const balRes = await window.gameAPI.getPredictionBalance();
        const balOCT = balRes?.data?.balanceOCT || 0;
        if (balOCT < 2) {
          this.statusText.setText('❌ Need 2+ OCT deposit. Visit Prediction page.').setColor('#e74c3c');
          return;
        }
      } catch (e) {
        this.statusText.setText('❌ Cannot check balance').setColor('#e74c3c');
        return;
      }

      this.statusText.setText('Joining room…').setColor('#ff7800');
      await window.wsClient.joinRoom(roomUid, window.carUid);
      this.statusText.setText('✅ Joined!').setColor('#2ecc71');

      setTimeout(() => {
        this.scene.start('LobbyScene', { roomUid, isHost: false });
      }, 500);
    } catch (error) {
      this.statusText.setText(`❌ ${error.message}`).setColor('#e74c3c');
    }
  }

  async watchRoom(roomUid) {
    try {
      this.statusText.setText('Connecting…').setColor('#ff0040');
      await window.wsClient.spectateJoin(roomUid);
      this.scene.start('GameScene', { roomUid, spectator: true });
    } catch (error) {
      this.statusText.setText(`❌ ${error.message}`).setColor('#e74c3c');
    }
  }

  shutdown() {
    if (this.refreshTimer) this.refreshTimer.destroy();
  }
}
