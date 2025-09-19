import { analyzePrompt } from "../utils/promptAnalysis";
import { generateTicTacToeGame } from "./tictactoe";
import { generateMemoryGame } from "./memory";

export function generatePuzzleGame(prompt: string, parameters: any) {
  const p = prompt.toLowerCase();
  const isTicTacToe = p.includes("tic tac toe") || p.includes("tictactoe") || p.includes("tic-tac-toe") || p.includes("noughts and crosses") || p.includes("x and o") || p.includes("x&o");
  if (isTicTacToe) {
    return generateTicTacToeGame(prompt, parameters);
  }

  const isMemory = p.includes("memory") || p.includes("match") || p.includes("pairs") || p.includes("concentration");
  if (isMemory) {
    return generateMemoryGame(prompt, parameters);
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
    this.grid = [];
    this.tiles = [];
    
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

    this.shuffle();

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
    this.grid[this.emptyRow][this.emptyCol] = this.grid[row][col];
    this.grid[row][col] = 0;

    this.tiles[this.emptyRow][this.emptyCol].setTexture('tile' + this.grid[this.emptyRow][this.emptyCol]);
    this.tiles[this.emptyRow][this.emptyCol].setInteractive();
    this.tiles[this.emptyRow][this.emptyCol].on('pointerdown', () => this.moveTile(this.emptyRow, this.emptyCol));

    this.tiles[row][col].setTexture('empty');
    this.tiles[row][col].removeInteractive();

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
