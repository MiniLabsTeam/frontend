/**
 * LobbyScene - Waiting room (redesigned)
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
    this.vsAI = data.vsAI || false;
  }

  create() {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor(0x080a10);

    // ── Background grid ────────────────────────────────────────────────────
    const grid = this.add.graphics();
    grid.lineStyle(1, 0xffffff, 0.03);
    for (let x = 0; x <= W; x += 40) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 40) grid.lineBetween(0, y, W, y);

    // Orange accent lines
    const accent = this.add.graphics();
    accent.lineStyle(2, 0xff7800, 0.5);
    accent.lineBetween(0, 88, W, 88);
    accent.lineBetween(0, 90, W, 90);

    // Corner decorations
    const corners = this.add.graphics();
    corners.lineStyle(2, 0xff7800, 0.7);
    corners.strokeRect(18, 18, 36, 36);
    corners.strokeRect(W - 54, 18, 36, 36);
    corners.strokeRect(18, H - 54, 36, 36);
    corners.strokeRect(W - 54, H - 54, 36, 36);
    corners.fillStyle(0xff7800, 1);
    corners.fillRect(18, 18, 7, 7);
    corners.fillRect(W - 25, 18, 7, 7);
    corners.fillRect(18, H - 25, 7, 7);
    corners.fillRect(W - 25, H - 25, 7, 7);

    // ── Title ──────────────────────────────────────────────────────────────
    this.add.text(cx, 45, 'RACE LOBBY', {
      fontSize: '38px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ff7800',
      strokeThickness: 1,
    }).setOrigin(0.5);

    // Underline
    const ul = this.add.graphics();
    ul.fillStyle(0xff7800, 1);
    ul.fillRect(cx - 100, 74, 200, 2);

    // ── Room UID ───────────────────────────────────────────────────────────
    const shortRoom = this.roomUid
      ? this.roomUid.substring(0, 18) + '…'
      : 'Loading…';

    const roomPillBg = this.add.graphics();
    roomPillBg.fillStyle(0x0d1020, 1);
    roomPillBg.fillRoundedRect(cx - 140, 98, 280, 28, 6);
    roomPillBg.lineStyle(1, 0xff7800, 0.25);
    roomPillBg.strokeRoundedRect(cx - 140, 98, 280, 28, 6);

    this.roomText = this.add.text(cx, 112, `ROOM  ${shortRoom}`, {
      fontSize: '11px',
      fontFamily: 'Orbitron, Arial',
      color: '#ff7800',
      letterSpacing: 1,
    }).setOrigin(0.5);

    // ── Mode & Players count ───────────────────────────────────────────────
    this.modeText = this.add.text(cx, 148, 'ENDLESS_RACE  •  ?/? Players', {
      fontSize: '14px',
      fontFamily: 'Rajdhani, Arial',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0.7);

    // ── Status badge ───────────────────────────────────────────────────────
    this.statusBg = this.add.graphics();
    this._drawStatusBadge(0xfdcb6e, 'WAITING');

    this.statusText = this.add.text(cx, 182, 'WAITING', {
      fontSize: '13px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#fdcb6e',
    }).setOrigin(0.5);

    // ── Players section ────────────────────────────────────────────────────
    this.add.text(cx, 228, 'PLAYERS', {
      fontSize: '11px',
      fontFamily: 'Orbitron, Arial',
      color: '#ffffff',
      letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0.4);

    const divG = this.add.graphics();
    divG.fillStyle(0xff7800, 0.2);
    divG.fillRect(cx - 180, 240, 360, 1);

    // Players container
    this.playersContainer = this.add.container(0, 252);

    // ── Betting Countdown (PvP only, hidden initially) ─────────────────────
    this.bettingContainer = this.add.container(cx, 380).setVisible(false);

    const bettingBg = this.add.graphics();
    bettingBg.fillStyle(0x1a0a2e, 0.9);
    bettingBg.fillRoundedRect(-160, -40, 320, 80, 10);
    bettingBg.lineStyle(2, 0x9b59b6, 0.7);
    bettingBg.strokeRoundedRect(-160, -40, 320, 80, 10);

    this.bettingTimerText = this.add.text(0, -18, 'BETTING PERIOD', {
      fontSize: '12px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#9b59b6',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.bettingCountdownText = this.add.text(0, 10, '60s', {
      fontSize: '28px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#e056fd',
    }).setOrigin(0.5);

    this.bettingPoolText = this.add.text(0, 35, 'Pool: 4.00 OCT', {
      fontSize: '11px',
      fontFamily: 'Rajdhani, Arial',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.6);

    this.bettingContainer.add([bettingBg, this.bettingTimerText, this.bettingCountdownText, this.bettingPoolText]);

    // ── Ready Button (AI only) / Cancel Button (PvP) ─────────────────────
    const btnY = 460;
    const btnW = 260, btnH = 52;

    // Ready button (shown for AI, hidden for PvP)
    this.readyBtnBg = this.add.graphics();
    this._drawButton(this.readyBtnBg, cx, btnY, btnW, btnH, 0xff7800);

    this.readyButtonText = this.add.text(cx, btnY, '⚡  MARK READY', {
      fontSize: '16px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#000000',
    }).setOrigin(0.5);

    const readyHit = this.add.rectangle(cx, btnY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    readyHit.on('pointerover', () => {
      if (!this.isReady) {
        this.readyBtnBg.clear();
        this._drawButton(this.readyBtnBg, cx, btnY, btnW, btnH, 0xffa040);
      }
    });
    readyHit.on('pointerout', () => {
      if (!this.isReady) {
        this.readyBtnBg.clear();
        this._drawButton(this.readyBtnBg, cx, btnY, btnW, btnH, 0xff7800);
      }
    });
    readyHit.on('pointerdown', () => {
      if (!this.isReady) this.markReady();
    });

    this.readyButton = readyHit;
    this.readyButtonBgRef = this.readyBtnBg;

    // Cancel button (PvP only, shown for host)
    const cancelBtnY = 530;
    this.cancelBtnBg = this.add.graphics();
    this._drawButton(this.cancelBtnBg, cx, cancelBtnY, 180, 40, 0x2d1a1a);
    this.cancelBtnBg.lineStyle(1.5, 0xd63031, 0.7);
    this.cancelBtnBg.strokeRoundedRect(cx - 90, cancelBtnY - 20, 180, 40, 8);

    this.cancelButtonText = this.add.text(cx, cancelBtnY, 'CANCEL ROOM', {
      fontSize: '13px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#d63031',
    }).setOrigin(0.5);

    const cancelHit = this.add.rectangle(cx, cancelBtnY, 180, 40, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    cancelHit.on('pointerdown', () => this.cancelRoom());

    this.cancelButton = cancelHit;
    this.cancelBtnBg.setVisible(false);
    this.cancelButtonText.setVisible(false);
    this.cancelButton.setVisible(false);
    this.cancelButton.disableInteractive();

    // For PvP: hide READY button, show CANCEL for host
    if (!this.vsAI) {
      this.readyBtnBg.setVisible(false);
      this.readyButtonText.setVisible(false);
      this.readyButton.disableInteractive();
      this.readyButton.setVisible(false);

      if (this.isHost) {
        this.cancelBtnBg.setVisible(true);
        this.cancelButtonText.setVisible(true);
        this.cancelButton.setVisible(true);
        this.cancelButton.setInteractive({ useHandCursor: true });
      }
    }

    // ── Instructions ───────────────────────────────────────────────────────
    const instructionMsg = this.vsAI
      ? 'Game starts when all players are ready'
      : 'Waiting for opponent… Auto-bet: 2 OCT on yourself';
    this.instructionText = this.add.text(cx, this.vsAI ? 522 : 480, instructionMsg, {
      fontSize: '12px',
      fontFamily: 'Rajdhani, Arial',
      color: '#ffffff',
      letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0.3);

    // ── Footer ─────────────────────────────────────────────────────────────
    this.add.text(cx, H - 28, 'POWERED BY ONECHAIN  •  NFT RACING', {
      fontSize: '10px',
      fontFamily: 'Orbitron, Arial',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.12);

    // ── Pulsing dot animation ──────────────────────────────────────────────
    this.pulseDot = this.add.circle(cx - 52, 182, 4, 0xfdcb6e);
    this.tweens.add({
      targets: this.pulseDot,
      alpha: 0.1,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // Setup WebSocket (unchanged logic)
    this.setupWebSocket();

    // VS AI: auto-mark ready immediately — no waiting needed
    if (this.vsAI) {
      this.instructionText.setText('🤖  VS AI — starting match…').setAlpha(0.7);
      this.readyButton.disableInteractive();
      this.time.delayedCall(800, () => this.markReady());
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  _drawButton(g, x, y, w, h, fillColor, outline = false) {
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    if (outline) {
      g.lineStyle(1.5, fillColor, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    }
  }

  _drawStatusBadge(color, label) {
    const cx = CONFIG.CANVAS_WIDTH / 2;
    this.statusBg.clear();
    this.statusBg.fillStyle(color, 0.12);
    this.statusBg.fillRoundedRect(cx - 70, 170, 140, 24, 5);
    this.statusBg.lineStyle(1, color, 0.5);
    this.statusBg.strokeRoundedRect(cx - 70, 170, 140, 24, 5);
  }

  // ── WebSocket (all logic unchanged) ───────────────────────────────────────
  setupWebSocket() {
    if (!window.wsClient) {
      this.statusText.setText('ERROR: NO WEBSOCKET').setColor('#d63031');
      return;
    }

    window.wsClient.on('LOBBY_UPDATE', (room) => {
      this.modeText.setText(`${room.gameMode}  •  ${room.currentPlayers}/${room.maxPlayers} Players`);
      this.statusText.setText(room.status);

      let color = '#fdcb6e';
      let hexColor = 0xfdcb6e;
      if (room.status === 'COUNTDOWN') { color = '#00b894'; hexColor = 0x00b894; }
      else if (room.status === 'RACING') { color = '#0984e3'; hexColor = 0x0984e3; }

      this.statusText.setColor(color);
      this.pulseDot.setFillStyle(hexColor);
      this._drawStatusBadge(hexColor, room.status);

      this.updatePlayersList(room.players || []);
    });

    window.wsClient.on('PLAYER_JOINED', (data) => {
      console.log('👤 Player joined:', data.playerAddress);
    });

    window.wsClient.on('PLAYER_LEFT', (data) => {
      console.log('👋 Player left:', data.playerId);
    });

    window.wsClient.on('GAME_START', (data) => {
      console.log('🏁 Game starting!', data);
      setTimeout(() => {
        this.scene.start('GameScene', { roomUid: this.roomUid });
      }, 100);
    });

    // PvP: Betting period started
    window.wsClient.on('BETTING_START', (data) => {
      console.log('🎰 Betting period started:', data);
      this.bettingContainer.setVisible(true);
      this.instructionText.setText('Spectators can bet now! Game starts after countdown.').setAlpha(0.5);

      // Update status
      this.statusText.setText('BETTING').setColor('#9b59b6');
      this._drawStatusBadge(0x9b59b6, 'BETTING');
      this.pulseDot.setFillStyle(0x9b59b6);

      // Show pool info
      if (data.pool) {
        const poolOCT = (Number(BigInt(data.pool.totalPool || '0')) / 1e9).toFixed(2);
        this.bettingPoolText.setText(`Pool: ${poolOCT} OCT`);
      }
    });

    // PvP: Betting countdown tick
    window.wsClient.on('BETTING_COUNTDOWN', (data) => {
      const s = data.secondsLeft;
      this.bettingCountdownText.setText(`${s}s`);

      // Color change: green > yellow > red
      if (s <= 10) {
        this.bettingCountdownText.setColor('#d63031');
      } else if (s <= 30) {
        this.bettingCountdownText.setColor('#fdcb6e');
      } else {
        this.bettingCountdownText.setColor('#e056fd');
      }
    });

    // PvP: Room cancelled
    window.wsClient.on('ROOM_CANCELLED', (data) => {
      console.log('❌ Room cancelled:', data);
      this.statusText.setText('CANCELLED').setColor('#d63031');
      this._drawStatusBadge(0xd63031, 'CANCELLED');
      this.instructionText.setText('Room cancelled. All bets refunded.').setColor('#d63031').setAlpha(0.8);
      this.bettingContainer.setVisible(false);

      // Return to menu after 2 seconds
      this.time.delayedCall(2000, () => {
        this.scene.start('MenuScene');
      });
    });

    window.wsClient.on('ERROR', (error) => {
      this.statusText.setText(`Error: ${error.message}`).setColor('#d63031');
    });

    window.wsClient.getRoomState(this.roomUid)
      .then((room) => {
        this.modeText.setText(`${room.gameMode}  •  ${room.currentPlayers}/${room.maxPlayers} Players`);
        this.statusText.setText(room.status);
        this.updatePlayersList(room.players || []);
      })
      .catch((error) => {
        this.statusText.setText(`Error: ${error.message}`).setColor('#d63031');
      });
  }

  update(time, delta) {}

  updatePlayersList(players) {
    this.playersContainer.removeAll(true);
    const cx = CONFIG.CANVAS_WIDTH / 2;
    let yOffset = 0;

    players.forEach((player, index) => {
      const playerAddress = player.playerAddress || player.user?.address || '0x???';
      const isReady = player.isReady;
      const shortAddr = playerAddress.substring(0, 6) + '…' + playerAddress.slice(-4);

      // Card background
      const bg = this.add.graphics();
      bg.fillStyle(0x0d1020, 1);
      bg.fillRoundedRect(-200, yOffset - 18, 400, 36, 6);
      bg.lineStyle(1, isReady ? 0x00b894 : 0x2a2a4a, 1);
      bg.strokeRoundedRect(-200, yOffset - 18, 400, 36, 6);

      // Player index dot
      const dot = this.add.circle(-180, yOffset, 6, index === 0 ? 0xff7800 : 0x636e72);

      // Address
      const addrText = this.add.text(-160, yOffset, shortAddr, {
        fontSize: '13px',
        fontFamily: 'Orbitron, Arial',
        color: '#ffffff',
      }).setOrigin(0, 0.5);

      // Ready badge
      const badgeColor = isReady ? '#00b894' : '#fdcb6e';
      const badgeText = isReady ? '✓  READY' : '⏳  WAITING';
      const badge = this.add.text(185, yOffset, badgeText, {
        fontSize: '12px',
        fontFamily: 'Orbitron, Arial',
        fontStyle: 'bold',
        color: badgeColor,
      }).setOrigin(1, 0.5);

      this.playersContainer.add([bg, dot, addrText, badge]);
      yOffset += 44;
    });

    this.playersContainer.x = cx;
  }

  async markReady() {
    try {
      this.readyButtonText.setText('MARKING READY…');

      await window.wsClient.markReady(this.roomUid);

      this.isReady = true;
      this.readyBtnBg.clear();
      this._drawButton(this.readyBtnBg, CONFIG.CANVAS_WIDTH / 2, 460, 260, 52, 0x1a2a1a);
      this.readyBtnBg.lineStyle(1.5, 0x00b894, 1);
      this.readyBtnBg.strokeRoundedRect(CONFIG.CANVAS_WIDTH / 2 - 130, 460 - 26, 260, 52, 10);
      this.readyButtonText.setText('✓  READY').setColor('#00b894');
      this.instructionText.setText('Waiting for other players…').setAlpha(0.5);
    } catch (error) {
      this.readyButtonText.setText('MARK READY');
      this.instructionText.setText(`Error: ${error.message}`).setColor('#d63031').setAlpha(1);
    }
  }

  async cancelRoom() {
    try {
      this.cancelButtonText.setText('CANCELLING…');
      this.cancelButton.disableInteractive();

      await window.wsClient.cancelRoom(this.roomUid);
      // ROOM_CANCELLED event will handle the UI transition
    } catch (error) {
      this.cancelButtonText.setText('CANCEL ROOM');
      this.cancelButton.setInteractive({ useHandCursor: true });
      this.instructionText.setText(`Error: ${error.message}`).setColor('#d63031').setAlpha(1);
    }
  }

  shutdown() {
    if (window.wsClient) {
      window.wsClient.off('LOBBY_UPDATE');
      window.wsClient.off('PLAYER_JOINED');
      window.wsClient.off('PLAYER_LEFT');
      window.wsClient.off('GAME_START');
      window.wsClient.off('BETTING_START');
      window.wsClient.off('BETTING_COUNTDOWN');
      window.wsClient.off('ROOM_CANCELLED');
      window.wsClient.off('ERROR');
    }
  }
}
