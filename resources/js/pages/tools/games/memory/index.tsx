import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Brain } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Games', href: '/games' },
    { title: 'Memory Sequence', href: '/games/memory' },
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

const SYMBOLS = [
    '🎈', '🎨', '🎭', '🎪',
    '🎲', '🎯', '🎮', '🎸',
    '🎹', '🎺', '🎻', '🏀',
    '🏈', '⚽', '🎱', '🏐',
];
const SEQUENCE_LENGTH = 5;
const MEMORIZE_MS = 5000;

function getXsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function shuffled<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

type GameState = 'idle' | 'memorize' | 'playing' | 'done';

type RoundFeedback = { index: number; correct: boolean } | null;

export default function MemoryGame({ recent, best }: Props) {
    const [state, setState] = useState<GameState>('idle');
    const [sequence, setSequence] = useState<string[]>([]);
    const [gridOrder, setGridOrder] = useState<string[]>([]);
    const [currentRound, setCurrentRound] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<RoundFeedback>(null);
    const [memorizeLeft, setMemorizeLeft] = useState(MEMORIZE_MS / 1000);
    const [results, setResults] = useState<RecentResult[]>(recent);
    const [bestResult, setBestResult] = useState<number | null>(best);
    const [saving, setSaving] = useState(false);

    const saveResult = async (finalScore: number) => {
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
                body: JSON.stringify({ game: 'memory', result: finalScore }),
            });
            if (response.ok) {
                const data = await response.json();
                setResults((prev) =>
                    [{ id: data.id, result: data.result, played_at: data.played_at }, ...prev].slice(0, 10),
                );
                setBestResult((prev) => (prev === null || finalScore > prev ? finalScore : prev));
            }
        } finally {
            setSaving(false);
        }
    };

    const startGame = () => {
        const seq = shuffled(SYMBOLS).slice(0, SEQUENCE_LENGTH);
        setSequence(seq);
        setGridOrder(shuffled(SYMBOLS));
        setCurrentRound(0);
        setScore(0);
        setFeedback(null);
        setMemorizeLeft(MEMORIZE_MS / 1000);
        setState('memorize');
    };

    useEffect(() => {
        if (state !== 'memorize') {
            return;
        }
        const start = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - start;
            const left = Math.max(0, Math.ceil((MEMORIZE_MS - elapsed) / 1000));
            setMemorizeLeft(left);
            if (elapsed >= MEMORIZE_MS) {
                clearInterval(interval);
                setState('playing');
            }
        }, 100);
        return () => clearInterval(interval);
    }, [state]);

    const handlePick = (symbol: string) => {
        if (state !== 'playing' || feedback) {
            return;
        }
        const expected = sequence[currentRound];
        const correct = symbol === expected;
        const nextScore = correct ? score + 1 : score;
        setScore(nextScore);
        setFeedback({ index: gridOrder.indexOf(symbol), correct });

        setTimeout(() => {
            const nextRound = currentRound + 1;
            setFeedback(null);
            if (nextRound >= SEQUENCE_LENGTH) {
                setState('done');
                void saveResult(nextScore);
            } else {
                setCurrentRound(nextRound);
                setGridOrder(shuffled(SYMBOLS));
            }
        }, 600);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Memory Sequence" />

            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Brain className="size-6" />
                            Memory Sequence
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Memorize 5 symbols, then pick them in order from a 4×4 grid.
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
                    <div className="mx-auto flex flex-col items-center gap-4">
                        {state === 'idle' && (
                            <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-white/70 p-8 shadow-sm dark:bg-black/40">
                                <p className="text-center text-muted-foreground">
                                    Click start. 5 symbols will appear for 5 seconds.
                                </p>
                                <button
                                    type="button"
                                    onClick={startGame}
                                    className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
                                >
                                    Start
                                </button>
                            </div>
                        )}

                        {state === 'memorize' && (
                            <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-white/70 p-6 shadow-sm dark:bg-black/40">
                                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    Memorize ({memorizeLeft}s)
                                </p>
                                <div className="flex gap-3">
                                    {sequence.map((symbol, i) => (
                                        <div
                                            key={i}
                                            className="flex size-16 items-center justify-center rounded-lg border border-border bg-background text-3xl"
                                        >
                                            {symbol}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                    {sequence.map((_, i) => (
                                        <span key={i} className="w-16 text-center">#{i + 1}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {state === 'playing' && (
                            <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-white/70 p-6 shadow-sm dark:bg-black/40">
                                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    Pick symbol #{currentRound + 1} of {SEQUENCE_LENGTH}
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                    {gridOrder.map((symbol, i) => {
                                        const isFeedback = feedback && feedback.index === i;
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => handlePick(symbol)}
                                                disabled={!!feedback}
                                                className={`flex size-16 items-center justify-center rounded-lg border text-3xl transition-colors ${
                                                    isFeedback
                                                        ? feedback.correct
                                                            ? 'border-green-500 bg-green-100 dark:bg-green-900/40'
                                                            : 'border-red-500 bg-red-100 dark:bg-red-900/40'
                                                        : 'border-border bg-background hover:bg-accent'
                                                } disabled:cursor-not-allowed`}
                                            >
                                                {symbol}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Score: <strong className="text-foreground">{score}</strong> / {SEQUENCE_LENGTH}
                                </p>
                            </div>
                        )}

                        {state === 'done' && (
                            <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-white/70 p-8 shadow-sm dark:bg-black/40">
                                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    Finished
                                </p>
                                <p className="font-mono text-5xl font-bold">{score} / {SEQUENCE_LENGTH}</p>
                                <div className="flex gap-2">
                                    {sequence.map((symbol, i) => (
                                        <div
                                            key={i}
                                            className="flex size-12 items-center justify-center rounded-lg border border-border bg-background text-2xl"
                                        >
                                            {symbol}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={startGame}
                                    className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
                                >
                                    Play again
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-border bg-white/70 p-4 shadow-sm dark:bg-black/40">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Best Score</p>
                            <p className="mt-1 text-3xl font-bold">
                                {bestResult !== null ? `${bestResult.toFixed(0)} / ${SEQUENCE_LENGTH}` : '—'}
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
                                            <span className="font-mono">{r.result.toFixed(0)} / {SEQUENCE_LENGTH}</span>
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
