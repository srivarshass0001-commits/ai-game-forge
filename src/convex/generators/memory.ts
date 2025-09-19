import { analyzePrompt } from "../utils/promptAnalysis";

export function generateMemoryGame(prompt: string, parameters: any) {
  const tuning = analyzePrompt(prompt, parameters);
  const rows = 4;
  const cols = 4;
  const totalPairs = (rows * cols) / 2;
  const previewMs = 3000;
  const backColor = 0x2d2f36;

  const baseColors = [
    tuning.mainColor,
    0xff6b6b, 0x4a90e2, 0x2ecc71, 0xf1c40f,
    0x9b59b6, 0xe67e22, 0x1abc9c, 0xe84393, 0x00cec9
  ];

  return {
    code: `
class MemoryGame extends Phaser.Scene {
  constructor() {
    super({ key: 'MemoryGame' });
    this.rows = ${rows};
    this.cols = ${cols};
    this.cellW = 120;
    this.cellH = 140;
    this.offsetX = (800 - (this.cols * this.cellW)) / 2;
    this.offsetY = 80;
    this.firstPick = null;
    this.locked = true;
    this.matchedPairs = 0;
    this.moves = 0;
    this.cards = [];
    this.frontTextures = [];
  }

  preload() {
    this.cameras.main.setBackgroundColor('#${tuning.bgColor.toString(16)}');

    const back = this.add.graphics();
    back.fillStyle(${backColor}).fillRoundedRect(0, 0, 100, 120, 12);
    back.lineStyle(3, 0xffffff, 0.12).strokeRoundedRect(6, 6, 88, 108, 10);
    back.generateTexture('card_back', 100, 120);

    const colors = ${JSON.stringify(baseColors)};
    for (let i = 0; i < ${totalPairs}; i++) {
      const g = this.add.graphics();
      const col = colors[i % colors.length];
      g.fillStyle(col).fillRoundedRect(0, 0, 100, 120, 12);
      g.lineStyle(3, 0x000000, 0.08).strokeRoundedRect(0, 0, 100, 120, 12);

      g.fillStyle(0xffffff, 0.25).fillCircle(50, 45, 20);
      g.lineStyle(2, 0xffffff, 0.7).strokeCircle(50, 45, 20);

      const label = String.fromCharCode(65 + (i % 26));
      const text = this.add.text(50, 85, label, { fontSize: '36px', color: '#ffffff' }).setOrigin(0.5);
      g.generateTexture('card_front_' + i, 100, 120);
      text.destroy();
      g.destroy();
      this.frontTextures.push('card_front_' + i);
    }
  }

  create() {
    const deck = [];
    for (let i = 0; i < ${totalPairs}; i++) {
      deck.push(i, i);
    }
    Phaser.Utils.Array.Shuffle(deck);

    let k = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = this.offsetX + c * this.cellW + this.cellW / 2;
        const y = this.offsetY + r * this.cellH + this.cellH / 2;

        const pairIndex = deck[k++];
        const frontKey = 'card_front_' + pairIndex;

        const container = this.add.container(x, y);
        const front = this.add.image(0, 0, frontKey).setVisible(true);
        const back = this.add.image(0, 0, 'card_back').setVisible(false);
        container.add([back, front]);
        container.setSize(100, 120);
        container.setData('pairIndex', pairIndex);
        container.setData('frontKey', frontKey);
        container.setData('matched', false);
        container.setData('showingFront', true);
        container.setInteractive(new Phaser.Geom.Rectangle(-50, -60, 100, 120), Phaser.Geom.Rectangle.Contains);

        container.setScale(0.9);
        this.tweens.add({ targets: container, scale: 1, duration: 250, ease: 'back.out' });

        container.on('pointerdown', () => this.onCardClick(container));
        this.cards.push({ container, front, back });
      }
    }

    this.movesText = this.add.text(16, 16, 'Moves: 0', { fontSize: '24px', color: '#111' });
    this.statusText = this.add.text(400, 48, 'Preview...', { fontSize: '18px', color: '#333' }).setOrigin(0.5);
    this.gameOverText = this.add.text(400, 300, '', { fontSize: '48px', color: '#111' }).setOrigin(0.5);

    this.input.keyboard.on('keydown-R', () => { if (this.scene && this.scene.restart) this.scene.restart(); });
    this.add.text(400, 560, 'Press R to restart', { fontSize: '14px', color: '#333' }).setOrigin(0.5);

    this.time.delayedCall(${previewMs}, () => {
      this.flipAllDown(() => {
        this.locked = false;
        this.statusText.setText('Find all pairs!');
      });
    });
  }

  onCardClick(cardContainer) {
    if (this.locked) return;
    if (cardContainer.getData('matched')) return;
    if (cardContainer.getData('showingFront')) return;

    this.flipCard(cardContainer, true, () => {
      if (!this.firstPick) {
        this.firstPick = cardContainer;
      } else {
        this.locked = true;
        this.moves++;
        this.movesText.setText('Moves: ' + this.moves);

        const a = this.firstPick.getData('pairIndex');
        const b = cardContainer.getData('pairIndex');

        if (a === b) {
          this.firstPick.setData('matched', true);
          cardContainer.setData('matched', true);
          this.matchedPairs++;

          this.tweens.add({ targets: [this.firstPick, cardContainer], scale: 1.08, yoyo: true, duration: 140, ease: 'sine.inOut' });

          this.firstPick = null;
          this.locked = false;

          if (this.matchedPairs === ${totalPairs}) {
            this.endGame();
          }
        } else {
          this.time.delayedCall(650, () => {
            this.flipCard(this.firstPick, false);
            this.flipCard(cardContainer, false, () => {
              this.firstPick = null;
              this.locked = false;
            });
          });
        }
      }
    });
  }

  flipAllDown(onComplete) {
    let remaining = this.cards.length;
    this.cards.forEach(({ container }) => {
      if (!container.getData('matched') && container.getData('showingFront')) {
        this.flipCard(container, false, () => {
          remaining--;
          if (remaining === 0 && onComplete) onComplete();
        });
      } else {
        remaining--;
        if (remaining === 0 && onComplete) onComplete();
      }
    });
  }

  flipCard(container, toFront, onComplete) {
    const isFront = container.getData('showingFront');
    if (toFront === isFront) {
      if (onComplete) onComplete();
      return;
    }
    this.tweens.add({
      targets: container,
      scaleX: 0,
      duration: 110,
      ease: 'quad.in',
      onComplete: () => {
        const { front, back } = this.getCardSprites(container);
        front.setVisible(toFront);
        back.setVisible(!toFront);
        container.setData('showingFront', toFront);

        this.tweens.add({
          targets: container,
          scaleX: 1,
          duration: 110,
          ease: 'quad.out',
          onComplete: () => onComplete && onComplete()
        });
      }
    });
  }

  getCardSprites(container) {
    const children = container.list;
    let front = null, back = null;
    for (const child of children) {
      if (child.texture && child.texture.key.startsWith('card_front_')) front = child;
      if (child.texture && child.texture.key === 'card_back') back = child;
    }
    return { front, back };
  }

  endGame() {
    const base = 1000;
    const penalty = Math.max(0, (this.moves - ${totalPairs}) * 12);
    this.score = Math.max(100, base - penalty);
    this.statusText.setText('Completed!');
    this.gameOverText.setText('All pairs found!\\nScore: ' + this.score);
    this.game.events.emit('gameEnd', this.score);
    this.locked = true;
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
