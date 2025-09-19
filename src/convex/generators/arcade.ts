import { analyzePrompt, clamp } from "../utils/promptAnalysis";

export function generateArcadeGame(prompt: string, parameters: any) {
  const tuning = analyzePrompt(prompt, parameters);
  const paddleColor = tuning.mainColor;
  const ballColor = 0xffffff;
  const brickColor = 0xff6b6b;
  const ballSpeed = Math.round(180 * tuning.speedFactor * tuning.difficultyScale);
  const rows = clamp(Math.round(5 * tuning.densityFactor), 3, 8);
  const cols = clamp(Math.round(10 * clamp(tuning.densityFactor, 0.8, 1.4)), 7, 12);

  return {
    code: `
class ArcadeGame extends Phaser.Scene {
  constructor() {
    super({ key: 'ArcadeGame' });
  }

  preload() {
    this.cameras.main.setBackgroundColor('#${tuning.bgColor.toString(16)}');
    this.add.graphics()
      .fillStyle(${paddleColor})
      .fillRect(0, 0, 100, 20)
      .generateTexture('paddle', 100, 20);
    
    this.add.graphics()
      .fillStyle(${ballColor})
      .fillCircle(10, 10, 10)
      .generateTexture('ball', 20, 20);
    
    this.add.graphics()
      .fillStyle(${brickColor})
      .fillRect(0, 0, 75, 30)
      .generateTexture('brick', 75, 30);
  }

  create() {
    this.physics.world.gravity.y = 0;

    this.paddle = this.physics.add.sprite(400, 550, 'paddle');
    this.paddle.setImmovable(true);
    this.paddle.setCollideWorldBounds(true);

    this.ball = this.physics.add.sprite(400, 300, 'ball');
    this.ball.setVelocity(${ballSpeed} , -${ballSpeed});
    this.ball.setBounce(1, 1);
    this.ball.setCollideWorldBounds(true, 1, 1);

    this.ball.body.onWorldBounds = true;
    this.physics.world.on('worldbounds', (body) => {
      if (body.gameObject === this.ball && body.blocked.down) {
        this.endGame(false);
      }
    });

    this.bricks = this.physics.add.staticGroup();
    for (let row = 0; row < ${rows}; row++) {
      for (let col = 0; col < ${cols}; col++) {
        const x = 80 + col * 80;
        const y = 80 + row * 40;
        this.bricks.create(x, y, 'brick');
      }
    }

    this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);
    this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    ]);

    this.score = 0;
    this.gameOver = false;

    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', color: '#111' });

    this.gameOverText = this.add.text(400, 300, '', { fontSize: '48px', color: '#e53935' }).setOrigin(0.5);

    this.input.keyboard.on('keydown-R', () => { if (this.scene && this.scene.restart) this.scene.restart(); });
    this.add.text(400, 560, 'Press R to restart', { fontSize: '14px', color: '#333' }).setOrigin(0.5);
  }

  update() {
    if (this.gameOver) return;

    if (this.cursors.left.isDown) {
      this.paddle.setVelocityX(-300);
    } else if (this.cursors.right.isDown) {
      this.paddle.setVelocityX(300);
    } else {
      this.paddle.setVelocityX(0);
    }

    if (this.ball.y > 600) {
      this.endGame(false);
    }
  }

  hitPaddle(ball, paddle) {
    const diff = ball.x - paddle.x;
    ball.setVelocityY(-Math.abs(ball.body.velocity.y));
    ball.setVelocityX(diff * 5);
  }

  hitBrick(ball, brick) {
    brick.destroy();
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);

    const currentVel = ball.body.velocity;
    let speed = Math.sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
    speed += 5;
    const nx = currentVel.x / Math.max(speed - 5, 1);
    const ny = currentVel.y / Math.max(speed - 5, 1);
    ball.setVelocity(nx * speed, ny * speed);

    if (this.bricks.countActive() === 0) {
      this.endGame(true);
    }
  }

  endGame(won = false) {
    this.gameOver = true;
    this.physics.pause();
    if (won) {
      this.gameOverText.setText('You Win!\\nScore: ' + this.score);
    } else {
      this.gameOverText.setText('Game Over!\\nScore: ' + this.score);
    }
    this.game.events.emit('gameEnd', this.score);
  }
}`,
    assets: [
      { name: 'paddle', type: 'sprite', url: 'data:paddle' },
      { name: 'ball', type: 'sprite', url: 'data:ball' },
      { name: 'brick', type: 'sprite', url: 'data:brick' }
    ],
    config: {
      width: 800,
      height: 600,
      physics: true
    }
  };
}
