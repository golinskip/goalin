import type PhaserNamespace from 'phaser';

const GAME_WIDTH = 600;
const GAME_HEIGHT = 400;
const GRID_COLS = 3;
const GRID_ROWS = 3;
const GRID_GAP = 4;
const CELL_WIDTH = (GAME_WIDTH - GRID_GAP * (GRID_COLS + 1)) / GRID_COLS;
const CELL_HEIGHT = (GAME_HEIGHT - GRID_GAP * (GRID_ROWS + 1)) / GRID_ROWS;

const COLOR_IDLE = 0x475569;
const COLOR_WAITING = 0x22c55e;
const COLOR_TARGET = 0xef4444;
const COLOR_RESULT = 0x3b82f6;
const COLOR_WARN = 0xf59e0b;

export type ReflexMountOptions = {
    onResult: (ms: number) => void;
};

export type GameDestroyer = () => void;

function createReflexScene(Phaser: typeof PhaserNamespace, onResult: (ms: number) => void): PhaserNamespace.Scene {
    return new (class extends Phaser.Scene {
        private cells: PhaserNamespace.GameObjects.Rectangle[] = [];
        private message!: PhaserNamespace.GameObjects.Text;
        private state: 'idle' | 'waiting' | 'ready' | 'clicked' | 'tooEarly' | 'wrongCell' = 'idle';
        private startTime = 0;
        private targetIndex = -1;
        private changeTimer?: PhaserNamespace.Time.TimerEvent;

        constructor() {
            super({ key: 'ReflexScene' });
        }

        create(): void {
            this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1e293b);

            for (let row = 0; row < GRID_ROWS; row++) {
                for (let col = 0; col < GRID_COLS; col++) {
                    const x = GRID_GAP + col * (CELL_WIDTH + GRID_GAP) + CELL_WIDTH / 2;
                    const y = GRID_GAP + row * (CELL_HEIGHT + GRID_GAP) + CELL_HEIGHT / 2;
                    const cell = this.add.rectangle(x, y, CELL_WIDTH, CELL_HEIGHT, COLOR_IDLE);
                    cell.setInteractive();
                    const index = row * GRID_COLS + col;
                    cell.on('pointerdown', () => this.handleClick(index));
                    this.cells.push(cell);
                }
            }

            this.message = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Click to start', {
                fontSize: '26px',
                color: '#ffffff',
                fontFamily: 'sans-serif',
                align: 'center',
            });
            this.message.setOrigin(0.5);
        }

        private handleClick(index: number): void {
            if (this.state === 'idle' || this.state === 'clicked' || this.state === 'tooEarly' || this.state === 'wrongCell') {
                this.startWaiting();

                return;
            }

            if (this.state === 'waiting') {
                this.changeTimer?.remove();
                this.state = 'tooEarly';
                this.cells.forEach((c) => c.setFillStyle(COLOR_WARN));
                this.message.setText('Too early!\nClick to try again');

                return;
            }

            if (this.state === 'ready') {
                if (index !== this.targetIndex) {
                    this.state = 'wrongCell';
                    this.cells.forEach((c) => c.setFillStyle(COLOR_WARN));
                    this.message.setText('Wrong cell!\nClick to try again');

                    return;
                }
                const reaction = this.time.now - this.startTime;
                this.state = 'clicked';
                this.cells.forEach((c) => c.setFillStyle(COLOR_RESULT));
                this.message.setText(`${reaction.toFixed(0)} ms\nClick to play again`);
                onResult(reaction);
            }
        }

        private startWaiting(): void {
            this.state = 'waiting';
            this.cells.forEach((c) => c.setFillStyle(COLOR_WAITING));
            this.message.setText('Wait for red...');
            const delay = Phaser.Math.Between(1000, 4000);
            this.changeTimer = this.time.delayedCall(delay, () => {
                this.state = 'ready';
                this.startTime = this.time.now;
                this.targetIndex = Phaser.Math.Between(0, this.cells.length - 1);
                this.cells.forEach((c, i) => c.setFillStyle(i === this.targetIndex ? COLOR_TARGET : COLOR_IDLE));
                this.message.setText('');
            });
        }
    })();
}

export async function mountGame(container: HTMLElement, options: ReflexMountOptions): Promise<GameDestroyer> {
    const module = await import('phaser');
    const Phaser = module.default;
    const scene = createReflexScene(Phaser, options.onResult);

    const game = new Phaser.Game({
        type: Phaser.AUTO,
        scale: {
            mode: Phaser.Scale.FIT,
            parent: container,
            autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
        },
        backgroundColor: '#1e293b',
        scene,
    });

    return () => game.destroy(true);
}

export const dimensions = { width: GAME_WIDTH, height: GAME_HEIGHT };
