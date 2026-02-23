/**
 * SpectateListScene - Browse and watch live races
 */

class SpectateListScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SpectateListScene' });
    this.rooms = [];
    this.roomCards = [];
  }

  create() {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor(0x080a10);

    // Background grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0xffffff, 0.03);
    for (let x = 0; x <= W; x += 40) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 40) grid.lineBetween(0, y, W, y);

    // Accent lines
    const accent = this.add.graphics();
    accent.lineStyle(2, 0xff0040, 0.5);
    accent.lineBetween(0, 88, W, 88);
    accent.lineBetween(0, 90, W, 90);

    // Title
    this.add.text(cx, 45, 'LIVE RACES', {
      fontSize: '38px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ff0040',
      strokeThickness: 1,
    }).setOrigin(0.5);

    // Underline
    const ul = this.add.graphics();
    ul.fillStyle(0xff0040, 1);
    ul.fillRect(cx - 80, 74, 160, 2);

    // Subtitle
    this.add.text(cx, 100, 'SELECT A RACE TO SPECTATE', {
      fontSize: '11px',
      fontFamily: 'Orbitron, Arial',
      color: '#ffffff',
      letterSpacing: 3,
    }).setOrigin(0.5).setAlpha(0.4);

    // Loading text
    this.loadingText = this.add.text(cx, H / 2, 'Loading live races...', {
      fontSize: '16px',
      fontFamily: 'Rajdhani, Arial',
      color: '#ff0040',
    }).setOrigin(0.5);

    // Room list container
    this.roomContainer = this.add.container(0, 130);

    // Back button
    const backY = H - 50;
    const backBg = this.add.graphics();
    backBg.fillStyle(0x0d1020, 1);
    backBg.fillRoundedRect(cx - 80, backY - 18, 160, 36, 8);
    backBg.lineStyle(1, 0xff0040, 0.5);
    backBg.strokeRoundedRect(cx - 80, backY - 18, 160, 36, 8);

    this.add.text(cx, backY, 'BACK', {
      fontSize: '14px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ff0040',
    }).setOrigin(0.5);

    this.add.rectangle(cx, backY, 160, 36, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MenuScene'));

    // Fetch live rooms
    this.fetchLiveRooms();

    // Auto-refresh every 5 seconds
    this.refreshTimer = this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => this.fetchLiveRooms(),
    });
  }

  async fetchLiveRooms() {
    try {
      const response = await window.gameAPI.getLiveRooms();
      this.rooms = response.data || [];
      this.renderRooms();
    } catch (err) {
      console.error('Failed to fetch live rooms:', err);
      this.loadingText.setText('Failed to load — retrying...').setAlpha(1);
    }
  }

  renderRooms() {
    this.roomContainer.removeAll(true);
    this.roomCards = [];
    const cx = CONFIG.CANVAS_WIDTH / 2;

    if (this.rooms.length === 0) {
      this.loadingText.setText('No live races right now').setAlpha(0.5);
      return;
    }

    this.loadingText.setAlpha(0);

    this.rooms.forEach((room, idx) => {
      const y = idx * 90;
      const cardW = 500;
      const cardH = 76;

      // Card background
      const bg = this.add.graphics();
      bg.fillStyle(0x0d1020, 1);
      bg.fillRoundedRect(cx - cardW / 2, y, cardW, cardH, 10);
      bg.lineStyle(1, 0xff0040, 0.3);
      bg.strokeRoundedRect(cx - cardW / 2, y, cardW, cardH, 10);

      // Live indicator dot (pulsing)
      const dot = this.add.circle(cx - cardW / 2 + 20, y + 20, 5, 0xff0040);
      this.tweens.add({
        targets: dot,
        alpha: 0.2,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });

      // LIVE label
      const liveLabel = this.add.text(cx - cardW / 2 + 32, y + 14, 'LIVE', {
        fontSize: '10px',
        fontFamily: 'Orbitron, Arial',
        fontStyle: 'bold',
        color: '#ff0040',
      });

      // Room name
      const shortRoom = room.roomUid.length > 24
        ? room.roomUid.substring(0, 24) + '...'
        : room.roomUid;
      const roomText = this.add.text(cx - cardW / 2 + 20, y + 36, shortRoom, {
        fontSize: '13px',
        fontFamily: 'Orbitron, Arial',
        color: '#ffffff',
      });

      // Player count
      const playerNames = (room.players || [])
        .map(p => p.user?.username || (p.playerAddress || '').substring(0, 8) + '...')
        .join(' vs ');

      const playersText = this.add.text(cx - cardW / 2 + 20, y + 55, playerNames || 'Unknown', {
        fontSize: '11px',
        fontFamily: 'Rajdhani, Arial',
        color: '#aaaaaa',
      });

      // WATCH button
      const btnX = cx + cardW / 2 - 70;
      const btnBg = this.add.graphics();
      btnBg.fillStyle(0xff0040, 1);
      btnBg.fillRoundedRect(btnX - 35, y + 20, 70, 36, 8);

      const btnText = this.add.text(btnX, y + 38, 'WATCH', {
        fontSize: '12px',
        fontFamily: 'Orbitron, Arial',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);

      const btnHit = this.add.rectangle(btnX, y + 38, 70, 36, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      btnHit.on('pointerover', () => {
        btnBg.clear();
        btnBg.fillStyle(0xff3366, 1);
        btnBg.fillRoundedRect(btnX - 35, y + 20, 70, 36, 8);
      });
      btnHit.on('pointerout', () => {
        btnBg.clear();
        btnBg.fillStyle(0xff0040, 1);
        btnBg.fillRoundedRect(btnX - 35, y + 20, 70, 36, 8);
      });
      btnHit.on('pointerdown', () => this.spectateRoom(room.roomUid));

      this.roomContainer.add([bg, dot, liveLabel, roomText, playersText, btnBg, btnText, btnHit]);
    });
  }

  async spectateRoom(roomUid) {
    try {
      if (!window.wsClient) {
        console.error('WebSocket not initialized');
        return;
      }
      await window.wsClient.spectateJoin(roomUid);
      this.scene.start('GameScene', { roomUid, spectator: true });
    } catch (err) {
      console.error('Failed to spectate:', err);
    }
  }

  shutdown() {
    if (this.refreshTimer) {
      this.refreshTimer.destroy();
    }
  }
}
