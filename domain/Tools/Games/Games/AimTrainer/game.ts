import type PhaserNamespace from 'phaser';

const GAME_WIDTH = 700;
const GAME_HEIGHT = 440;
const ROUND_MS = 30000;
const TARGET_RADIUS = 24;
const MARGIN = 40;

export type AimTrainerMountOptions = {
    onResult: (hits: number) => void;
    onTick: (hits: number, secondsLeft: number) => void;
};

export type GameDestroyer = () => void;

function createAimScene(
    Phaser: typeof PhaserNamespace,
    onResult: (hits: number) => void,
    onTick: (hits: number, secondsLeft: number) => void,
): PhaserNamespace.Scene {
    return new (class extends Phaser.Scene {
        private target!: PhaserNamespace.GameObjects.Arc;
        private message!: PhaserNamespace.GameObjects.Text;
        private state: 'idle' | 'playing' | 'done' = 'idle';
        private hits = 0;
        private startTime = 0;

        constructor() {
            super({ key: 'AimScene' });
        }

        create(): void {
            this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f172a);

            this.target = this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, TARGET_RADIUS, 0xef4444);
            this.target.setStrokeStyle(3, 0xffffff);
            this.target.setVisible(false);

            this.message = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Click anywhere to start', {
                fontSize: '22px',
                color: '#ffffff',
                fontFamily: 'sans-serif',
            });
            this.message.setOrigin(0.5);

            this.input.on('pointerdown', (pointer: PhaserNamespace.Input.Pointer) => {
                if (this.state === 'idle' || this.state === 'done') {
                    this.startRound();

                    return;
                }
                if (this.state !== 'playing') {
                    return;
                }
                const dx = pointer.x - this.target.x;
                const dy = pointer.y - this.target.y;
                if (dx * dx + dy * dy <= TARGET_RADIUS * TARGET_RADIUS) {
                    this.hits += 1;
                    this.spawnTarget();
                    this.emitTick();
                }
            });
        }

        private startRound(): void {
            this.state = 'playing';
            this.hits = 0;
            this.startTime = this.time.now;
            this.message.setVisible(false);
            this.spawnTarget();
            this.emitTick();
        }

        private spawnTarget(): void {
            const x = Phaser.Math.Between(MARGIN, GAME_WIDTH - MARGIN);
            const y = Phaser.Math.Between(MARGIN, GAME_HEIGHT - MARGIN);
            this.target.setPosition(x, y);
            this.target.setVisible(true);
        }

        private emitTick(): void {
            const elapsed = this.time.now - this.startTime;
            const secondsLeft = Math.max(0, Math.ceil((ROUND_MS - elapsed) / 1000));
            onTick(this.hits, secondsLeft);
        }

        update(): void {
            if (this.state !== 'playing') {
                return;
            }
            const elapsed = this.time.now - this.startTime;
            if (elapsed >= ROUND_MS) {
                this.state = 'done';
                this.target.setVisible(false);
                this.message.setText(`${this.hits} hits — click to play again`);
                this.message.setVisible(true);
                onResult(this.hits);
                onTick(this.hits, 0);

                return;
            }
            this.emitTick();
        }
    })();
}

export async function mountGame(container: HTMLElement, options: AimTrainerMountOptions): Promise<GameDestroyer> {
    const module = await import('phaser');
    const Phaser = module.default;
    const scene = createAimScene(Phaser, options.onResult, options.onTick);

    const game = new Phaser.Game({
        type: Phaser.AUTO,
        scale: {
            mode: Phaser.Scale.FIT,
            parent: container,
            autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
        },
        backgroundColor: '#0f172a',
        scene,
    });

    return () => game.destroy(true);
}

export const dimensions = { width: GAME_WIDTH, height: GAME_HEIGHT };
export const roundMs = ROUND_MS;
