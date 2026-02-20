/**
 * MenuScene - Racing-themed main menu
 */

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const cx = W / 2;

    // ── Background ─────────────────────────────────────────────────────────
    this.cameras.main.setBackgroundColor(0x080a10);

    // Subtle grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0xffffff, 0.04);
    for (let x = 0; x <= W; x += 40) { grid.lineBetween(x, 0, x, H); }
    for (let y = 0; y <= H; y += 40) { grid.lineBetween(0, y, W, y); }

    // Orange accent lines
    const accent = this.add.graphics();
    accent.lineStyle(2, 0xff7800, 0.6);
    accent.lineBetween(0, 110, W, 110);
    accent.lineBetween(0, 112, W, 112);
    accent.lineStyle(2, 0xff7800, 0.6);
    accent.lineBetween(0, H - 110, W, H - 110);
    accent.lineBetween(0, H - 112, W, H - 112);

    // Corner decorations
    const corners = this.add.graphics();
    corners.lineStyle(2, 0xff7800, 0.8);
    // top-left
    corners.strokeRect(20, 20, 40, 40);
    corners.fillStyle(0xff7800, 1);
    corners.fillRect(20, 20, 8, 8);
    // top-right
    corners.strokeRect(W - 60, 20, 40, 40);
    corners.fillRect(W - 28, 20, 8, 8);
    // bottom-left
    corners.strokeRect(20, H - 60, 40, 40);
    corners.fillRect(20, H - 28, 8, 8);
    // bottom-right
    corners.strokeRect(W - 60, H - 60, 40, 40);
    corners.fillRect(W - 28, H - 28, 8, 8);

    // ── Title ──────────────────────────────────────────────────────────────
    // Glow layer
    this.add.text(cx, 58, 'ONECHAIN RACING', {
      fontSize: '46px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ff7800',
      alpha: 0.15,
    }).setOrigin(0.5).setAlpha(0.25);

    // Main title
    this.add.text(cx, 55, 'ONECHAIN RACING', {
      fontSize: '46px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ff7800',
      strokeThickness: 1,
    }).setOrigin(0.5);

    // Orange underline
    const underline = this.add.graphics();
    underline.fillStyle(0xff7800, 1);
    underline.fillRect(cx - 160, 85, 320, 3);
    underline.fillStyle(0xff7800, 0.3);
    underline.fillRect(cx - 200, 89, 400, 1);

    // Subtitle
    this.add.text(cx, 100, '🏁  ENDLESS RACE MODE  🏁', {
      fontSize: '14px',
      fontFamily: 'Rajdhani, Arial',
      fontStyle: 'bold',
      color: '#ff7800',
      letterSpacing: 4,
    }).setOrigin(0.5);

    // ── Divider ────────────────────────────────────────────────────────────
    const div = this.add.graphics();
    div.fillStyle(0xff7800, 0.15);
    div.fillRect(cx - 120, 130, 240, 1);

    // ── CREATE ROOM Button ─────────────────────────────────────────────────
    const createY = 220;
    const btnW = 260, btnH = 52;

    const createBg = this.add.graphics();
    this._drawButton(createBg, cx, createY, btnW, btnH, 0xff7800, 1);

    const createHitArea = this.add.rectangle(cx, createY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    this.add.text(cx, createY, '⚡  CREATE ROOM', {
      fontSize: '16px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#000000',
    }).setOrigin(0.5);

    createHitArea.on('pointerover', () => {
      createBg.clear();
      this._drawButton(createBg, cx, createY, btnW, btnH, 0xffa040, 1);
      this.tweens.add({ targets: createHitArea, scaleX: 1.03, scaleY: 1.03, duration: 100 });
    });
    createHitArea.on('pointerout', () => {
      createBg.clear();
      this._drawButton(createBg, cx, createY, btnW, btnH, 0xff7800, 1);
      this.tweens.add({ targets: createHitArea, scaleX: 1, scaleY: 1, duration: 100 });
    });
    createHitArea.on('pointerdown', () => this.createRoom());

    // VS AI Button (below CREATE ROOM)
    const vsAiY = 295;
    const vsAiBg = this.add.graphics();
    this._drawButton(vsAiBg, cx, vsAiY, btnW, btnH, 0x0d1020, 1, 0xff7800);

    const vsAiHitArea = this.add.rectangle(cx, vsAiY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    this.add.text(cx, vsAiY, '🤖  PLAY VS AI', {
      fontSize: '16px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ff7800',
    }).setOrigin(0.5);

    vsAiHitArea.on('pointerover', () => {
      vsAiBg.clear();
      this._drawButton(vsAiBg, cx, vsAiY, btnW, btnH, 0x1a1020, 1, 0xffa040);
      this.tweens.add({ targets: vsAiHitArea, scaleX: 1.03, scaleY: 1.03, duration: 100 });
    });
    vsAiHitArea.on('pointerout', () => {
      vsAiBg.clear();
      this._drawButton(vsAiBg, cx, vsAiY, btnW, btnH, 0x0d1020, 1, 0xff7800);
      this.tweens.add({ targets: vsAiHitArea, scaleX: 1, scaleY: 1, duration: 100 });
    });
    vsAiHitArea.on('pointerdown', () => this.createRoomVsAI());

    // ── Separator ─────────────────────────────────────────────────────────
    this.add.text(cx, 365, '── OR JOIN EXISTING ROOM ──', {
      fontSize: '11px',
      fontFamily: 'Rajdhani, Arial',
      fontStyle: 'bold',
      color: '#ffffff',
      alpha: 0.3,
      letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0.35);

    // ── Room UID Input ─────────────────────────────────────────────────────
    const inputY = 415;
    const inputBgG = this.add.graphics();
    inputBgG.fillStyle(0x0d1020, 1);
    inputBgG.fillRoundedRect(cx - 150, inputY - 20, 300, 40, 8);
    inputBgG.lineStyle(1, 0xff7800, 0.3);
    inputBgG.strokeRoundedRect(cx - 150, inputY - 20, 300, 40, 8);

    this.roomUidText = this.add.text(cx, inputY, 'Click to enter Room UID', {
      fontSize: '13px',
      fontFamily: 'Rajdhani, Arial',
      color: '#ffffff',
      alpha: 0.3,
    }).setOrigin(0.5).setAlpha(0.35);

    const inputHit = this.add.rectangle(cx, inputY, 300, 40, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    inputHit.on('pointerover', () => {
      inputBgG.clear();
      inputBgG.fillStyle(0x131828, 1);
      inputBgG.fillRoundedRect(cx - 150, inputY - 20, 300, 40, 8);
      inputBgG.lineStyle(1, 0xff7800, 0.7);
      inputBgG.strokeRoundedRect(cx - 150, inputY - 20, 300, 40, 8);
    });
    inputHit.on('pointerout', () => {
      inputBgG.clear();
      inputBgG.fillStyle(0x0d1020, 1);
      inputBgG.fillRoundedRect(cx - 150, inputY - 20, 300, 40, 8);
      inputBgG.lineStyle(1, 0xff7800, 0.3);
      inputBgG.strokeRoundedRect(cx - 150, inputY - 20, 300, 40, 8);
    });
    inputHit.on('pointerdown', () => {
      const roomUid = prompt('Enter Room UID:');
      if (roomUid) {
        this.roomUid = roomUid;
        this.roomUidText.setText(roomUid.length > 22 ? roomUid.substring(0, 22) + '…' : roomUid);
        this.roomUidText.setColor('#ff7800').setAlpha(1);
      }
    });

    // ── JOIN ROOM Button ───────────────────────────────────────────────────
    const joinY = 485;
    const joinBg = this.add.graphics();
    this._drawButton(joinBg, cx, joinY, btnW, btnH, 0x0d1020, 1, 0xff7800);

    const joinHitArea = this.add.rectangle(cx, joinY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    this.add.text(cx, joinY, '🔗  JOIN ROOM', {
      fontSize: '16px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ff7800',
    }).setOrigin(0.5);

    joinHitArea.on('pointerover', () => {
      joinBg.clear();
      this._drawButton(joinBg, cx, joinY, btnW, btnH, 0x1a1020, 1, 0xffa040);
      this.tweens.add({ targets: joinHitArea, scaleX: 1.03, scaleY: 1.03, duration: 100 });
    });
    joinHitArea.on('pointerout', () => {
      joinBg.clear();
      this._drawButton(joinBg, cx, joinY, btnW, btnH, 0x0d1020, 1, 0xff7800);
      this.tweens.add({ targets: joinHitArea, scaleX: 1, scaleY: 1, duration: 100 });
    });
    joinHitArea.on('pointerdown', () => this.joinRoom());

    // ── Status Text ────────────────────────────────────────────────────────
    this.statusText = this.add.text(cx, 565, '', {
      fontSize: '13px',
      fontFamily: 'Rajdhani, Arial',
      fontStyle: 'bold',
      color: '#ff7800',
      letterSpacing: 1,
    }).setOrigin(0.5);

    // ── Footer ─────────────────────────────────────────────────────────────
    this.add.text(cx, H - 30, 'POWERED BY ONECHAIN  •  NFT RACING', {
      fontSize: '10px',
      fontFamily: 'Orbitron, Arial',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.15);

    // ── Blinking cursor animation ──────────────────────────────────────────
    this.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => {
        if (!this.roomUid) {
          const visible = this.roomUidText.alpha > 0.1;
          this.tweens.add({ targets: this.roomUidText, alpha: visible ? 0.35 : 0.6, duration: 300 });
        }
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

  // ── Actions (unchanged logic) ─────────────────────────────────────────────
  async createRoom() {
    try {
      this.statusText.setText('Creating room…').setColor('#ff7800');

      if (!window.gameAPI.token) {
        this.statusText.setText('❌ Please enter JWT token first').setColor('#e74c3c');
        return;
      }

      const response = await window.gameAPI.createRoom(
        'ENDLESS_RACE',
        1,
        '1000000',
        new Date(Date.now() + 3600000).toISOString()
      );

      if (response.success && response.data) {
        const roomUid = response.data.roomUid;

        if (!roomUid) {
          this.statusText.setText('❌ Room created but UID missing').setColor('#e74c3c');
          return;
        }

        this.statusText.setText(`✅ Room: ${roomUid.substring(0, 12)}…`).setColor('#2ecc71');

        try {
          if (!window.carUid) {
            this.statusText.setText('❌ Please enter Car UID first').setColor('#e74c3c');
            return;
          }

          this.statusText.setText('Joining room…').setColor('#ff7800');
          await window.wsClient.joinRoom(roomUid, window.carUid);

          setTimeout(() => {
            this.scene.start('LobbyScene', { roomUid, isHost: true });
          }, 500);
        } catch (joinError) {
          this.statusText.setText(`❌ Error joining: ${joinError.message}`).setColor('#e74c3c');
        }
      }
    } catch (error) {
      this.statusText.setText(`❌ Error: ${error.message}`).setColor('#e74c3c');
    }
  }

  async joinRoom() {
    try {
      if (!this.roomUid) {
        this.statusText.setText('❌ Please enter Room UID first').setColor('#e74c3c');
        return;
      }
      if (!window.gameAPI.token) {
        this.statusText.setText('❌ Please enter JWT token first').setColor('#e74c3c');
        return;
      }
      if (!window.carUid) {
        this.statusText.setText('❌ Please enter Car UID first').setColor('#e74c3c');
        return;
      }

      this.statusText.setText('Joining room…').setColor('#ff7800');
      await window.wsClient.joinRoom(this.roomUid, window.carUid);
      this.statusText.setText('✅ Joined successfully!').setColor('#2ecc71');

      setTimeout(() => {
        this.scene.start('LobbyScene', { roomUid: this.roomUid, isHost: false });
      }, 1000);
    } catch (error) {
      this.statusText.setText(`❌ Error: ${error.message}`).setColor('#e74c3c');
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
      this.statusText.setText(`❌ Error: ${error.message}`).setColor('#e74c3c');
    }
  }
}
