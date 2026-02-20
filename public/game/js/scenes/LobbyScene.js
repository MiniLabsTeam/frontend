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

    // ── Ready Button ───────────────────────────────────────────────────────
    const btnY = 460;
    const btnW = 260, btnH = 52;

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

    // ── Instructions ───────────────────────────────────────────────────────
    this.instructionText = this.add.text(cx, 522, 'Game starts when all players are ready', {
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

  shutdown() {
    if (window.wsClient) {
      window.wsClient.off('LOBBY_UPDATE');
      window.wsClient.off('PLAYER_JOINED');
      window.wsClient.off('PLAYER_LEFT');
      window.wsClient.off('GAME_START');
      window.wsClient.off('ERROR');
    }
  }
}
