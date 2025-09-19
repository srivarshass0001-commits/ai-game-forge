"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Mock AI game generation - in a real app, this would call OpenAI/Claude
export const generateGame = action({
  args: {
    prompt: v.string(),
    parameters: v.object({
      genre: v.string(),
      difficulty: v.string(),
      theme: v.string(),
      duration: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate game based on parameters
    const gameTemplates = {
      platformer: generatePlatformerGame,
      shooter: generateShooterGame,
      puzzle: generatePuzzleGame,
      arcade: generateArcadeGame,
    };

    const generator = gameTemplates[args.parameters.genre as keyof typeof gameTemplates] || generateArcadeGame;
    const gameData = generator(args.prompt, args.parameters);

    return gameData;
  },
});

function generatePlatformerGame(prompt: string, parameters: any) {
  return {
    code: `
class PlatformerGame extends Phaser.Scene {
  constructor() {
    super({ key: 'PlatformerGame' });
    this.score = 0;
    this.gameOver = false;
  }

  preload() {
    // Create colored rectangles as sprites
    this.add.graphics()
      .fillStyle(0x4A90E2)
      .fillRect(0, 0, 32, 32)
      .generateTexture('player', 32, 32);
    
    this.add.graphics()
      .fillStyle(0x8B4513)
      .fillRect(0, 0, 64, 32)
      .generateTexture('platform', 64, 32);
    
    this.add.graphics()
      .fillStyle(0xFFD700)
      .fillCircle(16, 16, 16)
      .generateTexture('coin', 32, 32);
  }

  create() {
    // Create platforms
    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(400, 568, 'platform').setScale(12.5, 1).refreshBody();
    this.platforms.create(600, 400, 'platform');
    this.platforms.create(50, 250, 'platform');
    this.platforms.create(750, 220, 'platform');

    // Create player
    this.player = this.physics.add.sprite(100, 450, 'player');
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.platforms);

    // Create coins
    this.coins = this.physics.add.group({
      key: 'coin',
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 70 }
    });

    this.coins.children.entries.forEach(child => {
      child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });

    this.physics.add.collider(this.coins, this.platforms);
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Score text
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '32px',
      color: '#000'
    });

    // Game over text
    this.gameOverText = this.add.text(400, 300, '', {
      fontSize: '64px',
      color: '#ff0000'
    }).setOrigin(0.5);
  }

  update() {
    if (this.gameOver) return;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.cursors.up.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-330);
    }

    // Check if player fell off the world
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
    
    if (won) {
      this.gameOverText.setText('You Win!\\nScore: ' + this.score);
    } else {
      this.gameOverText.setText('Game Over!\\nScore: ' + this.score);
    }

    // Emit score for leaderboard
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

function generateShooterGame(prompt: string, parameters: any) {
  return {
    code: `
class ShooterGame extends Phaser.Scene {
  constructor() {
    super({ key: 'ShooterGame' });
    this.score = 0;
    this.gameOver = false;
    this.enemySpeed = 50;
  }

  preload() {
    this.add.graphics()
      .fillStyle(0x00FF00)
      .fillRect(0, 0, 32, 32)
      .generateTexture('player', 32, 32);
    
    this.add.graphics()
      .fillStyle(0xFF0000)
      .fillRect(0, 0, 24, 24)
      .generateTexture('enemy', 24, 24);
    
    this.add.graphics()
      .fillStyle(0xFFFF00)
      .fillRect(0, 0, 8, 16)
      .generateTexture('bullet', 8, 16);
  }

  create() {
    // Create player
    this.player = this.physics.add.sprite(400, 550, 'player');
    this.player.setCollideWorldBounds(true);

    // Create groups
    this.bullets = this.physics.add.group();
    this.enemies = this.physics.add.group();

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Spawn enemies
    this.enemyTimer = this.time.addEvent({
      delay: 1000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    // Collisions
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);

    // Score text
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '32px',
      color: '#fff'
    });

    // Game over text
    this.gameOverText = this.add.text(400, 300, '', {
      fontSize: '64px',
      color: '#ff0000'
    }).setOrigin(0.5);
  }

  update() {
    if (this.gameOver) return;

    // Player movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-200);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(200);
    } else {
      this.player.setVelocityX(0);
    }

    // Shooting
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.shoot();
    }

    // Clean up bullets
    this.bullets.children.entries.forEach(bullet => {
      if (bullet.y < 0) {
        bullet.destroy();
      }
    });

    // Clean up enemies
    this.enemies.children.entries.forEach(enemy => {
      if (enemy.y > 600) {
        enemy.destroy();
      }
    });
  }

  shoot() {
    const bullet = this.bullets.create(this.player.x, this.player.y - 20, 'bullet');
    bullet.setVelocityY(-400);
  }

  spawnEnemy() {
    if (this.gameOver) return;
    
    const x = Phaser.Math.Between(50, 750);
    const enemy = this.enemies.create(x, 0, 'enemy');
    enemy.setVelocityY(this.enemySpeed);
    
    // Increase difficulty over time
    this.enemySpeed += 2;
  }

  hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
    this.score += 100;
    this.scoreText.setText('Score: ' + this.score);
  }

  hitPlayer(player, enemy) {
    this.endGame();
  }

  endGame() {
    this.gameOver = true;
    this.physics.pause();
    this.enemyTimer.destroy();
    
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

function generatePuzzleGame(prompt: string, parameters: any) {
  return {
    code: `
class PuzzleGame extends Phaser.Scene {
  constructor() {
    super({ key: 'PuzzleGame' });
    this.score = 0;
    this.moves = 0;
    this.gameOver = false;
    this.gridSize = 4;
    this.tileSize = 100;
  }

  preload() {
    // Create numbered tiles
    for (let i = 1; i <= 15; i++) {
      this.add.graphics()
        .fillStyle(0x4A90E2)
        .fillRoundedRect(0, 0, 90, 90, 10)
        .lineStyle(2, 0x2171b5)
        .strokeRoundedRect(0, 0, 90, 90, 10)
        .generateTexture('tile' + i, 90, 90);
      
      this.add.text(45, 45, i.toString(), {
        fontSize: '32px',
        color: '#fff'
      }).setOrigin(0.5);
    }

    this.add.graphics()
      .fillStyle(0x333333)
      .fillRoundedRect(0, 0, 90, 90, 10)
      .generateTexture('empty', 90, 90);
  }

  create() {
    // Initialize puzzle grid
    this.grid = [];
    this.tiles = [];
    
    // Create solved state first
    for (let row = 0; row < this.gridSize; row++) {
      this.grid[row] = [];
      this.tiles[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const value = row * this.gridSize + col + 1;
        this.grid[row][col] = value <= 15 ? value : 0;
        
        const x = 200 + col * this.tileSize;
        const y = 100 + row * this.tileSize;
        
        if (this.grid[row][col] === 0) {
          this.tiles[row][col] = this.add.image(x, y, 'empty');
          this.emptyRow = row;
          this.emptyCol = col;
        } else {
          this.tiles[row][col] = this.add.image(x, y, 'tile' + this.grid[row][col]);
          this.tiles[row][col].setInteractive();
          this.tiles[row][col].on('pointerdown', () => this.moveTile(row, col));
        }
      }
    }

    // Shuffle the puzzle
    this.shuffle();

    // UI
    this.scoreText = this.add.text(16, 16, 'Moves: 0', {
      fontSize: '32px',
      color: '#000'
    });

    this.gameOverText = this.add.text(400, 550, '', {
      fontSize: '48px',
      color: '#00ff00'
    }).setOrigin(0.5);
  }

  shuffle() {
    // Perform random valid moves to shuffle
    for (let i = 0; i < 1000; i++) {
      const directions = [];
      if (this.emptyRow > 0) directions.push([-1, 0]);
      if (this.emptyRow < 3) directions.push([1, 0]);
      if (this.emptyCol > 0) directions.push([0, -1]);
      if (this.emptyCol < 3) directions.push([0, 1]);
      
      const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
      this.swapWithEmpty(this.emptyRow + dr, this.emptyCol + dc, false);
    }
    this.moves = 0;
  }

  moveTile(row, col) {
    if (this.gameOver) return;
    
    // Check if tile is adjacent to empty space
    const rowDiff = Math.abs(row - this.emptyRow);
    const colDiff = Math.abs(col - this.emptyCol);
    
    if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
      this.swapWithEmpty(row, col, true);
      
      if (this.checkWin()) {
        this.endGame();
      }
    }
  }

  swapWithEmpty(row, col, countMove = true) {
    // Swap values
    this.grid[this.emptyRow][this.emptyCol] = this.grid[row][col];
    this.grid[row][col] = 0;

    // Update tile textures
    this.tiles[this.emptyRow][this.emptyCol].setTexture('tile' + this.grid[this.emptyRow][this.emptyCol]);
    this.tiles[this.emptyRow][this.emptyCol].setInteractive();
    this.tiles[this.emptyRow][this.emptyCol].on('pointerdown', () => this.moveTile(this.emptyRow, this.emptyCol));

    this.tiles[row][col].setTexture('empty');
    this.tiles[row][col].removeInteractive();

    // Update empty position
    this.emptyRow = row;
    this.emptyCol = col;

    if (countMove) {
      this.moves++;
      this.scoreText.setText('Moves: ' + this.moves);
    }
  }

  checkWin() {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const expectedValue = row * this.gridSize + col + 1;
        if (row === 3 && col === 3) {
          if (this.grid[row][col] !== 0) return false;
        } else {
          if (this.grid[row][col] !== expectedValue) return false;
        }
      }
    }
    return true;
  }

  endGame() {
    this.gameOver = true;
    this.score = Math.max(1000 - this.moves * 10, 100);
    this.gameOverText.setText('Puzzle Solved!\\nScore: ' + this.score);
    this.game.events.emit('gameEnd', this.score);
  }
}`,
    assets: [],
    config: {
      width: 800,
      height: 600,
      physics: false
    }
  };
}

function generateArcadeGame(prompt: string, parameters: any) {
  return {
    code: `
class ArcadeGame extends Phaser.Scene {
  constructor() {
    super({ key: 'ArcadeGame' });
    this.score = 0;
    this.gameOver = false;
    this.ballSpeed = 200;
  }

  preload() {
    this.add.graphics()
      .fillStyle(0x4A90E2)
      .fillRect(0, 0, 100, 20)
      .generateTexture('paddle', 100, 20);
    
    this.add.graphics()
      .fillStyle(0xFFFFFF)
      .fillCircle(10, 10, 10)
      .generateTexture('ball', 20, 20);
    
    this.add.graphics()
      .fillStyle(0xFF6B6B)
      .fillRect(0, 0, 75, 30)
      .generateTexture('brick', 75, 30);
  }

  create() {
    // Create paddle
    this.paddle = this.physics.add.sprite(400, 550, 'paddle');
    this.paddle.setImmovable(true);
    this.paddle.setCollideWorldBounds(true);

    // Create ball
    this.ball = this.physics.add.sprite(400, 300, 'ball');
    this.ball.setVelocity(this.ballSpeed, -this.ballSpeed);
    this.ball.setBounce(1);
    this.ball.setCollideWorldBounds(true);

    // Create bricks
    this.bricks = this.physics.add.staticGroup();
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        const x = 80 + col * 80;
        const y = 80 + row * 40;
        this.bricks.create(x, y, 'brick');
      }
    }

    // Collisions
    this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);
    this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Score text
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '32px',
      color: '#fff'
    });

    // Game over text
    this.gameOverText = this.add.text(400, 300, '', {
      fontSize: '64px',
      color: '#ff0000'
    }).setOrigin(0.5);

    // Ball out of bounds
    this.ball.body.onWorldBounds = true;
    this.physics.world.on('worldbounds', (event, body) => {
      if (body.gameObject === this.ball && event.down) {
        this.endGame();
      }
    });
  }

  update() {
    if (this.gameOver) return;

    // Paddle movement
    if (this.cursors.left.isDown) {
      this.paddle.setVelocityX(-300);
    } else if (this.cursors.right.isDown) {
      this.paddle.setVelocityX(300);
    } else {
      this.paddle.setVelocityX(0);
    }
  }

  hitPaddle(ball, paddle) {
    // Add some randomness to ball direction
    const diff = ball.x - paddle.x;
    ball.setVelocityX(diff * 5);
  }

  hitBrick(ball, brick) {
    brick.destroy();
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);

    // Increase ball speed slightly
    this.ballSpeed += 5;
    const currentVel = ball.body.velocity;
    const magnitude = Math.sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
    ball.setVelocity(
      (currentVel.x / magnitude) * this.ballSpeed,
      (currentVel.y / magnitude) * this.ballSpeed
    );

    // Check win condition
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
