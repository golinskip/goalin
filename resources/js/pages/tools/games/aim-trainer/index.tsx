import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Crosshair } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type PhaserNamespace from 'phaser';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Games', href: '/games' },
    { title: 'Aim Trainer', href: '/games/aim-trainer' },
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
const GAME_HEIGHT = 440;
const ROUND_MS = 30000;
const TARGET_RADIUS = 24;
const MARGIN = 40;

function getXsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

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
            this.target.setInteractive(new Phaser.Geom.Circle(0, 0, TARGET_RADIUS), Phaser.Geom.Circle.Contains);
            this.target.setVisible(false);

            this.message = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Click anywhere to start', {
                fontSize: '22px',
                color: '#ffffff',
                fontFamily: 'sans-serif',
            });
            this.message.setOrigin(0.5);

            this.target.on('pointerdown', (pointer: PhaserNamespace.Input.Pointer, _lx: number, _ly: number, event: PhaserNamespace.Types.Input.EventData) => {
                if (this.state !== 'playing') {
                    return;
                }
                event.stopPropagation();
                this.hits += 1;
                this.spawnTarget();
                this.emitTick();
            });

            this.input.on('pointerdown', () => {
                if (this.state === 'idle' || this.state === 'done') {
                    this.startRound();
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

export default function AimTrainerGame({ recent, best }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<PhaserNamespace.Game | null>(null);
    const [results, setResults] = useState<RecentResult[]>(recent);
    const [bestResult, setBestResult] = useState<number | null>(best);
    const [saving, setSaving] = useState(false);
    const [hits, setHits] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(Math.floor(ROUND_MS / 1000));

    const saveResult = async (score: number) => {
        if (score <= 0) {
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
                body: JSON.stringify({ game: 'aim_trainer', result: score }),
            });
            if (response.ok) {
                const data = await response.json();
                setResults((prev) =>
                    [{ id: data.id, result: data.result, played_at: data.played_at }, ...prev].slice(0, 10),
                );
                setBestResult((prev) => (prev === null || score > prev ? score : prev));
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
            const scene = createAimScene(
                Phaser,
                (score) => {
                    void saveResult(score);
                },
                (currentHits, currentSecondsLeft) => {
                    setHits(currentHits);
                    setSecondsLeft(currentSecondsLeft);
                },
            );

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
            <Head title="Aim Trainer" />

            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Crosshair className="size-6" />
                            Aim Trainer
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Click the red target as many times as you can in 30 seconds.
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
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-4 font-mono text-sm">
                            <span>Hits: <strong>{hits}</strong></span>
                            <span>Time: <strong>{secondsLeft}s</strong></span>
                        </div>
                        <div
                            ref={containerRef}
                            className="mx-auto overflow-hidden rounded-xl border border-border shadow-sm"
                            style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-border bg-white/70 p-4 shadow-sm dark:bg-black/40">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Best Score</p>
                            <p className="mt-1 text-3xl font-bold">
                                {bestResult !== null ? `${bestResult.toFixed(0)} hits` : '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-border bg-white/70 p-4 shadow-sm dark:bg-black/40">
                            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                                Recent Scores {saving && <span className="text-[10px]">(saving...)</span>}
                            </p>
                            {results.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No scores yet.</p>
                            ) : (
                                <ul className="space-y-1 text-sm">
                                    {results.map((r) => (
                                        <li key={r.id} className="flex justify-between gap-4">
                                            <span className="font-mono">{r.result.toFixed(0)} hits</span>
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
