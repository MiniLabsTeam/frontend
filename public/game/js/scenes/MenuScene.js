/**
 * MenuScene - Main menu for creating/joining rooms
 */

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const centerX = CONFIG.CANVAS_WIDTH / 2;
    const centerY = CONFIG.CANVAS_HEIGHT / 2;

    // Title
    this.add.text(centerX, 80, 'ONECHAIN RACING', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(centerX, 130, 'Endless Race Mode', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#b2bec3',
    }).setOrigin(0.5);

    // Instructions
    this.add.text(centerX, 180, 'Enter your credentials in the top-right panel', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#636e72',
    }).setOrigin(0.5);

    // Create Room Button
    const createButton = this.add.rectangle(centerX, 250, 200, 50, 0x00b894);
    createButton.setInteractive({ useHandCursor: true });

    const createText = this.add.text(centerX, 250, 'CREATE ROOM', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    createButton.on('pointerover', () => {
      createButton.setFillStyle(0x00d2a5);
    });

    createButton.on('pointerout', () => {
      createButton.setFillStyle(0x00b894);
    });

    createButton.on('pointerdown', () => {
      this.createRoom();
    });

    // Join Room Section
    this.add.text(centerX, 330, 'Or Join Existing Room:', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#b2bec3',
    }).setOrigin(0.5);

    // Room UID Input (text display)
    const inputBg = this.add.rectangle(centerX, 370, 300, 40, 0x2d3436);
    inputBg.setStrokeStyle(2, 0x636e72);

    this.roomUidText = this.add.text(centerX, 370, 'Enter Room UID...', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#636e72',
    }).setOrigin(0.5);

    // Prompt for room UID
    inputBg.setInteractive({ useHandCursor: true });
    inputBg.on('pointerdown', () => {
      const roomUid = prompt('Enter Room UID:');
      if (roomUid) {
        this.roomUid = roomUid;
        this.roomUidText.setText(roomUid.substring(0, 20) + '...');
        this.roomUidText.setColor('#ffffff');
      }
    });

    // Join Button
    const joinButton = this.add.rectangle(centerX, 430, 200, 50, 0x0984e3);
    joinButton.setInteractive({ useHandCursor: true });

    const joinText = this.add.text(centerX, 430, 'JOIN ROOM', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    joinButton.on('pointerover', () => {
      joinButton.setFillStyle(0x0aa0ff);
    });

    joinButton.on('pointerout', () => {
      joinButton.setFillStyle(0x0984e3);
    });

    joinButton.on('pointerdown', () => {
      this.joinRoom();
    });

    // Status text
    this.statusText = this.add.text(centerX, 520, '', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#636e72',
    }).setOrigin(0.5);

    console.log('MenuScene initialized');
  }

  async createRoom() {
    try {
      this.statusText.setText('Creating room...').setColor('#00b894');

      if (!window.gameAPI.token) {
        this.statusText.setText('❌ Please enter JWT token first').setColor('#d63031');
        return;
      }

      // Create room with default settings
      const response = await window.gameAPI.createRoom(
        'ENDLESS_RACE',
        1, // Max 1 player for solo testing
        '1000000', // Entry fee
        new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      );

      console.log('Room created:', response);
      console.log('response.data:', response.data);
      console.log('response.data.roomUid:', response.data?.roomUid);

      if (response.success && response.data) {
        const roomUid = response.data.roomUid;

        if (!roomUid) {
          console.error('❌ roomUid is undefined!', response.data);
          this.statusText.setText('❌ Room created but UID missing').setColor('#d63031');
          return;
        }

        this.statusText.setText(`✅ Room created: ${roomUid.substring(0, 10)}...`).setColor('#00b894');

        // Auto-join the room we just created
        try {
          if (!window.carUid) {
            this.statusText.setText('❌ Please enter Car UID first').setColor('#d63031');
            return;
          }

          this.statusText.setText('Joining room...').setColor('#00b894');

          // Join via WebSocket (registers in database AND subscribes to events)
          await window.wsClient.joinRoom(roomUid, window.carUid);

          setTimeout(() => {
            this.scene.start('LobbyScene', {
              roomUid: roomUid,
              isHost: true,
            });
          }, 500);
        } catch (joinError) {
          console.error('Failed to auto-join room:', joinError);
          this.statusText.setText(`❌ Error joining: ${joinError.message}`).setColor('#d63031');
        }
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      this.statusText.setText(`❌ Error: ${error.message}`).setColor('#d63031');
    }
  }

  async joinRoom() {
    try {
      if (!this.roomUid) {
        this.statusText.setText('❌ Please enter Room UID first').setColor('#d63031');
        return;
      }

      if (!window.gameAPI.token) {
        this.statusText.setText('❌ Please enter JWT token first').setColor('#d63031');
        return;
      }

      if (!window.carUid) {
        this.statusText.setText('❌ Please enter Car UID first').setColor('#d63031');
        return;
      }

      this.statusText.setText('Joining room...').setColor('#00b894');

      // Join via WebSocket (registers in database AND subscribes to events)
      await window.wsClient.joinRoom(this.roomUid, window.carUid);

      console.log('✅ Joined room via WebSocket');
      this.statusText.setText('✅ Joined successfully!').setColor('#00b894');

      setTimeout(() => {
        this.scene.start('LobbyScene', {
          roomUid: this.roomUid,
          isHost: false,
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to join room:', error);
      this.statusText.setText(`❌ Error: ${error.message}`).setColor('#d63031');
    }
  }
}
