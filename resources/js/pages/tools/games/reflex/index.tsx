import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type PhaserNamespace from 'phaser';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Games', href: '/games' },
    { title: 'Reflex Test', href: '/games/reflex' },
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

function getXsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

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

export default function ReflexGame({ recent, best }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<PhaserNamespace.Game | null>(null);
    const [results, setResults] = useState<RecentResult[]>(recent);
    const [bestResult, setBestResult] = useState<number | null>(best);
    const [saving, setSaving] = useState(false);

    const saveResult = async (ms: number) => {
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
                body: JSON.stringify({ game: 'reflex', result: ms }),
            });
            if (response.ok) {
                const data = await response.json();
                setResults((prev) => [
                    { id: data.id, result: data.result, played_at: data.played_at },
                    ...prev,
                ].slice(0, 10));
                setBestResult((prev) => (prev === null || ms < prev ? ms : prev));
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
            const scene = createReflexScene(Phaser, (ms) => {
                void saveResult(ms);
            });

            gameRef.current = new Phaser.Game({
                type: Phaser.AUTO,
                width: GAME_WIDTH,
                height: GAME_HEIGHT,
                parent: containerRef.current,
                backgroundColor: '#1e293b',
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
            <Head title="Reflex Test" />

            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Zap className="size-6" />
                            Reflex Test
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Click to start, wait for green, then click the red cell as fast as you can.
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
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Best Time</p>
                            <p className="mt-1 text-3xl font-bold">
                                {bestResult !== null ? `${bestResult.toFixed(0)} ms` : '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-border bg-white/70 p-4 shadow-sm dark:bg-black/40">
                            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                                Recent Results {saving && <span className="text-[10px]">(saving...)</span>}
                            </p>
                            {results.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No results yet.</p>
                            ) : (
                                <ul className="space-y-1 text-sm">
                                    {results.map((r) => (
                                        <li key={r.id} className="flex justify-between gap-4">
                                            <span className="font-mono">{r.result.toFixed(0)} ms</span>
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
