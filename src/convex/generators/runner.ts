import { analyzePrompt, clamp, isHumanCharacterRequested } from "../utils/promptAnalysis";

export function generateRunnerGame(prompt: string, parameters: any) {
  const tuning = analyzePrompt(prompt, parameters);
  const human = isHumanCharacterRequested(prompt) || true;
  const playerColor = tuning.mainColor;
  const groundColor = 0x8b5a2b;
  const bgColor = tuning.bgColor;
  const baseSpeed = Math.round(260 * tuning.speedFactor * tuning.difficultyScale);
  const gravityY = 1000;
  const spawnMs = clamp(Math.round(1100 / clamp(tuning.densityFactor, 0.8, 1.6)), 450, 1400);

  return {
    code: `
class RunnerGame extends Phaser.Scene {
  constructor() {
    super({ key: 'RunnerGame' });
    this.score = 0;
    this.gameOver = false;
    this.speed = ${baseSpeed};
    this.runFrame = 0;
    this.runElapsed = 0;
  }

  preload() {
    this.cameras.main.setBackgroundColor('#${bgColor.toString(16)}');

    this.add.graphics().fillStyle(${groundColor}).fillRect(0,0,800,40).generateTexture('ground',800,40);

    const g1 = this.add.graphics();
    ${human ? `
    g1.clear();
    g1.fillStyle(0xffe0bd).fillCircle(20, 12, 12);
    g1.fillStyle(${playerColor}).fillRoundedRect(8, 24, 24, 26, 6);
    g1.fillStyle(0x000000).fillCircle(16, 10, 2).fillCircle(24, 10, 2);
    g1.fillStyle(0x333333).fillRoundedRect(10, 48, 7, 8, 2);
    g1.fillStyle(0x333333).fillRoundedRect(23, 44, 7, 8, 2);
    g1.generateTexture('runner1', 40, 56);

    const g2 = this.add.graphics();
    g2.clear();
    g2.fillStyle(0xffe0bd).fillCircle(20, 12, 12);
    g2.fillStyle(${playerColor}).fillRoundedRect(8, 24, 24, 26, 6);
    g2.fillStyle(0x000000).fillCircle(16, 10, 2).fillCircle(24, 10, 2);
    g2.fillStyle(0x333333).fillRoundedRect(10, 44, 7, 8, 2);
    g2.fillStyle(0x333333).fillRoundedRect(23, 48, 7, 8, 2);
    g2.generateTexture('runner2', 40, 56);
    ` : `
    g1.fillStyle(${playerColor}).fillRect(0,0,40,40).generateTexture('runner1',40,40);
    const g2 = this.add.graphics();
    g2.fillStyle(${playerColor}).fillRect(0,0,40,40).generateTexture('runner2',40,40);
    `}

    const s = this.add.graphics();
    s.fillStyle(0x5a3e2b).fillRect(0,0,12,48);
    s.generateTexture('ob_stick',12,48);

    const c = this.add.graphics();
    c.fillStyle(0xff7f11);
    c.beginPath();
    c.moveTo(18,0); c.lineTo(36,50); c.lineTo(0,50); c.closePath(); c.fillPath();
    c.generateTexture('ob_cone',36,50);

    const cr = this.add.graphics();
    cr.fillStyle(0x8b4513).fillRoundedRect(0,0,42,42,6).lineStyle(2,0x5e3210).strokeRoundedRect(0,0,42,42,6);
    cr.generateTexture('ob_crate',42,42);

    const b = this.add.graphics();
    b.fillStyle(0x7f8c8d).fillCircle(20,20,20);
    b.lineStyle(2,0x546e7a).strokeCircle(20,20,20);
    b.generateTexture('ob_barrel',40,40);
  }

  create() {
    this.physics.world.gravity.y = ${gravityY};

    this.ground = this.physics.add.staticSprite(400, 560, 'ground');
    this.ground.setDepth(1);

    this.player = this.physics.add.sprite(120, 500, 'runner1');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(2);
    this.player.body.setSize(24, 36).setOffset(8, 14);

    this.physics.add.collider(this.player, this.ground);

    this.obstacles = this.physics.add.group();
    this.physics.add.collider(this.obstacles, this.ground);
    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.spawnTimer = this.time.addEvent({
      delay: ${spawnMs},
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true
    });

    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', color: '#111' });
    this.add.text(400, 60, 'Press UP or SPACE to jump', { fontSize: '16px', color: '#333' }).setOrigin(0.5);
    this.gameOverText = this.add.text(400, 300, '', { fontSize: '56px', color: '#e53935' }).setOrigin(0.5).setDepth(3);

    this.input.keyboard.on('keydown-R', () => { if (this.scene && this.scene.restart) this.scene.restart(); });
    this.add.text(400, 560, 'Press R to restart', { fontSize: '14px', color: '#333' }).setOrigin(0.5);
  }

  update(time, delta) {
    if (this.gameOver) return;

    const grounded = this.player.body.blocked.down || this.player.body.onFloor?.();
    if ((Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) && grounded) {
      this.player.setVelocityY(-520);
    }

    this.obstacles.children.iterate(ob => {
      if (!ob) return;
      if (ob.x < -80) ob.destroy();
    });

    this.score += Math.max(1, Math.floor(delta / 16));
    this.scoreText.setText('Score: ' + this.score);

    if (time % 2000 < delta) this.speed += 4;

    if (grounded) {
      this.runElapsed += delta;
      if (this.runElapsed >= 120) {
        this.runElapsed = 0;
        this.runFrame = (this.runFrame + 1) % 2;
        this.player.setTexture(this.runFrame === 0 ? 'runner1' : 'runner2');
      }
    }
  }

  spawnObstacle() {
    if (this.gameOver) return;

    const types = ['ob_stick', 'ob_cone', 'ob_crate', 'ob_barrel'];
    const key = Phaser.Utils.Array.GetRandom(types);

    const obstacle = this.obstacles.create(840, 0, key);
    obstacle.setDepth(2);
    obstacle.setImmovable(true);
    obstacle.body.setAllowGravity(false);

    const displayH = obstacle.displayHeight || obstacle.height || 40;
    obstacle.setY(540 - displayH / 2);

    obstacle.setVelocityX(-this.speed);

    const scale = Phaser.Math.Clamp(Phaser.Math.FloatBetween(0.9, 1.2), 0.85, 1.3);
    obstacle.setScale(scale);
    obstacle.refreshBody();
  }

  hitObstacle() {
    this.endGame();
  }

  endGame() {
    this.gameOver = true;
    this.physics.pause();
    this.spawnTimer.destroy();
    this.gameOverText.setText('Game Over!\\nScore: ' + this.score);
    this.game.events.emit('gameEnd', this.score);
  }
}
`,
    assets: [
      { name: 'runner1', type: 'sprite', url: 'data:runner1' },
      { name: 'runner2', type: 'sprite', url: 'data:runner2' },
      { name: 'ground', type: 'sprite', url: 'data:ground' },
      { name: 'ob_stick', type: 'sprite', url: 'data:ob_stick' },
      { name: 'ob_cone', type: 'sprite', url: 'data:ob_cone' },
      { name: 'ob_crate', type: 'sprite', url: 'data:ob_crate' },
      { name: 'ob_barrel', type: 'sprite', url: 'data:ob_barrel' },
    ],
    config: {
      width: 800,
      height: 600,
      physics: true,
    },
  };
}
