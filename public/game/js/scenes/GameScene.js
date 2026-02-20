/**
 * GameScene - Main racing game (vertical scrolling, lane-based)
 */

const PLAYER_Y = 460;   // Fixed screen Y for local player car
const DASH_H   = 24;    // Lane divider dash height (px)
const DASH_GAP = 20;    // Gap between dashes (px)
const DASH_PERIOD = DASH_H + DASH_GAP;

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.roomUid    = null;
    this.gameState  = null;
    this.myPlayerId = null;
    this.playerSprites   = {};
    this.obstacleSprites = {};
    this.powerUpSprites  = {};
    this.scrollOffset = 0;
    this.lastPlayerZ  = 0;
  }

  init(data) {
    this.roomUid = data.roomUid;
  }

  create() {
    this.myPlayerId = window.playerAddress ||
                      document.getElementById('player-address')?.value ||
                      'UNKNOWN';

    this.cameras.main.setBackgroundColor(0x0a0c14);

    // Track background (static layer)
    this._buildStaticTrack();

    // Scrolling lane dividers (redrawn every frame)
    this.laneDivGfx = this.add.graphics();

    // HUD on top of everything
    this._buildHUD();

    this.cursors = this.input.keyboard.createCursorKeys();
    this._setupWebSocket();
  }

  // ─────────────────────────────────────────────
  //  Static track background (drawn once)
  // ─────────────────────────────────────────────
  _buildStaticTrack() {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const TL = 250, TR = 550;

    // Grass / off-track
    this.add.rectangle(TL / 2,             H / 2, TL,       H, 0x0d1a0d);
    this.add.rectangle((W + TR) / 2,       H / 2, W - TR,   H, 0x0d1a0d);
    // Asphalt
    this.add.rectangle((TL + TR) / 2,      H / 2, TR - TL,  H, 0x1c1c2e);
    // Edge lines
    this.add.rectangle(TL + 1, H / 2, 2, H, 0xffffff);
    this.add.rectangle(TR - 1, H / 2, 2, H, 0xffffff);
  }

  // ─────────────────────────────────────────────
  //  HUD (fixed, scroll-factor 0)
  // ─────────────────────────────────────────────
  _buildHUD() {
    const W = CONFIG.CANVAS_WIDTH;

    const hudBg = this.add.rectangle(W / 2, 27, W, 55, 0x000000, 0.88);
    hudBg.setScrollFactor(0).setDepth(10);

    this.add.rectangle(W / 2, 1.5, W, 3, 0xff7800).setScrollFactor(0).setDepth(10);

    const sf = 0, dp = 11;

    this._label(20,  8, 'DIST',  sf, dp);
    this._label(220, 8, 'RANK',  sf, dp);
    this._label(400, 8, 'SPEED', sf, dp);

    this.distText  = this._value(20,  22, '0m',  '#ffffff', sf, dp);
    this.rankText  = this._value(220, 22, '-',   '#ff7800', sf, dp);
    this.speedText = this._value(400, 22, '0',   '#00e5ff', sf, dp);

    this._statusDot  = this.add.circle(585, 20, 5, 0x00e676).setScrollFactor(sf).setDepth(dp);
    this.statusText  = this._value(596, 14, 'Racing', '#00e676', sf, dp);
    this.statusText.setFontSize('13px');
  }

  _label(x, y, text, sf, dp) {
    return this.add.text(x, y, text, {
      fontSize: '9px', fontFamily: 'Orbitron, Arial',
      color: '#666666', letterSpacing: 2,
    }).setScrollFactor(sf).setDepth(dp);
  }

  _value(x, y, text, color, sf, dp) {
    return this.add.text(x, y, text, {
      fontSize: '20px', fontFamily: 'Orbitron, Arial',
      color, fontStyle: 'bold',
    }).setScrollFactor(sf).setDepth(dp);
  }

  // ─────────────────────────────────────────────
  //  WebSocket
  // ─────────────────────────────────────────────
  _setupWebSocket() {
    if (!window.wsClient) {
      this.statusText.setText('No WS').setColor('#d63031');
      return;
    }

    window.wsClient.on('GAME_STATE', (state) => {
      this.gameState = state;
      if (state.status === 'FINISHED') {
        this.scene.start('ResultScene', { roomUid: this.roomUid });
        return;
      }
      this._render();
    });

    window.wsClient.on('GAME_END', (result) => {
      setTimeout(() => this.scene.start('ResultScene', { roomUid: this.roomUid, result }), 100);
    });

    window.wsClient.on('ERROR', (err) => {
      this.statusText.setText('Error').setColor('#d63031');
    });
  }

  // ─────────────────────────────────────────────
  //  Main render — called on every GAME_STATE event
  // ─────────────────────────────────────────────
  _render() {
    if (!this.gameState) return;

    const myPlayer = this.gameState.players.find(p => p.playerId === this.myPlayerId);

    // Scroll track
    if (myPlayer) {
      this.scrollOffset = (myPlayer.position.z * CONFIG.SCALE) % DASH_PERIOD;
      this._drawLaneDividers(this.scrollOffset);
    }

    this._renderPlayers(myPlayer);
    this._renderObstacles(myPlayer);
    this._renderPowerUps(myPlayer);
    this._updateHUD(myPlayer);
  }

  // ─────────────────────────────────────────────
  //  Scrolling lane dividers
  // ─────────────────────────────────────────────
  _drawLaneDividers(offset) {
    const g = this.laneDivGfx;
    g.clear();
    g.fillStyle(0xffd700, 0.85);

    const H = CONFIG.CANVAS_HEIGHT;
    const startY = -(DASH_PERIOD - offset % DASH_PERIOD);

    for (let y = startY; y < H; y += DASH_PERIOD) {
      g.fillRect(349, y, 2, DASH_H);
      g.fillRect(449, y, 2, DASH_H);
    }
  }

  // ─────────────────────────────────────────────
  //  Coordinate helpers
  // ─────────────────────────────────────────────
  _screenX(gameX) {
    return CONFIG.gameToScreenX(gameX);
  }

  _screenY(objectZ, myPlayer) {
    if (!myPlayer) return PLAYER_Y;
    return PLAYER_Y - (objectZ - myPlayer.position.z) * CONFIG.SCALE;
  }

  // ─────────────────────────────────────────────
  //  Render players
  // ─────────────────────────────────────────────
  _renderPlayers(myPlayer) {
    const players = this.gameState?.players;
    if (!players) return;

    const active = new Set();

    players.forEach((player, idx) => {
      const id = player.playerId;
      active.add(id);

      let g = this.playerSprites[id];
      if (!g) {
        g = this._createCarSprite(player, idx);
        this.playerSprites[id] = g;
      }

      const isMe = id === this.myPlayerId;
      g.x = this._screenX(player.position.x);
      g.y = isMe ? PLAYER_Y : this._screenY(player.position.z, myPlayer);
      g.setAlpha(player.isFinished ? 0.3 : 1.0);

      // Only draw if on screen
      g.setVisible(g.y > 40 && g.y < CONFIG.CANVAS_HEIGHT + 20);
    });

    // Remove gone players
    for (const id in this.playerSprites) {
      if (!active.has(id)) {
        this.playerSprites[id].destroy();
        delete this.playerSprites[id];
      }
    }
  }

  _createCarSprite(player, idx) {
    const isMe = player.playerId === this.myPlayerId;
    const color = CONFIG.getPlayerColor(idx);
    const g = this.add.graphics();

    if (isMe) {
      g.lineStyle(2, 0xffd700, 1);
      g.strokeRect(-9, -16, 18, 32);
    }
    g.fillStyle(color, 1);
    g.fillRoundedRect(-8, -15, 16, 30, 3);
    g.fillStyle(0xaaddff, 0.85);
    g.fillRect(-5, -12, 10, 8);
    g.fillStyle(0xffffff, 1);
    g.fillRect(-3, -15, 6, 3);
    g.fillStyle(0xff2222, 1);
    g.fillRect(-7, 12, 5, 3);
    g.fillRect(2,  12, 5, 3);
    return g;
  }

  // ─────────────────────────────────────────────
  //  Render obstacles
  // ─────────────────────────────────────────────
  _renderObstacles(myPlayer) {
    const obstacles = this.gameState?.obstacles;
    if (!obstacles) return;

    const active = new Set();

    obstacles.forEach((obs) => {
      active.add(obs.id);
      let s = this.obstacleSprites[obs.id];
      if (!s) {
        const w = obs.size.x * CONFIG.SCALE;
        const h = obs.size.z * CONFIG.SCALE;
        s = this.add.rectangle(0, 0, w, h, CONFIG.getObstacleColor(obs.type));
        this.obstacleSprites[obs.id] = s;
      }
      s.x = this._screenX(obs.position.x);
      s.y = this._screenY(obs.position.z, myPlayer);
      s.setVisible(s.y > 40 && s.y < CONFIG.CANVAS_HEIGHT + 20);
    });

    for (const id in this.obstacleSprites) {
      if (!active.has(id)) {
        this.obstacleSprites[id].destroy();
        delete this.obstacleSprites[id];
      }
    }
  }

  // ─────────────────────────────────────────────
  //  Render power-ups
  // ─────────────────────────────────────────────
  _renderPowerUps(myPlayer) {
    const powerUps = this.gameState?.powerUps;
    if (!powerUps) return;

    const active = new Set();

    powerUps.forEach((pu) => {
      if (pu.collected) return;
      active.add(pu.id);
      let s = this.powerUpSprites[pu.id];
      if (!s) {
        s = this.add.circle(0, 0, CONFIG.SIZES.POWERUP_RADIUS, CONFIG.getPowerUpColor(pu.type));
        this.powerUpSprites[pu.id] = s;
      }
      s.x = this._screenX(pu.position.x);
      s.y = this._screenY(pu.position.z, myPlayer);
      const sc = 1 + Math.sin(Date.now() / 200) * 0.15;
      s.setScale(sc);
      s.setVisible(s.y > 40 && s.y < CONFIG.CANVAS_HEIGHT + 20);
    });

    for (const id in this.powerUpSprites) {
      if (!active.has(id)) {
        this.powerUpSprites[id].destroy();
        delete this.powerUpSprites[id];
      }
    }
  }

  // ─────────────────────────────────────────────
  //  HUD update
  // ─────────────────────────────────────────────
  _updateHUD(myPlayer) {
    if (myPlayer) {
      this.distText.setText(`${Math.floor(myPlayer.position.z)}m`);
      this.rankText.setText(`${myPlayer.rank || '?'}${this._rankSuffix(myPlayer.rank)}`);
      this.speedText.setText(`${Math.floor(myPlayer.speed)}`);
    }
    this.statusText.setText(this.gameState?.status || '');
  }

  _rankSuffix(r) {
    if (!r) return '';
    if (r === 1) return 'st';
    if (r === 2) return 'nd';
    if (r === 3) return 'rd';
    return 'th';
  }

  // ─────────────────────────────────────────────
  //  Input
  // ─────────────────────────────────────────────
  update() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left))
      this._sendInput(CONFIG.ACTIONS.TURN_LEFT);
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right))
      this._sendInput(CONFIG.ACTIONS.TURN_RIGHT);
  }

  _sendInput(action) {
    if (window.wsClient) window.wsClient.sendInput(this.roomUid, action);
  }

  // ─────────────────────────────────────────────
  //  Cleanup
  // ─────────────────────────────────────────────
  shutdown() {
    if (window.wsClient) {
      window.wsClient.off('GAME_STATE');
      window.wsClient.off('GAME_END');
      window.wsClient.off('ERROR');
    }
  }
}
