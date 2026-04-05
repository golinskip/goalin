import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type PhaserNamespace from 'phaser';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Games', href: '/games' },
    { title: 'Serve', href: '/games/serve' },
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
const SERVICE_LINE_X = 90;
const NET_X = 360;
const NET_TOP = 180;
const PLAYER_START_X = SERVICE_LINE_X;
const PLAYER_WIDTH = 26;
const PLAYER_HEIGHT = 52;
const RUN_SPEED = 340;
const GRAVITY = 900;
const JUMP_VELOCITY = -780;
const BALL_RADIUS = 14;
const ARM_LENGTH = 48;
const ARM_START_ANGLE = -2.35;
const ARM_END_ANGLE = -0.4;
const ARM_SWING_MS = 260;
const MAX_TOSS_MS = 900;
const MIN_TOSS_VY = -320;
const MAX_TOSS_VY = -760;
const TOSS_VX = 150;

function getXsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function createServeScene(
    Phaser: typeof PhaserNamespace,
    onResult: (distance: number) => void,
): PhaserNamespace.Scene {
    return new (class extends Phaser.Scene {
        private ball!: PhaserNamespace.GameObjects.Arc;
        private player!: PhaserNamespace.GameObjects.Rectangle;
        private arm!: PhaserNamespace.GameObjects.Line;
        private message!: PhaserNamespace.GameObjects.Text;
        private powerBarBg!: PhaserNamespace.GameObjects.Rectangle;
        private powerBar!: PhaserNamespace.GameObjects.Rectangle;
        private distanceMarker!: PhaserNamespace.GameObjects.Line;

        private ballVx = 0;
        private ballVy = 0;
        private playerX = PLAYER_START_X;
        private playerY = GROUND_Y - PLAYER_HEIGHT;
        private playerVx = 0;
        private playerVy = 0;
        private prevBallX = 0;

        private state: 'ready' | 'charging' | 'tossed' | 'running' | 'jumping' | 'hit' | 'done' = 'ready';
        private chargeStart = 0;
        private swingActive = false;
        private swingStart = 0;
        private hitDone = false;

        constructor() {
            super({ key: 'ServeScene' });
        }

        create(): void {
            this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f172a);
            this.add.rectangle(GAME_WIDTH / 2, GROUND_Y + 20, GAME_WIDTH, 40, 0x334155);

            this.add.rectangle(SERVICE_LINE_X, GROUND_Y - 1, 2, 16, 0x94a3b8);

            this.add.rectangle(NET_X, (NET_TOP + GROUND_Y) / 2, 6, GROUND_Y - NET_TOP, 0xe2e8f0);
            this.add.rectangle(NET_X, NET_TOP - 3, 14, 6, 0xf8fafc);

            this.player = this.add.rectangle(
                this.playerX,
                this.playerY + PLAYER_HEIGHT / 2,
                PLAYER_WIDTH,
                PLAYER_HEIGHT,
                0x60a5fa,
            );

            this.arm = this.add.line(0, 0, 0, 0, 0, 0, 0xfbbf24, 1);
            this.arm.setLineWidth(5);
            this.arm.setOrigin(0, 0);
            this.arm.setVisible(false);

            this.ball = this.add.circle(this.playerX + 18, this.playerY + 12, BALL_RADIUS, 0xf97316);

            this.powerBarBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 18, 240, 12, 0x1e293b)
                .setStrokeStyle(1, 0x94a3b8);
            this.powerBar = this.add.rectangle(GAME_WIDTH / 2 - 120, GAME_HEIGHT - 18, 0, 10, 0xfbbf24);
            this.powerBar.setOrigin(0, 0.5);
            this.powerBarBg.setVisible(false);
            this.powerBar.setVisible(false);

            this.distanceMarker = this.add.line(0, 0, 0, 0, 0, 0, 0x22c55e, 1);
            this.distanceMarker.setLineWidth(3);
            this.distanceMarker.setOrigin(0, 0);
            this.distanceMarker.setVisible(false);

            this.message = this.add.text(GAME_WIDTH / 2, 32, 'Hold to charge toss, release to throw', {
                fontSize: '18px',
                color: '#ffffff',
                fontFamily: 'sans-serif',
            });
            this.message.setOrigin(0.5);

            this.input.on('pointerdown', () => this.handleDown());
            this.input.on('pointerup', () => this.handleUp());
        }

        private resetRound(): void {
            this.state = 'ready';
            this.ballVx = 0;
            this.ballVy = 0;
            this.playerX = PLAYER_START_X;
            this.playerY = GROUND_Y - PLAYER_HEIGHT;
            this.playerVx = 0;
            this.playerVy = 0;
            this.swingActive = false;
            this.hitDone = false;
            this.player.setPosition(this.playerX, this.playerY + PLAYER_HEIGHT / 2);
            this.ball.setPosition(this.playerX + 18, this.playerY + 12);
            this.arm.setVisible(false);
            this.distanceMarker.setVisible(false);
            this.powerBarBg.setVisible(false);
            this.powerBar.setVisible(false);
            this.message.setText('Hold to charge toss, release to throw');
        }

        private handleDown(): void {
            if (this.state === 'done') {
                this.resetRound();
                return;
            }
            if (this.state === 'ready') {
                this.state = 'charging';
                this.chargeStart = this.time.now;
                this.powerBarBg.setVisible(true);
                this.powerBar.setVisible(true);
                this.message.setText('Release to toss...');
                return;
            }
            if (this.state === 'tossed') {
                this.state = 'running';
                this.playerVx = RUN_SPEED;
                this.message.setText('Click to jump');
                return;
            }
            if (this.state === 'running') {
                this.playerVy = JUMP_VELOCITY;
                this.state = 'jumping';
                this.message.setText('Click to spike!');
                return;
            }
            if (this.state === 'jumping' && !this.swingActive && !this.hitDone) {
                this.swingActive = true;
                this.swingStart = this.time.now;
                this.arm.setVisible(true);
            }
        }

        private handleUp(): void {
            if (this.state !== 'charging') {
                return;
            }
            const held = Phaser.Math.Clamp(this.time.now - this.chargeStart, 0, MAX_TOSS_MS);
            const power = held / MAX_TOSS_MS;
            this.ballVy = Phaser.Math.Linear(MIN_TOSS_VY, MAX_TOSS_VY, power);
            this.ballVx = TOSS_VX;
            this.state = 'tossed';
            this.powerBarBg.setVisible(false);
            this.powerBar.setVisible(false);
            this.message.setText('Click to start run');
        }

        private getArmTip(progress: number): { x: number; y: number; angle: number } {
            const angle = Phaser.Math.Linear(ARM_START_ANGLE, ARM_END_ANGLE, progress);
            const shoulderX = this.playerX;
            const shoulderY = this.playerY + 8;
            return {
                x: shoulderX + Math.cos(angle) * ARM_LENGTH,
                y: shoulderY + Math.sin(angle) * ARM_LENGTH,
                angle,
            };
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

        private updateArm(): number {
            if (!this.swingActive) {
                return -1;
            }
            const elapsed = this.time.now - this.swingStart;
            const progress = Phaser.Math.Clamp(elapsed / ARM_SWING_MS, 0, 1);
            const shoulderX = this.playerX;
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

        private tryHit(progress: number): void {
            if (this.hitDone || progress < 0) {
                return;
            }
            const shoulderX = this.playerX;
            const shoulderY = this.playerY + 8;
            const tip = this.getArmTip(progress);
            const dist = this.distanceSegmentToPoint(
                shoulderX, shoulderY, tip.x, tip.y, this.ball.x, this.ball.y,
            );
            if (dist <= BALL_RADIUS + 6) {
                this.hitDone = true;
                const tangent = tip.angle + Math.PI / 2;
                const power = 580 + Math.random() * 180;
                this.ballVx = Math.cos(tangent) * power + this.playerVx * 0.5;
                this.ballVy = Math.sin(tangent) * power * 0.55;
                if (this.ballVx < 160) {
                    this.ballVx = 160 + Math.random() * 80;
                }
                this.state = 'hit';
                this.message.setText('Served!');
                this.time.delayedCall(120, () => this.arm.setVisible(false));
            }
        }

        update(_time: number, delta: number): void {
            const dt = delta / 1000;

            if (this.state === 'charging') {
                const held = Phaser.Math.Clamp(this.time.now - this.chargeStart, 0, MAX_TOSS_MS);
                this.powerBar.width = (held / MAX_TOSS_MS) * 240;
            }

            if (
                this.state === 'tossed' ||
                this.state === 'running' ||
                this.state === 'jumping' ||
                this.state === 'hit'
            ) {
                this.prevBallX = this.ball.x;
                this.ballVy += GRAVITY * dt;
                this.ball.x += this.ballVx * dt;
                this.ball.y += this.ballVy * dt;
            }

            if (this.state === 'running' || this.state === 'jumping') {
                this.playerX += this.playerVx * dt;
                if (this.playerX > NET_X - 40) {
                    this.playerX = NET_X - 40;
                    this.playerVx = 0;
                }
            }

            if (this.state === 'jumping') {
                this.playerVy += GRAVITY * dt;
                this.playerY += this.playerVy * dt;
                const floor = GROUND_Y - PLAYER_HEIGHT;
                if (this.playerY >= floor) {
                    this.playerY = floor;
                    this.playerVy = 0;
                    if (!this.hitDone) {
                        this.state = 'done';
                        this.message.setText('Missed the jump window! Click to retry');
                        onResult(0);
                    }
                }
                const progress = this.updateArm();
                this.tryHit(progress);
            }

            this.player.setPosition(this.playerX, this.playerY + PLAYER_HEIGHT / 2);

            if (
                (this.state === 'tossed' || this.state === 'running') &&
                this.ball.y >= GROUND_Y - BALL_RADIUS
            ) {
                this.ball.y = GROUND_Y - BALL_RADIUS;
                this.state = 'done';
                this.message.setText('Toss hit the ground! Click to retry');
                onResult(0);
                return;
            }

            if (this.state === 'hit') {
                if (
                    this.prevBallX < NET_X &&
                    this.ball.x >= NET_X - BALL_RADIUS &&
                    this.ball.y > NET_TOP
                ) {
                    this.ball.x = NET_X - BALL_RADIUS;
                    this.state = 'done';
                    this.message.setText('Into the net! Click to retry');
                    onResult(0);
                    return;
                }

                if (this.ball.y >= GROUND_Y - BALL_RADIUS) {
                    this.ball.y = GROUND_Y - BALL_RADIUS;
                    if (this.ball.x <= NET_X) {
                        this.state = 'done';
                        this.message.setText('Too short! Click to retry');
                        onResult(0);
                        return;
                    }
                    const distance = this.ball.x - NET_X;
                    this.state = 'done';
                    this.distanceMarker.setTo(NET_X, GROUND_Y + 4, this.ball.x, GROUND_Y + 4);
                    this.distanceMarker.setVisible(true);
                    this.message.setText(`Distance: ${distance.toFixed(0)} — click to play again`);
                    onResult(distance);
                }
            }
        }
    })();
}

export default function ServeGame({ recent, best }: Props) {
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
                body: JSON.stringify({ game: 'serve', result: distance }),
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
            const scene = createServeScene(Phaser, (distance) => {
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
            <Head title="Serve" />

            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Send className="size-6" />
                            Volleyball Serve
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Hold to charge toss height — the ball flies toward the net. Then click to run, jump, and swing.
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
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Longest Serve</p>
                            <p className="mt-1 text-3xl font-bold">
                                {bestResult !== null ? `${bestResult.toFixed(0)}` : '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-border bg-white/70 p-4 shadow-sm dark:bg-black/40">
                            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                                Recent Serves {saving && <span className="text-[10px]">(saving...)</span>}
                            </p>
                            {results.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No serves yet.</p>
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
