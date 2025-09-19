"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Add: prompt analysis utilities for deterministic, prompt-driven tuning
function hashPrompt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type ThemeKey = "space" | "fantasy" | "cyberpunk" | "nature" | "retro" | "default";

function pickThemeColor(theme: string): number {
  const t = theme.toLowerCase();
  if (t.includes("space")) return 0x4a90e2;      // blue
  if (t.includes("fantasy")) return 0x8e44ad;    // purple
  if (t.includes("cyber")) return 0x00ffff;      // cyan
  if (t.includes("nature") || t.includes("forest")) return 0x2ecc71;     // green
  if (t.includes("retro")) return 0xff6b6b;      // red
  // New creative themes
  if (t.includes("ocean")) return 0x1ca3ec;      // ocean blue
  if (t.includes("neon")) return 0x39ff14;       // bright neon green
  if (t.includes("candy")) return 0xff69b4;      // hot pink
  if (t.includes("sunset")) return 0xff8c00;     // deep orange
  if (t.includes("pastel")) return 0xa3c4f3;     // soft pastel blue
  return 0x4a90e2;
}

function pickBackgroundColor(theme: string): number {
  const t = theme.toLowerCase();
  if (t.includes("space")) return 0xe6f0ff;     // pale sky blue
  if (t.includes("fantasy")) return 0xf3e8ff;   // light lavender
  if (t.includes("cyber")) return 0xeaffff;     // soft cyan
  if (t.includes("nature") || t.includes("forest")) return 0xe8f5e9; // minty green
  if (t.includes("retro")) return 0xfff1f2;     // soft pink
  if (t.includes("ocean")) return 0xe0f7ff;     // sea foam
  if (t.includes("neon")) return 0xf7ffe0;      // lime wash
  if (t.includes("candy")) return 0xfff0f7;     // candy floss
  if (t.includes("sunset")) return 0xfff4e0;    // warm peach
  if (t.includes("pastel")) return 0xf7faff;    // pastel blue-white
  return 0xf9fafb; // default: near-white
}

function difficultyScaleOf(diff: string): number {
  const d = diff.toLowerCase();
  if (d === "easy") return 0.75;
  if (d === "medium") return 1.0;
  if (d === "hard") return 1.25;
  if (d === "expert") return 1.5;
  return 1.0;
}

// Add: allow analyzer overrides from an LLM classifier
function analyzePrompt(prompt: string, parameters: any) {
  const overrides = parameters?.__overrides ?? {};
  const h = hashPrompt(prompt);
  const pLower = prompt.toLowerCase();

  // Base factors from difficulty (allow override)
  let difficultyScale = overrides.difficultyScale ?? difficultyScaleOf(parameters?.difficulty ?? "medium");

  // Prompt hints
  if (!overrides.difficultyScale) {
    if (pLower.includes("brutal") || pLower.includes("insane") || pLower.includes("hard")) {
      difficultyScale *= 1.15;
    }
    if (pLower.includes("chill") || pLower.includes("casual") || pLower.includes("easy")) {
      difficultyScale *= 0.9;
    }
  }

  // Speed & density (allow override)
  let speedFactor =
    overrides.speedFactor ??
    (0.8 + ((h % 41) / 100)); // 0.8 - 1.21 range
  let densityFactor =
    overrides.densityFactor ??
    (0.8 + (((Math.floor(h / 7)) % 41) / 100));

  if (overrides.speedFactor == null) {
    if (pLower.includes("fast") || pLower.includes("speed") || pLower.includes("rapid")) speedFactor *= 1.15;
    if (pLower.includes("slow") || pLower.includes("relax")) speedFactor *= 0.9;
  }
  if (overrides.densityFactor == null) {
    if (pLower.includes("many") || pLower.includes("tons") || pLower.includes("swarm")) densityFactor *= 1.2;
    if (pLower.includes("few") || pLower.includes("minimal")) densityFactor *= 0.85;
  }

  speedFactor = clamp(speedFactor, 0.6, 1.6);
  densityFactor = clamp(densityFactor, 0.6, 1.6);

  // Theme from overrides -> parameters -> prompt
  const themeText = overrides.theme ?? parameters?.theme ?? "";
  const themeFromPrompt =
    themeText ||
    (pLower.includes("space") ? "space" :
     pLower.includes("forest") || pLower.includes("nature") ? "nature" :
     pLower.includes("retro") ? "retro" :
     pLower.includes("fantasy") ? "fantasy" :
     pLower.includes("cyber") ? "cyberpunk" : "");

  const mainColor = pickThemeColor(themeFromPrompt);
  const bgColor = pickBackgroundColor(themeFromPrompt);

  // Duration can map to level length/density slightly
  const duration = clamp(parameters?.duration ?? 5, 1, 15);
  const durationFactor = clamp(0.9 + (duration - 5) * 0.03, 0.7, 1.3);

  return {
    difficultyScale,
    speedFactor,
    densityFactor: clamp(densityFactor * durationFactor, 0.6, 1.8),
    mainColor,
    theme: themeFromPrompt || "default",
    bgColor,
  };
}

// Augment: consider overrides for human character request
function isHumanCharacterRequested(prompt: string, overrides?: { humanCharacter?: boolean }) {
  if (overrides && typeof overrides.humanCharacter === "boolean") return overrides.humanCharacter;
  const p = prompt.toLowerCase();
  return (
    p.includes("human") ||
    p.includes("boy") ||
    p.includes("girl") ||
    p.includes("man") ||
    p.includes("woman") ||
    p.includes("kid") ||
    p.includes("runner human") ||
    p.includes("person")
  );
}

/**
 * Temporarily disable external LLM parsing to ensure build stability.
 * Deterministic analyzer will be used instead. We can re-enable a robust parser later.
 */
async function llmAnalyzePrompt(
  prompt: string,
  parameters: any
): Promise<{
  gameType?: "runner" | "platformer" | "shooter" | "puzzle" | "arcade" | "tictactoe";
  humanCharacter?: boolean;
  theme?: string;
  speedFactor?: number;
  densityFactor?: number;
  difficultyScale?: number;
} | null> {
  return null;
}

// Mock AI game generation - in a real app, this would call OpenAI/Claude
export const generateGame = action({
  args: {
    prompt: v.string(),
    parameters: v.object({
      difficulty: v.string(),
      theme: v.string(),
      duration: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const p = args.prompt.toLowerCase();
    const isTicTacToe =
      p.includes("tic tac toe") ||
      p.includes("tictactoe") ||
      p.includes("tic-tac-toe") ||
      p.includes("noughts and crosses") ||
      p.includes("x and o") ||
      p.includes("x&o");

    if (isTicTacToe) {
      return generateTicTacToeGame(args.prompt, args.parameters);
    }

    // Add runner detection
    const isRunner =
      p.includes("runner") ||
      p.includes("endless runner") ||
      p.includes("running") ||
      p.includes("dash");

    if (isRunner) {
      return generateRunnerGame(args.prompt, args.parameters);
    }

    // Infer game type from keywords
    const keywords = {
      platformer: ["platform", "jump", "platformer"],
      shooter: ["shoot", "shooter", "laser", "bullet", "space invaders"],
      puzzle: ["puzzle", "slide", "logic", "match"],
      arcade: ["arcade", "brick", "breakout", "pong", "ball"],
    };

    const matches = (list: string[]) => list.some(k => p.includes(k));
    let generator = generateArcadeGame;
    if (matches(keywords.platformer)) generator = generatePlatformerGame;
    else if (matches(keywords.shooter)) generator = generateShooterGame;
    else if (matches(keywords.puzzle)) generator = generatePuzzleGame;

    const gameData = generator(args.prompt, args.parameters);
    return gameData;
  },
});

function generatePlatformerGame(prompt: string, parameters: any) {
  const tuning = analyzePrompt(prompt, parameters);
  const human = isHumanCharacterRequested(prompt);
  const playerColor = tuning.mainColor;           // player color
  const platformColor = 0x8b4513;                 // keep wood-like
  const coinColor = 0xffd700;                     // gold
  const coinRepeat = Math.max(6, Math.round(11 * tuning.densityFactor));
  const stepX = clamp(Math.round(70 / clamp(tuning.densityFactor, 0.7, 1.5)), 40, 100);
  const jumpVelocity = Math.round(-260 * tuning.difficultyScale); // higher magnitude = higher jump

  return {
    code: `
class PlatformerGame extends Phaser.Scene {
  constructor() {
    super({ key: 'PlatformerGame' });
    this.score = 0;
    this.gameOver = false;
  }

  preload() {
    // Light, theme-based background
    this.cameras.main.setBackgroundColor('#${tuning.bgColor.toString(16)}');

    // Player sprite (cartoon human if requested)
    const g = this.add.graphics();
    ${human ? `
    // Cartoon kid: head + body with cheerful colors
    g.fillStyle(0xffe0bd).fillCircle(16, 10, 10); // head (skin)
    g.fillStyle(${playerColor}).fillRoundedRect(4, 18, 24, 22, 6); // body
    g.fillStyle(0x000000).fillCircle(12, 8, 2).fillCircle(20, 8, 2); // eyes
    g.lineStyle(2, 0x000000).strokeCircle(16, 12, 1); // nose hint
    g.fillStyle(0xff6b6b).fillRoundedRect(10, 32, 12, 6, 3); // shoes
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

    // Gentle idle bob to feel lively on ground
    this.tweens.add({ targets: this.player, y: "-=2", duration: 600, yoyo: true, repeat: -1, ease: "sine.inOut" });

    // Create coins (density from prompt)
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

    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', color: '#111' });

    this.gameOverText = this.add.text(400, 300, '', { fontSize: '48px', color: '#e53935' }).setOrigin(0.5);

    // Restart key
    this.input.keyboard.on('keydown-R', () => { if (this.scene && this.scene.restart) this.scene.restart(); });
    this.add.text(400, 560, 'Press R to restart', { fontSize: '14px', color: '#333' }).setOrigin(0.5);
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
      this.player.setVelocityY(${jumpVelocity});
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

function generateShooterGame(prompt: string, parameters: any) {
  const tuning = analyzePrompt(prompt, parameters);
  const human = isHumanCharacterRequested(prompt);
  const playerColor = 0x00ff00;
  const enemyColor = tuning.mainColor;
  const bulletColor = 0xffff00;
  const baseEnemySpeed = Math.round(40 * tuning.speedFactor * tuning.difficultyScale + 30);
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
    // Cartoon kid spaceship pilot (stylized)
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
    this.player = this.physics.add.sprite(400, 550, 'player');
    this.player.setCollideWorldBounds(true);

    this.bullets = this.physics.add.group();
    this.enemies = this.physics.add.group();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
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

    this.bullets.children.entries.forEach(bullet => {
      if (bullet.y < 0) bullet.destroy();
    });

    this.enemies.children.entries.forEach(enemy => {
      if (enemy.y > 600) enemy.destroy();
    });
  }

  shoot() {
    const bullet = this.bullets.create(this.player.x, this.player.y - 20, 'bullet');
    bullet.setVelocityY(-450);
  }

  spawnEnemy() {
    if (this.gameOver) return;
    const x = Phaser.Math.Between(50, 750);
    const enemy = this.enemies.create(x, 0, 'enemy');
    enemy.setVelocityY(this.enemySpeed);
    this.enemySpeed += 2; // small ramp-up over time
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
  // Detect Tic Tac Toe from prompt keywords and route to a dedicated generator
  const p = prompt.toLowerCase();
  const isTicTacToe = p.includes("tic tac toe") || p.includes("tictactoe") || p.includes("tic-tac-toe") || p.includes("noughts and crosses") || p.includes("x and o") || p.includes("x&o");
  if (isTicTacToe) {
    return generateTicTacToeGame(prompt, parameters);
  }

  const tuning = analyzePrompt(prompt, parameters);
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
    this.cameras.main.setBackgroundColor('#${tuning.bgColor.toString(16)}');
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

// Add: Dedicated Tic Tac Toe generator with better mechanics and instructions
function generateTicTacToeGame(prompt: string, parameters: any) {
  const tuning = analyzePrompt(prompt, parameters);
  const accent = tuning.mainColor;

  return {
    code: `
class TicTacToeGame extends Phaser.Scene {
  constructor() {
    super({ key: 'TicTacToeGame' });
    this.grid = Array(3).fill(null).map(() => Array(3).fill(""));
    this.cellSize = 140;
    this.offsetX = 800 / 2 - (3 * this.cellSize) / 2;
    this.offsetY = 120;
    this.currentPlayer = "X"; // Player is X, computer is O
    this.gameOver = false;
    this.score = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#${tuning.bgColor.toString(16)}');

    this.add.text(400, 40, 'Tic Tac Toe', {
      fontSize: '36px',
      color: '#111'
    }).setOrigin(0.5);

    this.instructions = this.add.text(400, 80, 'Click a cell to place X. First to 3 in a row wins!', {
      fontSize: '16px',
      color: '#444'
    }).setOrigin(0.5);

    // Draw Grid
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(4, ${accent}, 1.0);
    // Vertical lines
    this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(this.offsetX + this.cellSize, this.offsetY, this.offsetX + this.cellSize, this.offsetY + 3 * this.cellSize));
    this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(this.offsetX + 2 * this.cellSize, this.offsetY, this.offsetX + 2 * this.cellSize, this.offsetY + 3 * this.cellSize));
    // Horizontal lines
    this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(this.offsetX, this.offsetY + this.cellSize, this.offsetX + 3 * this.cellSize, this.offsetY + this.cellSize));
    this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(this.offsetX, this.offsetY + 2 * this.cellSize, this.offsetX + 3 * this.cellSize, this.offsetY + 2 * this.cellSize));

    // Interactions
    this.input.on('pointerdown', (pointer) => {
      if (this.gameOver) return;
      const col = Math.floor((pointer.x - this.offsetX) / this.cellSize);
      const row = Math.floor((pointer.y - this.offsetY) / this.cellSize);
      if (row < 0 || row > 2 || col < 0 || col > 2) return;
      if (this.grid[row][col] !== "") return;

      this.placeMark(row, col, "X");
      const result = this.evaluateBoard();
      if (result.over) {
        this.finishGame(result);
        return;
      }

      // Computer move after brief delay
      this.time.delayedCall(300, () => {
        this.computerMove();
        const cresult = this.evaluateBoard();
        if (cresult.over) {
          this.finishGame(cresult);
        }
      });
    });

    this.drawMarks();
    this.statusText = this.add.text(400, 570, 'Your turn (X)', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.gameOverText = this.add.text(400, 320, '', {
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(2);

    // Soft restart hint
    this.add.text(400, 350, 'Press R to restart', { fontSize: '16px', color: '#cccccc' }).setOrigin(0.5).setDepth(2);
    this.input.keyboard.on('keydown-R', () => {
      if (this.scene && this.scene.restart) {
        this.scene.restart();
      }
    });
  }

  placeMark(row, col, mark) {
    this.grid[row][col] = mark;
    this.drawMarks();
    this.currentPlayer = (mark === "X") ? "O" : "X";
    this.statusText.setText(this.currentPlayer === "X" ? 'Your turn (X)' : "Computer's turn (O)");
  }

  drawMarks() {
    if (this.marks) {
      this.marks.forEach(m => m.destroy());
    }
    this.marks = [];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const val = this.grid[r][c];
        if (val !== "") {
          const x = this.offsetX + c * this.cellSize + this.cellSize / 2;
          const y = this.offsetY + r * this.cellSize + this.cellSize / 2;
          const text = this.add.text(x, y, val, {
            fontSize: '72px',
            color: val === 'X' ? '#ffffff' : '#ff6b6b'
          }).setOrigin(0.5);
          this.marks.push(text);
        }
      }
    }
  }

  // Simple computer AI: center -> corners -> sides -> otherwise first available
  computerMove() {
    if (this.gameOver) return;
    // Available cells
    const empty = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (this.grid[r][c] === "") empty.push([r, c]);
      }
    }
    if (empty.length === 0) return;

    // Preferred order
    const order = [
      [1,1], // center
      [0,0],[0,2],[2,0],[2,2], // corners
      [0,1],[1,0],[1,2],[2,1]  // edges
    ];
    let choice = null;
    for (const [r, c] of order) {
      if (this.grid[r][c] === "") { choice = [r, c]; break; }
    }
    if (!choice) choice = empty[0];

    this.placeMark(choice[0], choice[1], "O");
  }

  evaluateBoard() {
    const lines = [
      // rows
      [[0,0],[0,1],[0,2]],
      [[1,0],[1,1],[1,2]],
      [[2,0],[2,1],[2,2]],
      // cols
      [[0,0],[1,0],[2,0]],
      [[0,1],[1,1],[2,1]],
      [[0,2],[1,2],[2,2]],
      // diags
      [[0,0],[1,1],[2,2]],
      [[0,2],[1,1],[2,0]],
    ];

    for (const line of lines) {
      const [a,b,c] = line;
      const v1 = this.grid[a[0]][a[1]];
      const v2 = this.grid[b[0]][b[1]];
      const v3 = this.grid[c[0]][c[1]];
      if (v1 && v1 === v2 && v2 === v3) {
        return { over: true, winner: v1 };
      }
    }

    // Draw?
    const anyEmpty = this.grid.some(row => row.some(cell => cell === ""));
    if (!anyEmpty) return { over: true, winner: null };

    return { over: false };
  }

  finishGame(result) {
    this.gameOver = true;
    if (result.winner === "X") {
      this.score = 1000;
      this.gameOverText.setText('You Win!\\nScore: ' + this.score);
    } else if (result.winner === "O") {
      this.score = 100;
      this.gameOverText.setText('You Lose!\\nScore: ' + this.score);
    } else {
      this.score = 500;
      this.gameOverText.setText('Draw!\\nScore: ' + this.score);
    }
    this.game.events.emit('gameEnd', this.score);
  }
}
`,
    assets: [],
    config: {
      width: 800,
      height: 600,
      physics: false
    }
  };
}

function generateArcadeGame(prompt: string, parameters: any) {
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
    this.score = 0;
    this.gameOver = false;
    this.ballSpeed = ${ballSpeed};
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
    this.paddle = this.physics.add.sprite(400, 550, 'paddle');
    this.paddle.setImmovable(true);
    this.paddle.setCollideWorldBounds(true);

    this.ball = this.physics.add.sprite(400, 300, 'ball');
    this.ball.setVelocity(this.ballSpeed, -this.ballSpeed);
    this.ball.setBounce(1);
    this.ball.setCollideWorldBounds(true);

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
  }

  hitPaddle(ball, paddle) {
    const diff = ball.x - paddle.x;
    ball.setVelocityX(diff * 5);
  }

  hitBrick(ball, brick) {
    brick.destroy();
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);

    this.ballSpeed += 5;
    const currentVel = ball.body.velocity;
    const magnitude = Math.sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
    ball.setVelocity(
      (currentVel.x / magnitude) * this.ballSpeed,
      (currentVel.y / magnitude) * this.ballSpeed
    );

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

// Add a new Runner generator
function generateRunnerGame(prompt: string, parameters: any) {
  const tuning = analyzePrompt(prompt, parameters);
  const human = isHumanCharacterRequested(prompt) || true; // runner defaults to human kid unless specified otherwise
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

    // Ground
    this.add.graphics().fillStyle(${groundColor}).fillRect(0,0,800,40).generateTexture('ground',800,40);

    // Player (cartoon kid) with two running frames
    const g1 = this.add.graphics();
    ${human ? `
    // Frame 1
    g1.clear();
    g1.fillStyle(0xffe0bd).fillCircle(20, 12, 12); // head
    g1.fillStyle(${playerColor}).fillRoundedRect(8, 24, 24, 26, 6); // body
    g1.fillStyle(0x000000).fillCircle(16, 10, 2).fillCircle(24, 10, 2); // eyes
    // legs (pose A)
    g1.fillStyle(0x333333).fillRoundedRect(10, 48, 7, 8, 2); // left foot
    g1.fillStyle(0x333333).fillRoundedRect(23, 44, 7, 8, 2); // right foot up
    g1.generateTexture('runner1', 40, 56);

    // Frame 2
    const g2 = this.add.graphics();
    g2.clear();
    g2.fillStyle(0xffe0bd).fillCircle(20, 12, 12); // head
    g2.fillStyle(${playerColor}).fillRoundedRect(8, 24, 24, 26, 6); // body
    g2.fillStyle(0x000000).fillCircle(16, 10, 2).fillCircle(24, 10, 2); // eyes
    // legs (pose B)
    g2.fillStyle(0x333333).fillRoundedRect(10, 44, 7, 8, 2); // left foot up
    g2.fillStyle(0x333333).fillRoundedRect(23, 48, 7, 8, 2); // right foot
    g2.generateTexture('runner2', 40, 56);
    ` : `
    g1.fillStyle(${playerColor}).fillRect(0,0,40,40).generateTexture('runner1',40,40);
    const g2 = this.add.graphics();
    g2.fillStyle(${playerColor}).fillRect(0,0,40,40).generateTexture('runner2',40,40);
    `}

    // Obstacles: stick, cone, crate, barrel
    // Stick
    const s = this.add.graphics();
    s.fillStyle(0x5a3e2b).fillRect(0,0,12,48);
    s.generateTexture('ob_stick',12,48);

    // Traffic cone (triangle)
    const c = this.add.graphics();
    c.fillStyle(0xff7f11);
    c.beginPath();
    c.moveTo(18,0); c.lineTo(36,50); c.lineTo(0,50); c.closePath(); c.fillPath();
    c.generateTexture('ob_cone',36,50);

    // Crate
    const cr = this.add.graphics();
    cr.fillStyle(0x8b4513).fillRoundedRect(0,0,42,42,6).lineStyle(2,0x5e3210).strokeRoundedRect(0,0,42,42,6);
    cr.generateTexture('ob_crate',42,42);

    // Barrel (circle)
    const b = this.add.graphics();
    b.fillStyle(0x7f8c8d).fillCircle(20,20,20);
    b.lineStyle(2,0x546e7a).strokeCircle(20,20,20);
    b.generateTexture('ob_barrel',40,40);
  }

  create() {
    this.physics.world.gravity.y = ${gravityY};

    // Ground setup (static)
    this.ground = this.physics.add.staticSprite(400, 560, 'ground');
    this.ground.setDepth(1);

    // Player
    this.player = this.physics.add.sprite(120, 500, 'runner1');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(2);
    this.player.body.setSize(24, 36).setOffset(8, 14);

    this.physics.add.collider(this.player, this.ground);

    // Groups
    this.obstacles = this.physics.add.group();
    this.physics.add.collider(this.obstacles, this.ground);
    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Spawner
    this.spawnTimer = this.time.addEvent({
      delay: ${spawnMs},
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true
    });

    // UI
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', color: '#111' });
    this.add.text(400, 60, 'Press UP or SPACE to jump', { fontSize: '16px', color: '#333' }).setOrigin(0.5);
    this.gameOverText = this.add.text(400, 300, '', { fontSize: '56px', color: '#e53935' }).setOrigin(0.5).setDepth(3);

    // Restart hint
    this.input.keyboard.on('keydown-R', () => { if (this.scene && this.scene.restart) this.scene.restart(); });
    this.add.text(400, 560, 'Press R to restart', { fontSize: '14px', color: '#333' }).setOrigin(0.5);
  }

  update(time, delta) {
    if (this.gameOver) return;

    // Jump only when grounded and a key was pressed
    const grounded = this.player.body.blocked.down || this.player.body.onFloor?.();
    if ((Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) && grounded) {
      this.player.setVelocityY(-520);
    }

    // Update obstacles: constant left velocity
    this.obstacles.children.iterate(ob => {
      if (!ob) return;
      if (ob.x < -80) ob.destroy();
    });

    // Score over time
    this.score += Math.max(1, Math.floor(delta / 16));
    this.scoreText.setText('Score: ' + this.score);

    // Slight difficulty ramp
    if (time % 2000 < delta) this.speed += 4;

    // Simple running animation while grounded; hold pose in air
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

    // Randomize obstacle type
    const types = ['ob_stick', 'ob_cone', 'ob_crate', 'ob_barrel'];
    const key = Phaser.Utils.Array.GetRandom(types);

    // Create obstacle offscreen at ground level; no gravity, constant velocity
    const obstacle = this.obstacles.create(840, 0, key);
    obstacle.setDepth(2);
    obstacle.setImmovable(true);
    obstacle.body.setAllowGravity(false);

    // Position so bottom rests on floor (floor y = 540 because ground is 40px tall at y=560 center)
    const displayH = obstacle.displayHeight || obstacle.height || 40;
    obstacle.setY(540 - displayH / 2);

    // Immediate leftward motion
    obstacle.setVelocityX(-this.speed);

    // Slight random scale for variety (clamped)
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