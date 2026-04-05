import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Games', href: '/games' },
    { title: 'Addition Speed', href: '/games/addition' },
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

function getXsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function randomOperand(): number {
    while (true) {
        const n = Math.floor(Math.random() * (99 - 21 + 1)) + 21;
        if (n % 10 !== 0) {
            return n;
        }
    }
}

type GameState = 'idle' | 'playing' | 'done';

export default function AdditionGame({ recent, best }: Props) {
    const [a, setA] = useState(0);
    const [b, setB] = useState(0);
    const [answer, setAnswer] = useState('');
    const [state, setState] = useState<GameState>('idle');
    const [lastMs, setLastMs] = useState<number | null>(null);
    const [results, setResults] = useState<RecentResult[]>(recent);
    const [bestResult, setBestResult] = useState<number | null>(best);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    const startTimeRef = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const startRound = () => {
        setA(randomOperand());
        setB(randomOperand());
        setAnswer('');
        setError(false);
        setState('playing');
        startTimeRef.current = performance.now();
        setTimeout(() => inputRef.current?.focus(), 10);
    };

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
                body: JSON.stringify({ game: 'addition', result: ms }),
            });
            if (response.ok) {
                const data = await response.json();
                setResults((prev) =>
                    [{ id: data.id, result: data.result, played_at: data.played_at }, ...prev].slice(0, 10),
                );
                setBestResult((prev) => (prev === null || ms < prev ? ms : prev));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (state !== 'playing') {
            return;
        }
        const parsed = parseInt(answer, 10);
        if (Number.isNaN(parsed)) {
            return;
        }
        if (parsed === a + b) {
            const ms = performance.now() - startTimeRef.current;
            setLastMs(ms);
            setState('done');
            void saveResult(ms);
        } else {
            setError(true);
            setAnswer('');
        }
    };

    useEffect(() => {
        if (state === 'playing' && error) {
            const t = setTimeout(() => setError(false), 400);
            return () => clearTimeout(t);
        }
    }, [state, error]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Addition Speed" />

            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Plus className="size-6" />
                            Addition Speed
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Add the two numbers as fast as you can. Press Enter to submit.
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
                    <div className="mx-auto w-full max-w-md">
                        <div
                            className={`flex flex-col items-center gap-6 rounded-xl border p-8 shadow-sm transition-colors ${
                                error
                                    ? 'border-red-400 bg-red-50 dark:bg-red-950/40'
                                    : 'border-border bg-white/70 dark:bg-black/40'
                            }`}
                        >
                            {state === 'idle' && (
                                <>
                                    <p className="text-center text-muted-foreground">Click start when you're ready.</p>
                                    <button
                                        type="button"
                                        onClick={startRound}
                                        className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
                                    >
                                        Start
                                    </button>
                                </>
                            )}

                            {state === 'playing' && (
                                <>
                                    <div className="font-mono text-5xl font-bold tabular-nums">
                                        {a} + {b}
                                    </div>
                                    <form onSubmit={handleSubmit} className="w-full">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ''))}
                                            autoFocus
                                            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center font-mono text-3xl focus:border-primary focus:outline-none"
                                            placeholder="?"
                                        />
                                    </form>
                                </>
                            )}

                            {state === 'done' && (
                                <>
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground">Correct!</p>
                                        <p className="font-mono text-5xl font-bold tabular-nums">
                                            {lastMs !== null ? `${(lastMs / 1000).toFixed(2)}s` : ''}
                                        </p>
                                        <p className="mt-2 font-mono text-sm text-muted-foreground">
                                            {a} + {b} = {a + b}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={startRound}
                                        className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
                                    >
                                        Next
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-border bg-white/70 p-4 shadow-sm dark:bg-black/40">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Best Time</p>
                            <p className="mt-1 text-3xl font-bold">
                                {bestResult !== null ? `${(bestResult / 1000).toFixed(2)}s` : '—'}
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
                                            <span className="font-mono">{(r.result / 1000).toFixed(2)}s</span>
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
