/**
 * ResultScene - Display race results and rankings
 */

class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
    this.roomUid = null;
    this.result = null;
  }

  init(data) {
    this.roomUid = data.roomUid;
    console.log('ResultScene initialized with room:', this.roomUid);
  }

  async create() {
    const centerX = CONFIG.CANVAS_WIDTH / 2;

    // Show loading first
    const loadingText = this.add.text(centerX, CONFIG.CANVAS_HEIGHT / 2, 'Loading results...', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Fetch race result
    try {
      const response = await window.gameAPI.getResult(this.roomUid);

      if (response.success && response.data) {
        this.result = response.data;
        loadingText.destroy();
        this.displayResults();
      } else {
        loadingText.setText('Failed to load results').setColor('#d63031');
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
      loadingText.setText(`Error: ${error.message}`).setColor('#d63031');
    }
  }

  displayResults() {
    const centerX = CONFIG.CANVAS_WIDTH / 2;

    // Title
    this.add.text(centerX, 50, 'RACE FINISHED!', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Winner trophy
    this.add.text(centerX, 110, '🏆', {
      fontSize: '48px',
    }).setOrigin(0.5);

    // Winner address
    const winnerAddress = this.result.winner || 'Unknown';
    this.add.text(centerX, 150, `Winner: ${winnerAddress.substring(0, 15)}...`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#00b894',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Rankings header
    this.add.text(centerX, 200, 'Final Rankings:', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Rankings table
    this.displayRankings(centerX, 240);

    // Blockchain signature
    if (this.result.signature) {
      this.add.text(centerX, 450, 'Race Signature:', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#b2bec3',
      }).setOrigin(0.5);

      this.add.text(centerX, 470, this.result.signature.substring(0, 40) + '...', {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#636e72',
      }).setOrigin(0.5);

      this.add.text(centerX, 490, '✓ Verified by blockchain', {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#00b894',
      }).setOrigin(0.5);
    }

    // Back to menu button
    const backButton = this.add.rectangle(centerX, 550, 200, 50, 0x0984e3);
    backButton.setInteractive({ useHandCursor: true });

    const backText = this.add.text(centerX, 550, 'BACK TO MENU', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    backButton.on('pointerover', () => {
      backButton.setFillStyle(0x0aa0ff);
    });

    backButton.on('pointerout', () => {
      backButton.setFillStyle(0x0984e3);
    });

    backButton.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  displayRankings(centerX, startY) {
    if (!this.result.rankings || this.result.rankings.length === 0) {
      this.add.text(centerX, startY + 20, 'No rankings available', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#636e72',
      }).setOrigin(0.5);
      return;
    }

    let yOffset = startY;

    this.result.rankings.forEach((ranking, index) => {
      // Ranking background
      const bgColor = index === 0 ? 0x00b894 : 0x2d3436;
      const bg = this.add.rectangle(centerX, yOffset, 600, 35, bgColor, 0.3);
      bg.setStrokeStyle(1, 0x636e72);

      // Rank medal/number
      let rankIcon = `${ranking.rank}.`;
      if (ranking.rank === 1) rankIcon = '🥇';
      else if (ranking.rank === 2) rankIcon = '🥈';
      else if (ranking.rank === 3) rankIcon = '🥉';

      const rankText = this.add.text(centerX - 280, yOffset, rankIcon, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0, 0.5);

      // Player address
      const playerAddress = ranking.playerId || 'Unknown';
      const playerText = this.add.text(centerX - 240, yOffset, playerAddress.substring(0, 12) + '...', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0, 0.5);

      // Distance
      const distance = ranking.distance || 0;
      const distanceText = this.add.text(centerX + 50, yOffset, `${distance}m`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#b2bec3',
      }).setOrigin(0, 0.5);

      // Time
      const timeSeconds = ((ranking.finalTime || 0) / 1000).toFixed(1);
      const timeText = this.add.text(centerX + 180, yOffset, `${timeSeconds}s`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#b2bec3',
      }).setOrigin(0, 0.5);

      yOffset += 40;
    });
  }
}
