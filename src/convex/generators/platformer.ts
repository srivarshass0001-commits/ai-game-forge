import { analyzePrompt, clamp, isHumanCharacterRequested } from "../utils/promptAnalysis";

export function generatePlatformerGame(prompt: string, parameters: any) {
  const tuning = analyzePrompt(prompt, parameters);
  const human = isHumanCharacterRequested(prompt);
  const playerColor = tuning.mainColor;
  const platformColor = 0x8b4513;
  const coinColor = 0xffd700;
  const coinRepeat = Math.max(6, Math.round(11 * tuning.densityFactor));
  const stepX = clamp(Math.round(70 / clamp(tuning.densityFactor, 0.7, 1.5)), 40, 100);

  return {
    code: `
class PlatformerGame extends Phaser.Scene {
  constructor() {
    super({ key: 'PlatformerGame' });
    this.score = 0;
    this.gameOver = false;
  }

  preload() {
    this.cameras.main.setBackgroundColor('#${tuning.bgColor.toString(16)}');

    const g = this.add.graphics();
    ${human ? `
    g.fillStyle(0xffe0bd).fillCircle(16, 10, 10);
    g.fillStyle(${playerColor}).fillRoundedRect(4, 18, 24, 22, 6);
    g.fillStyle(0x000000).fillCircle(12, 8, 2).fillCircle(20, 8, 2);
    g.lineStyle(2, 0x000000).strokeCircle(16, 12, 1);
    g.fillStyle(0xff6b6b).fillRoundedRect(10, 32, 12, 6, 3);
    g.generateTexture('player', 32, 40);
    ` : `
    g.fillStyle(${playerColor}).fillRect(0, 0, 32, 32).generateTexture('player', 32, 32);
    `}

    this.add.graphics()
      .fillStyle(${platformColor})
      .fillRect(0, 0, 64, 32)
      .generateTexture('platform', 64, 32);
    
    this.add.graphics()
      .fillStyle(${coinColor})
      .fillCircle(16, 16, 16)
      .generateTexture('coin', 32, 32);
  }

  create() {
    this.physics.world.gravity.y = 800;

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(400, 568, 'platform').setScale(12.5, 1).refreshBody();
    this.platforms.create(600, 400, 'platform');
    this.platforms.create(50, 250, 'platform');
    this.platforms.create(750, 220, 'platform');

    this.player = this.physics.add.sprite(100, 450, 'player');
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.platforms);

    this.tweens.add({ targets: this.player, y: "-=2", duration: 600, yoyo: true, repeat: -1, ease: "sine.inOut" });

    this.coins = this.physics.add.group({
      key: 'coin',
      repeat: ${coinRepeat},
      setXY: { x: 12, y: 0, stepX: ${stepX} }
    });

    this.coins.children.entries.forEach(child => {
      child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });

    this.physics.add.collider(this.coins, this.platforms);
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', color: '#111' });

    this.gameOverText = this.add.text(400, 300, '', { fontSize: '48px', color: '#e53935' }).setOrigin(0.5);

    this.input.keyboard.on('keydown-R', () => { if (this.scene && this.scene.restart) this.scene.restart(); });
    this.add.text(400, 560, 'Press R to restart', { fontSize: '14px', color: '#333' }).setOrigin(0.5);
  }

  update() {
    if (this.gameOver) return;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-200);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(200);
    } else {
      this.player.setVelocityX(0);
    }

    const grounded = this.player.body.blocked.down || this.player.body.touching.down || this.player.body.onFloor?.();
    if ((Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) && grounded) {
      this.player.setVelocityY(${Math.round(-360)});
    }

    if (this.player.y > 600) {
      this.endGame();
    }
  }

  collectCoin(player, coin) {
    coin.disableBody(true, true);
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);

    if (this.coins.countActive(true) === 0) {
      this.endGame(true);
    }
  }

  endGame(won = false) {
    this.gameOver = true;
    this.physics.pause();
    
    this.gameOverText.setText((won ? 'You Win!\\n' : 'Game Over!\\n') + 'Score: ' + this.score);
    this.game.events.emit('gameEnd', this.score);
  }
}`,
    assets: [
      { name: 'player', type: 'sprite', url: 'data:player' },
      { name: 'platform', type: 'sprite', url: 'data:platform' },
      { name: 'coin', type: 'sprite', url: 'data:coin' }
    ],
    config: {
      width: 800,
      height: 600,
      physics: true
    }
  };
}
