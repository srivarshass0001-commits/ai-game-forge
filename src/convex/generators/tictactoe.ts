import { analyzePrompt } from "../utils/promptAnalysis";

export function generateTicTacToeGame(prompt: string, parameters: any) {
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
    this.currentPlayer = "X";
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

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(4, ${accent}, 1.0);
    this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(this.offsetX + this.cellSize, this.offsetY, this.offsetX + this.cellSize, this.offsetY + 3 * this.cellSize));
    this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(this.offsetX + 2 * this.cellSize, this.offsetY, this.offsetX + 2 * this.cellSize, this.offsetY + 3 * this.cellSize));
    this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(this.offsetX, this.offsetY + this.cellSize, this.offsetX + 3 * this.cellSize, this.offsetY + this.cellSize));
    this.gridGraphics.strokeLineShape(new Phaser.Geom.Line(this.offsetX, this.offsetY + 2 * this.cellSize, this.offsetX + 3 * this.cellSize, this.offsetY + 2 * this.cellSize));

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

  computerMove() {
    if (this.gameOver) return;
    const empty = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (this.grid[r][c] === "") empty.push([r, c]);
      }
    }
    if (empty.length === 0) return;

    const order = [
      [1,1],
      [0,0],[0,2],[2,0],[2,2],
      [0,1],[1,0],[1,2],[2,1]
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
      [[0,0],[0,1],[0,2]],
      [[1,0],[1,1],[1,2]],
      [[2,0],[2,1],[2,2]],
      [[0,0],[1,0],[2,0]],
      [[0,1],[1,1],[2,1]],
      [[0,2],[1,2],[2,2]],
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
