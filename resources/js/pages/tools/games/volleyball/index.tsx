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
const NET_X = 320;
const NET_TOP = 180;
const NET_WIDTH = 6;
const PLAYER_X = NET_X - 70;
const PLAYER_WIDTH = 26;
const PLAYER_HEIGHT = 52;
const GRAVITY = 900;
const JUMP_VELOCITY = -520;
const BALL_RADIUS = 14;
const ARM_LENGTH = 48;
const ARM_START_ANGLE = -2.35;
const ARM_END_ANGLE = -0.4;
const ARM_SWING_MS = 260;

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
        private arm!: PhaserNamespace.GameObjects.Line;
        private net!: PhaserNamespace.GameObjects.Rectangle;
        private message!: PhaserNamespace.GameObjects.Text;
        private distanceMarker!: PhaserNamespace.GameObjects.Line;

        private ballVx = 0;
        private ballVy = 0;
        private playerVy = 0;
        private playerY = GROUND_Y - PLAYER_HEIGHT;

        private state: 'ready' | 'ballUp' | 'jumping' | 'hit' | 'blocked' | 'landed' = 'ready';
        private ballLaunched = false;
        private jumpsUsed = 0;
        private swingActive = false;
        private swingStartTime = 0;
        private hitDone = false;
        private prevBallX = 0;

        constructor() {
            super({ key: 'SpikeScene' });
        }

        create(): void {
            this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f172a);
            this.add.rectangle(GAME_WIDTH / 2, GROUND_Y + 20, GAME_WIDTH, 40, 0x334155);

            this.net = this.add.rectangle(NET_X, (NET_TOP + GROUND_Y) / 2, NET_WIDTH, GROUND_Y - NET_TOP, 0xe2e8f0);
            this.add.rectangle(NET_X, NET_TOP - 3, NET_WIDTH + 8, 6, 0xf8fafc);

            this.player = this.add.rectangle(PLAYER_X, 0, PLAYER_WIDTH, PLAYER_HEIGHT, 0x60a5fa);

            this.arm = this.add.line(0, 0, 0, 0, 0, 0, 0xfbbf24, 1);
            this.arm.setLineWidth(5);
            this.arm.setOrigin(0, 0);
            this.arm.setVisible(false);

            this.ball = this.add.circle(NET_X, NET_TOP - BALL_RADIUS - 2, BALL_RADIUS, 0xf97316);

            this.distanceMarker = this.add.line(0, 0, 0, 0, 0, 0, 0x22c55e, 1);
            this.distanceMarker.setLineWidth(3);
            this.distanceMarker.setOrigin(0, 0);
            this.distanceMarker.setVisible(false);

            this.message = this.add.text(GAME_WIDTH / 2, 32, 'Click to toss the ball', {
                fontSize: '20px',
                color: '#ffffff',
                fontFamily: 'sans-serif',
            });
            this.message.setOrigin(0.5);

            this.input.on('pointerdown', () => this.handleClick());
            this.updatePlayerGraphics();
        }

        private resetRound(): void {
            this.state = 'ready';
            this.ballLaunched = false;
            this.jumpsUsed = 0;
            this.swingActive = false;
            this.hitDone = false;
            this.ballVx = 0;
            this.ballVy = 0;
            this.playerVy = 0;
            this.playerY = GROUND_Y - PLAYER_HEIGHT;
            this.ball.setPosition(NET_X, NET_TOP - BALL_RADIUS - 2);
            this.prevBallX = this.ball.x;
            this.arm.setVisible(false);
            this.distanceMarker.setVisible(false);
            this.updatePlayerGraphics();
            this.message.setText('Click to toss the ball');
        }

        private handleClick(): void {
            if (this.state === 'landed' || this.state === 'blocked') {
                this.resetRound();
                return;
            }

            if (this.state === 'ready' && !this.ballLaunched) {
                this.ballLaunched = true;
                this.ballVy = -480;
                this.ballVx = -40;
                this.state = 'ballUp';
                this.message.setText('Click to jump');
                return;
            }

            if (this.state === 'ballUp' && this.jumpsUsed === 0) {
                this.jumpsUsed = 1;
                this.playerVy = JUMP_VELOCITY;
                this.state = 'jumping';
                this.message.setText('Click to spike!');
                return;
            }

            if (this.state === 'jumping' && !this.swingActive && !this.hitDone) {
                this.swingActive = true;
                this.swingStartTime = this.time.now;
                this.arm.setVisible(true);
            }
        }

        private getArmTip(progress: number): { x: number; y: number; angle: number } {
            const angle = Phaser.Math.Linear(ARM_START_ANGLE, ARM_END_ANGLE, progress);
            const shoulderX = this.player.x;
            const shoulderY = this.playerY + 8;
            return {
                x: shoulderX + Math.cos(angle) * ARM_LENGTH,
                y: shoulderY + Math.sin(angle) * ARM_LENGTH,
                angle,
            };
        }

        private updatePlayerGraphics(): void {
            this.player.setY(this.playerY + PLAYER_HEIGHT / 2);
        }

        private updateArm(): number {
            if (!this.swingActive) {
                return -1;
            }
            const elapsed = this.time.now - this.swingStartTime;
            const progress = Phaser.Math.Clamp(elapsed / ARM_SWING_MS, 0, 1);
            const shoulderX = this.player.x;
            const shoulderY = this.playerY + 8;
            const tip = this.getArmTip(progress);
            this.arm.setTo(shoulderX, shoulderY, tip.x, tip.y);
            if (progress >= 1) {
                this.swingActive = false;
                if (!this.hitDone) {
                    this.time.delayedCall(80, () => this.arm.setVisible(false));
                }
            }
            return progress;
        }

        private distanceSegmentToPoint(
            ax: number, ay: number, bx: number, by: number, px: number, py: number,
        ): number {
            const abx = bx - ax;
            const aby = by - ay;
            const apx = px - ax;
            const apy = py - ay;
            const lenSq = abx * abx + aby * aby;
            let t = lenSq === 0 ? 0 : (apx * abx + apy * aby) / lenSq;
            t = Phaser.Math.Clamp(t, 0, 1);
            const cx = ax + abx * t;
            const cy = ay + aby * t;
            const dx = px - cx;
            const dy = py - cy;
            return Math.sqrt(dx * dx + dy * dy);
        }

        private tryHit(progress: number): void {
            if (this.hitDone || progress < 0) {
                return;
            }
            const shoulderX = this.player.x;
            const shoulderY = this.playerY + 8;
            const tip = this.getArmTip(progress);
            const dist = this.distanceSegmentToPoint(
                shoulderX, shoulderY, tip.x, tip.y, this.ball.x, this.ball.y,
            );

            if (dist <= BALL_RADIUS + 6) {
                this.hitDone = true;
                const tangent = tip.angle + Math.PI / 2;
                const power = 560 + Math.random() * 180;
                this.ballVx = Math.cos(tangent) * power;
                this.ballVy = Math.sin(tangent) * power * 0.55;
                if (this.ballVx < 120) {
                    this.ballVx = 120 + Math.random() * 80;
                }
                this.state = 'hit';
                this.message.setText('Spike!');
                this.time.delayedCall(120, () => this.arm.setVisible(false));
            }
        }

        update(_time: number, delta: number): void {
            const dt = delta / 1000;

            if (this.state === 'ballUp' || this.state === 'jumping' || this.state === 'hit') {
                this.prevBallX = this.ball.x;
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
                        this.state = 'ballUp';
                        this.jumpsUsed = 0;
                        this.swingActive = false;
                        this.arm.setVisible(false);
                        this.message.setText('Click to jump');
                    }
                }
                this.updatePlayerGraphics();
                const progress = this.updateArm();
                this.tryHit(progress);
            }

            if (this.state === 'hit') {
                if (
                    this.prevBallX < NET_X &&
                    this.ball.x >= NET_X - BALL_RADIUS &&
                    this.ball.y > NET_TOP
                ) {
                    this.ball.x = NET_X - BALL_RADIUS;
                    this.state = 'blocked';
                    this.message.setText('Blocked by net! Click to retry');
                    onResult(0);
                    return;
                }

                if (this.ball.y >= GROUND_Y - BALL_RADIUS) {
                    this.ball.y = GROUND_Y - BALL_RADIUS;
                    if (this.ball.x <= NET_X) {
                        this.state = 'blocked';
                        this.message.setText('Too short — into the net! Click to retry');
                        onResult(0);
                        return;
                    }
                    const distance = this.ball.x - NET_X;
                    this.finishRound(distance);
                    return;
                }
            }

            if (
                (this.state === 'ballUp' || this.state === 'jumping') &&
                this.ball.y >= GROUND_Y - BALL_RADIUS
            ) {
                this.ball.y = GROUND_Y - BALL_RADIUS;
                this.state = 'blocked';
                this.message.setText('Missed! Click to try again');
                onResult(0);
            }
        }

        private finishRound(distance: number): void {
            this.state = 'landed';
            this.arm.setVisible(false);
            this.distanceMarker.setTo(NET_X, GROUND_Y + 4, this.ball.x, GROUND_Y + 4);
            this.distanceMarker.setVisible(true);
            this.message.setText(`Distance: ${distance.toFixed(0)} — click to play again`);
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
                            Toss, jump, swing your arm. Spike the ball over the net — low spikes get blocked.
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
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Longest Spike</p>
                            <p className="mt-1 text-3xl font-bold">
                                {bestResult !== null ? `${bestResult.toFixed(0)}` : '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-border bg-white/70 p-4 shadow-sm dark:bg-black/40">
                            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                                Recent Spikes {saving && <span className="text-[10px]">(saving...)</span>}
                            </p>
                            {results.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No spikes yet.</p>
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
