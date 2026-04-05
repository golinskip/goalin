import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Volleyball as VolleyballIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type PhaserNamespace from 'phaser';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Games', href: '/games' },
    { title: 'Volleyball Spike', href: '/games/volleyball' },
];

type RecentResult = {
    id: number;
    result: number;
    played_at: string;
};

type Props = {
    recent: RecentResult[];
    best: number | null;
};

const GAME_WIDTH = 700;
const GAME_HEIGHT = 420;
const GROUND_Y = 380;
const PLAYER_X = 120;
const PLAYER_HEIGHT = 50;
const GRAVITY = 900;
const JUMP_VELOCITY = -520;
const HAND_RADIUS = 18;
const BALL_RADIUS = 14;

function getXsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function createSpikeScene(
    Phaser: typeof PhaserNamespace,
    onResult: (distance: number) => void,
): PhaserNamespace.Scene {
    return new (class extends Phaser.Scene {
        private ball!: PhaserNamespace.GameObjects.Arc;
        private player!: PhaserNamespace.GameObjects.Rectangle;
        private hand!: PhaserNamespace.GameObjects.Arc;
        private ground!: PhaserNamespace.GameObjects.Rectangle;
        private message!: PhaserNamespace.GameObjects.Text;
        private distanceMarker!: PhaserNamespace.GameObjects.Line;

        private ballVx = 0;
        private ballVy = 0;
        private playerVy = 0;
        private playerY = GROUND_Y - PLAYER_HEIGHT;

        private state: 'ready' | 'playing' | 'jumping' | 'hit' | 'landed' = 'ready';
        private jumpsUsed = 0;
        private hitDone = false;
        private handTimer?: PhaserNamespace.Time.TimerEvent;

        constructor() {
            super({ key: 'SpikeScene' });
        }

        create(): void {
            this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1e293b);
            this.ground = this.add.rectangle(GAME_WIDTH / 2, GROUND_Y + 20, GAME_WIDTH, 40, 0x334155);

            this.player = this.add.rectangle(PLAYER_X, this.playerY + PLAYER_HEIGHT / 2, 30, PLAYER_HEIGHT, 0x60a5fa);
            this.hand = this.add.circle(PLAYER_X, this.playerY - HAND_RADIUS, HAND_RADIUS, 0xfbbf24);
            this.hand.setVisible(false);

            this.ball = this.add.circle(PLAYER_X + 40, 0, BALL_RADIUS, 0xf97316);

            this.distanceMarker = this.add.line(0, 0, 0, 0, 0, 0, 0xffffff);
            this.distanceMarker.setVisible(false);

            this.message = this.add.text(GAME_WIDTH / 2, 40, 'Click to start', {
                fontSize: '22px',
                color: '#ffffff',
                fontFamily: 'sans-serif',
            });
            this.message.setOrigin(0.5);

            this.input.on('pointerdown', () => this.handleClick());
            this.resetRound();
        }

        private resetRound(): void {
            this.state = 'ready';
            this.jumpsUsed = 0;
            this.hitDone = false;
            this.ballVx = 0;
            this.ballVy = 0;
            this.playerVy = 0;
            this.playerY = GROUND_Y - PLAYER_HEIGHT;
            this.player.setY(this.playerY + PLAYER_HEIGHT / 2);
            this.ball.setPosition(PLAYER_X + 40, -20);
            this.hand.setVisible(false);
            this.distanceMarker.setVisible(false);
            this.message.setText('Click to drop the ball');
        }

        private handleClick(): void {
            if (this.state === 'landed') {
                this.resetRound();
                return;
            }

            if (this.state === 'ready') {
                this.state = 'playing';
                this.ballVy = 0;
                this.message.setText('Click to jump');
                return;
            }

            if (this.state === 'playing' && this.jumpsUsed === 0) {
                this.jumpsUsed = 1;
                this.playerVy = JUMP_VELOCITY;
                this.state = 'jumping';
                this.message.setText('Click to spike!');
                return;
            }

            if (this.state === 'jumping' && !this.hitDone) {
                this.hitDone = true;
                this.hand.setVisible(true);
                this.tryHit();
                this.handTimer = this.time.delayedCall(180, () => {
                    this.hand.setVisible(false);
                });
            }
        }

        private tryHit(): void {
            const handX = this.player.x;
            const handY = this.playerY - HAND_RADIUS;
            this.hand.setPosition(handX, handY);

            const dx = this.ball.x - handX;
            const dy = this.ball.y - handY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= HAND_RADIUS + BALL_RADIUS + 10) {
                const hitAngle = Phaser.Math.Clamp((this.ball.y - handY + 30) / 60, 0.3, 1.2);
                this.ballVx = 500 + Math.random() * 250;
                this.ballVy = -260 * hitAngle;
                this.state = 'hit';
                this.message.setText('Nice spike!');
            }
        }

        update(_time: number, delta: number): void {
            const dt = delta / 1000;

            if (this.state === 'playing' || this.state === 'jumping' || this.state === 'hit') {
                this.ballVy += GRAVITY * dt;
                this.ball.x += this.ballVx * dt;
                this.ball.y += this.ballVy * dt;
            }

            if (this.state === 'jumping') {
                this.playerVy += GRAVITY * dt;
                this.playerY += this.playerVy * dt;
                const floor = GROUND_Y - PLAYER_HEIGHT;
                if (this.playerY >= floor) {
                    this.playerY = floor;
                    this.playerVy = 0;
                    if (!this.hitDone) {
                        this.state = 'playing';
                        this.jumpsUsed = 0;
                        this.message.setText('Click to jump');
                    }
                }
                this.player.setY(this.playerY + PLAYER_HEIGHT / 2);
                if (this.hand.visible) {
                    this.hand.setPosition(this.player.x, this.playerY - HAND_RADIUS);
                }
            }

            if (this.state === 'hit' && this.ball.y >= GROUND_Y - BALL_RADIUS) {
                this.ball.y = GROUND_Y - BALL_RADIUS;
                const distance = Math.max(0, this.ball.x - PLAYER_X);
                this.finishRound(distance);
                return;
            }

            if (this.state !== 'hit' && this.state !== 'ready' && this.state !== 'landed') {
                if (this.ball.y >= GROUND_Y - BALL_RADIUS) {
                    this.ball.y = GROUND_Y - BALL_RADIUS;
                    this.finishRound(0);
                }
            }
        }

        private finishRound(distance: number): void {
            this.state = 'landed';
            this.handTimer?.remove();
            this.hand.setVisible(false);
            this.distanceMarker.setTo(PLAYER_X, GROUND_Y + 4, this.ball.x, GROUND_Y + 4);
            this.distanceMarker.setVisible(true);
            if (distance > 0) {
                this.message.setText(`Distance: ${distance.toFixed(0)} — click to play again`);
            } else {
                this.message.setText('Missed! Click to try again');
            }
            onResult(distance);
        }
    })();
}

export default function VolleyballGame({ recent, best }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<PhaserNamespace.Game | null>(null);
    const [results, setResults] = useState<RecentResult[]>(recent);
    const [bestResult, setBestResult] = useState<number | null>(best);
    const [saving, setSaving] = useState(false);

    const saveResult = async (distance: number) => {
        if (distance <= 0) {
            return;
        }
        setSaving(true);
        try {
            const response = await fetch('/games/results', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getXsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ game: 'volleyball', result: distance }),
            });
            if (response.ok) {
                const data = await response.json();
                setResults((prev) =>
                    [{ id: data.id, result: data.result, played_at: data.played_at }, ...prev].slice(0, 10),
                );
                setBestResult((prev) => (prev === null || distance > prev ? distance : prev));
            }
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (!containerRef.current || gameRef.current) {
            return;
        }

        let cancelled = false;

        void import('phaser').then((module) => {
            if (cancelled || !containerRef.current) {
                return;
            }
            const Phaser = module.default;
            const scene = createSpikeScene(Phaser, (distance) => {
                void saveResult(distance);
            });

            gameRef.current = new Phaser.Game({
                type: Phaser.AUTO,
                width: GAME_WIDTH,
                height: GAME_HEIGHT,
                parent: containerRef.current,
                backgroundColor: '#0f172a',
                scene,
            });
        });

        return () => {
            cancelled = true;
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Volleyball Spike" />

            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <VolleyballIcon className="size-6" />
                            Volleyball Spike
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Click to drop the ball, click to jump, click again to spike. Hit as far as you can.
                        </p>
                    </div>
                    <Link
                        href="/games"
                        className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
                    >
                        <ArrowLeft className="size-4" />
                        Back
                    </Link>
                </div>

                <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
                    <div
                        ref={containerRef}
                        className="mx-auto overflow-hidden rounded-xl border border-border shadow-sm"
                        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
                    />

                    <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-border bg-white/70 p-4 shadow-sm dark:bg-black/40">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Longest Hit</p>
                            <p className="mt-1 text-3xl font-bold">
                                {bestResult !== null ? `${bestResult.toFixed(0)}` : '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-border bg-white/70 p-4 shadow-sm dark:bg-black/40">
                            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                                Recent Hits {saving && <span className="text-[10px]">(saving...)</span>}
                            </p>
                            {results.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No hits yet.</p>
                            ) : (
                                <ul className="space-y-1 text-sm">
                                    {results.map((r) => (
                                        <li key={r.id} className="flex justify-between gap-4">
                                            <span className="font-mono">{r.result.toFixed(0)}</span>
                                            <span className="text-muted-foreground">
                                                {new Date(r.played_at).toLocaleString()}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
