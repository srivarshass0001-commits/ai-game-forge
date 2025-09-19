import { analyzePrompt, clamp, isHumanCharacterRequested } from "../utils/promptAnalysis";

export function generateShooterGame(prompt: string, parameters: any) {
  const tuning = analyzePrompt(prompt, parameters);
  const human = isHumanCharacterRequested(prompt);
  const playerColor = 0x00ff00;
  const enemyColor = tuning.mainColor;
  const bulletColor = 0xffff00;
  const baseEnemySpeed = Math.round(16 * tuning.speedFactor * tuning.difficultyScale + 16);
  const spawnDelayMs = clamp(Math.round(1100 / clamp(tuning.densityFactor, 0.7, 1.5)), 450, 1400);

  return {
    code: `
class ShooterGame extends Phaser.Scene {
  constructor() {
    super({ key: 'ShooterGame' });
    this.score = 0;
    this.gameOver = false;
    this.enemySpeed = ${baseEnemySpeed};
  }

  preload() {
    this.cameras.main.setBackgroundColor('#${tuning.bgColor.toString(16)}');

    const g = this.add.graphics();
    ${human ? `
    g.fillStyle(0xffe0bd).fillCircle(16, 10, 10);
    g.fillStyle(${playerColor}).fillRoundedRect(6, 18, 20, 20, 6);
    g.fillStyle(0x000000).fillCircle(12, 8, 2).fillCircle(20, 8, 2);
    g.generateTexture('player', 32, 38);
    ` : `
    g.fillStyle(${playerColor}).fillRect(0, 0, 32, 32).generateTexture('player', 32, 32);
    `}
    this.add.graphics()
      .fillStyle(${enemyColor})
      .fillRect(0, 0, 24, 24)
      .generateTexture('enemy', 24, 24);
    
    this.add.graphics()
      .fillStyle(${bulletColor})
      .fillRect(0, 0, 8, 16)
      .generateTexture('bullet', 8, 16);
  }

  create() {
    this.enemySpeed = ${baseEnemySpeed};
    this.score = 0;
    this.gameOver = false;

    this.player = this.physics.add.sprite(400, 550, 'player');
    this.player.setCollideWorldBounds(true);

    this.bullets = this.physics.add.group();
    this.enemies = this.physics.add.group();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.input.keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.SPACE]);

    this.enemyTimer = this.time.addEvent({
      delay: ${spawnDelayMs},
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);

    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', color: '#111' });

    this.gameOverText = this.add.text(400, 300, '', { fontSize: '48px', color: '#e53935' }).setOrigin(0.5);

    this.input.keyboard.on('keydown-R', () => { if (this.scene && this.scene.restart) this.scene.restart(); });
    this.add.text(400, 560, 'Press R to restart', { fontSize: '14px', color: '#333' }).setOrigin(0.5);
  }

  update() {
    if (this.gameOver) return;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-220);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(220);
    } else {
      this.player.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.shoot();
    }

    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      if (this.scene && this.scene.restart) this.scene.restart();
    }

    this.bullets.children.entries.forEach(bullet => {
      if (bullet.y < 0) bullet.destroy();
    });

    this.enemies.children.entries.forEach(enemy => {
      if (enemy.y > 600) enemy.destroy();
    });
  }

  shoot() {
    const bullet = this.bullets.create(this.player.x, this.player.y - 20, 'bullet');
    bullet.setVelocityY(-Math.min(this.enemySpeed, 140));
  }

  spawnEnemy() {
    if (this.gameOver) return;
    const x = Phaser.Math.Between(50, 750);
    const enemy = this.enemies.create(x, 0, 'enemy');
    enemy.setVelocityY(Math.min(this.enemySpeed, 140));
    this.enemySpeed += 0.75;
  }

  hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
    this.score += 100;
    this.scoreText.setText('Score: ' + this.score);
  }

  hitPlayer() {
    this.endGame();
  }

  endGame() {
    this.gameOver = true;
    this.physics.pause();
    this.enemyTimer?.destroy();
    this.gameOverText.setText('Game Over!\\nScore: ' + this.score);
    this.game.events.emit('gameEnd', this.score);
  }
}`,
    assets: [
      { name: 'player', type: 'sprite', url: 'data:player' },
      { name: 'enemy', type: 'sprite', url: 'data:enemy' },
      { name: 'bullet', type: 'sprite', url: 'data:bullet' }
    ],
    config: {
      width: 800,
      height: 600,
      physics: true
    }
  };
}
