/**
 * PredictionScene - In-game betting overlay
 * Runs as a parallel scene on top of GameScene
 * Uses deposited prediction balance (deposit OCT via prediction page first)
 */

const BET_AMOUNT = 2; // Fixed bet amount in OCT per click
const MIST_PER_OCT = 1_000_000_000; // 1 OCT = 10^9 MIST

class PredictionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PredictionScene' });
    this.pool = null;
    this.players = [];
    this.isOpen = false;
    this.roomUid = null;
    this.betting = false;
    this.balanceMist = 0n;
  }

  init(data) {
    this.roomUid = data.roomUid;
  }

  create() {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;

    // Semi-transparent backdrop (right panel)
    const panelW = 240;
    const panelX = W - panelW;

    this.panelBg = this.add.graphics();
    this.panelBg.fillStyle(0x080a10, 0.92);
    this.panelBg.fillRect(panelX, 0, panelW, H);
    this.panelBg.lineStyle(2, 0xffd700, 0.5);
    this.panelBg.lineBetween(panelX, 0, panelX, H);

    // Title
    this.add.text(panelX + panelW / 2, 16, 'PREDICTION', {
      fontSize: '16px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ffd700',
    }).setOrigin(0.5);

    this.add.text(panelX + panelW / 2, 34, 'Tap a player to bet ' + BET_AMOUNT + ' OCT', {
      fontSize: '10px',
      fontFamily: 'Rajdhani, Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Balance display
    this.balanceText = this.add.text(panelX + panelW / 2, 50, 'Balance: ...', {
      fontSize: '11px',
      fontFamily: 'Rajdhani, Arial',
      fontStyle: 'bold',
      color: '#a78bfa',
    }).setOrigin(0.5);

    // Betting window countdown
    this.bettingWindowText = this.add.text(panelX + panelW / 2, 64, '', {
      fontSize: '11px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#e056fd',
    }).setOrigin(0.5);

    // Divider
    const divG = this.add.graphics();
    divG.fillStyle(0xffd700, 0.3);
    divG.fillRect(panelX + 15, 78, panelW - 30, 1);

    // Pool info
    this.poolText = this.add.text(panelX + 15, 84, 'Pool: loading...', {
      fontSize: '12px',
      fontFamily: 'Rajdhani, Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    });

    this.statusText = this.add.text(panelX + panelW - 15, 84, '', {
      fontSize: '10px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#00e676',
    }).setOrigin(1, 0);

    // Players container
    this.playersContainer = this.add.container(0, 106);
    this.bettingClosed = false;

    // Close button
    const closeX = panelX + panelW - 20;
    const closeY = 16;
    this.add.text(closeX, closeY, 'X', {
      fontSize: '16px',
      fontFamily: 'Orbitron, Arial',
      fontStyle: 'bold',
      color: '#ff4444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.closePrediction());

    // Message text (for errors, success)
    this.messageText = this.add.text(panelX + panelW / 2, H - 30, '', {
      fontSize: '11px',
      fontFamily: 'Rajdhani, Arial',
      fontStyle: 'bold',
      color: '#00e676',
      wordWrap: { width: panelW - 30 },
      align: 'center',
    }).setOrigin(0.5);

    // Fetch pool data and balance
    this.fetchPool();
    this.fetchBalance();

    // Auto-refresh every 5s (pool + balance + betting countdown)
    this.refreshTimer = this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => {
        this.fetchPool();
        this.fetchBalance();
      },
    });

    this.panelX = panelX;
    this.panelW = panelW;
  }

  async fetchBalance() {
    try {
      const response = await window.gameAPI.getPredictionBalance();
      if (response.success) {
        this.balanceMist = BigInt(response.data?.balanceMist || '0');
        const balanceOCT = (Number(this.balanceMist) / MIST_PER_OCT).toFixed(2);
        this.balanceText.setText(`Balance: ${balanceOCT} OCT`);

        if (this.balanceMist <= 0n) {
          this.balanceText.setColor('#ff4444');
        } else {
          this.balanceText.setColor('#a78bfa');
        }
      }
    } catch (err) {
      this.balanceText.setText('Balance: N/A');
      this.balanceText.setColor('#666666');
    }
  }

  async fetchPool() {
    try {
      const response = await window.gameAPI.getPredictionPool(this.roomUid);
      if (response.success) {
        this.pool = response.data;
        this.renderPool();
      }
    } catch (err) {
      // Pool might not exist yet for this room
      this.poolText.setText('Pool: not available');
      this.statusText.setText('N/A').setColor('#666666');
    }
  }

  renderPool() {
    if (!this.pool) return;

    const panelX = this.panelX;
    const panelW = this.panelW;

    const totalPoolMist = Number(this.pool.totalPool || 0);
    const totalPoolOCT = (totalPoolMist / MIST_PER_OCT).toFixed(2);
    this.poolText.setText(`Pool: ${totalPoolOCT} OCT`);

    // Check betting window
    const bettingEndsAt = this.pool.room?.bettingEndsAt;
    if (bettingEndsAt) {
      const endsAt = new Date(bettingEndsAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));

      if (remaining > 0) {
        this.bettingWindowText.setText(`Betting closes in ${remaining}s`);
        this.bettingWindowText.setColor(remaining <= 10 ? '#d63031' : '#e056fd');
        this.bettingClosed = false;
      } else {
        this.bettingWindowText.setText('Betting closed');
        this.bettingWindowText.setColor('#d63031');
        this.bettingClosed = true;
      }
    } else {
      this.bettingWindowText.setText('');
      this.bettingClosed = false;
    }

    const status = this.pool.isSettled ? 'SETTLED' : this.bettingClosed ? 'CLOSED' : 'OPEN';
    this.statusText.setText(status);
    this.statusText.setColor(this.pool.isSettled ? '#666666' : this.bettingClosed ? '#d63031' : '#00e676');

    // Render player betting cards
    this.playersContainer.removeAll(true);

    const players = this.pool.room?.players || [];
    const playerBets = this.pool.playerBets || {};
    const odds = this.pool.odds || {};

    players.forEach((rp, idx) => {
      const y = idx * 95;
      const addr = rp.playerAddress || rp.user?.address || '';
      const name = rp.user?.username || addr.substring(0, 10) + '...';
      const playerOdds = odds[addr] ? odds[addr].toFixed(1) + 'x' : '--';
      const betInfo = playerBets[addr];
      const betCount = betInfo ? betInfo.count : 0;

      // Card bg
      const bg = this.add.graphics();
      bg.fillStyle(0x111428, 1);
      bg.fillRoundedRect(panelX + 10, y, panelW - 20, 85, 8);
      bg.lineStyle(1, 0x333366, 1);
      bg.strokeRoundedRect(panelX + 10, y, panelW - 20, 85, 8);

      // Player name
      const nameText = this.add.text(panelX + 20, y + 8, name, {
        fontSize: '13px',
        fontFamily: 'Orbitron, Arial',
        fontStyle: 'bold',
        color: '#ffffff',
      });

      // Odds badge
      const oddsBg = this.add.graphics();
      oddsBg.fillStyle(0xffd700, 0.15);
      oddsBg.fillRoundedRect(panelX + panelW - 65, y + 6, 45, 20, 4);
      const oddsText = this.add.text(panelX + panelW - 42, y + 16, playerOdds, {
        fontSize: '11px',
        fontFamily: 'Orbitron, Arial',
        fontStyle: 'bold',
        color: '#ffd700',
      }).setOrigin(0.5);

      // Bet count info
      const betsText = this.add.text(panelX + 20, y + 30, `${betCount} bets`, {
        fontSize: '10px',
        fontFamily: 'Rajdhani, Arial',
        color: '#888888',
      });

      // BET button (only if pool is not settled and betting is still open)
      if (!this.pool.isSettled && !this.bettingClosed) {
        const btnY = y + 52;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x6c3ce6, 1);
        btnBg.fillRoundedRect(panelX + 15, btnY, panelW - 30, 28, 6);

        const btnText = this.add.text(panelX + panelW / 2, btnY + 14, `BET ${BET_AMOUNT} OCT`, {
          fontSize: '11px',
          fontFamily: 'Orbitron, Arial',
          fontStyle: 'bold',
          color: '#ffffff',
        }).setOrigin(0.5);

        const btnHit = this.add.rectangle(panelX + panelW / 2, btnY + 14, panelW - 30, 28, 0x000000, 0)
          .setInteractive({ useHandCursor: true });

        btnHit.on('pointerover', () => {
          btnBg.clear();
          btnBg.fillStyle(0x8855ff, 1);
          btnBg.fillRoundedRect(panelX + 15, btnY, panelW - 30, 28, 6);
        });
        btnHit.on('pointerout', () => {
          btnBg.clear();
          btnBg.fillStyle(0x6c3ce6, 1);
          btnBg.fillRoundedRect(panelX + 15, btnY, panelW - 30, 28, 6);
        });
        btnHit.on('pointerdown', () => this.placeBet(addr, name, btnBg, btnText, btnY));

        this.playersContainer.add([bg, nameText, oddsBg, oddsText, betsText, btnBg, btnText, btnHit]);
      } else {
        this.playersContainer.add([bg, nameText, oddsBg, oddsText, betsText]);
      }
    });
  }

  async placeBet(playerAddress, playerName, btnBg, btnText, btnY) {
    if (this.betting) return; // Prevent double-tap
    this.betting = true;

    const panelX = this.panelX;
    const panelW = this.panelW;

    // Check balance before betting
    const betMist = BigInt(BET_AMOUNT) * BigInt(MIST_PER_OCT);
    if (this.balanceMist < betMist) {
      this.messageText.setText('Not enough balance! Deposit OCT on the Prediction page first.').setColor('#ff4444');
      this.betting = false;
      this.time.delayedCall(4000, () => {
        if (this.messageText) this.messageText.setText('');
      });
      return;
    }

    // Visual feedback — button turns gold
    btnBg.clear();
    btnBg.fillStyle(0xffd700, 1);
    btnBg.fillRoundedRect(panelX + 15, btnY, panelW - 30, 28, 6);
    btnText.setText('BETTING...');
    btnText.setColor('#000000');

    try {
      await window.gameAPI.placeBet(this.pool.id, playerAddress, BET_AMOUNT);
      this.messageText.setText(`+${BET_AMOUNT} OCT on ${playerName}!`).setColor('#00e676');
      // Refresh pool data and balance
      this.fetchPool();
      this.fetchBalance();
    } catch (err) {
      const msg = err.message || 'Bet failed';
      this.messageText.setText(msg).setColor('#ff4444');
      // Restore button
      btnBg.clear();
      btnBg.fillStyle(0x6c3ce6, 1);
      btnBg.fillRoundedRect(panelX + 15, btnY, panelW - 30, 28, 6);
      btnText.setText(`BET ${BET_AMOUNT} OCT`);
      btnText.setColor('#ffffff');
    }

    this.betting = false;

    // Clear message after 3s
    this.time.delayedCall(3000, () => {
      if (this.messageText) this.messageText.setText('');
    });
  }

  closePrediction() {
    this.scene.stop('PredictionScene');
  }

  shutdown() {
    if (this.refreshTimer) {
      this.refreshTimer.destroy();
    }
  }
}
