import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Crosshair } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { GameFullscreenWrapper } from '@/components/game-fullscreen-wrapper';
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

function getXsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export default function AimTrainerGame({ recent, best }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
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
        if (!containerRef.current) {
            return;
        }
        let cancelled = false;
        let destroy: (() => void) | null = null;

        void import('@games/AimTrainer/game').then(({ mountGame }) => {
            if (cancelled || !containerRef.current) {
                return;
            }
            void mountGame(containerRef.current, {
                onResult: (score) => void saveResult(score),
                onTick: (currentHits, currentSecondsLeft) => {
                    setHits(currentHits);
                    setSecondsLeft(currentSecondsLeft);
                },
            }).then((d) => {
                if (cancelled) {
                    d();

                    return;
                }
                destroy = d;
            });
        });

        return () => {
            cancelled = true;
            destroy?.();
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
                        <GameFullscreenWrapper>
                            {(isFullscreen) => (
                                <div
                                    ref={containerRef}
                                    className="mx-auto w-full overflow-hidden rounded-xl border border-border shadow-sm"
                                    style={isFullscreen
                                        ? { width: '100%', height: '100%' }
                                        : { maxWidth: GAME_WIDTH, aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}` }
                                    }
                                />
                            )}
                        </GameFullscreenWrapper>
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
