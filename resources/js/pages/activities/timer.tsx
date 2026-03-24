import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type Props = {
    activity: {
        id: number;
        name: string;
        description: string | null;
        color: string;
        duration_minutes: number;
        point_cost: number;
    };
};

type TimerState = 'ready' | 'running' | 'paused' | 'finished';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard() },
    { title: 'Timer', href: '#' },
];

export default function ActivityTimer({ activity }: Props) {
    const totalSeconds = activity.duration_minutes * 60;
    const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
    const [timerState, setTimerState] = useState<TimerState>('ready');
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => clearTimer();
    }, [clearTimer]);

    useEffect(() => {
        if (secondsLeft <= 0 && timerState === 'running') {
            clearTimer();
            setTimerState('finished');
            setShowConfirm(true);
        }
    }, [secondsLeft, timerState, clearTimer]);

    const start = useCallback(() => {
        setTimerState('running');
        intervalRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);
    }, []);

    const pause = useCallback(() => {
        clearTimer();
        setTimerState('paused');
    }, [clearTimer]);

    const resume = useCallback(() => {
        setTimerState('running');
        intervalRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);
    }, []);

    const reset = useCallback(() => {
        clearTimer();
        setSecondsLeft(totalSeconds);
        setTimerState('ready');
        setShowConfirm(false);
    }, [clearTimer, totalSeconds]);

    const handleComplete = useCallback(
        (completed: boolean) => {
            if (completed) {
                setSubmitting(true);
                router.post(
                    '/activity-logs',
                    {
                        activity_id: activity.id,
                        completed_at: new Date().toISOString().split('T')[0],
                        quantity: 1,
                        used_timer: true,
                    },
                    {
                        onSuccess: () => setSubmitting(false),
                        onError: () => setSubmitting(false),
                    },
                );
            } else {
                router.visit('/dashboard');
            }
        },
        [activity.id],
    );

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

    const circumference = 2 * Math.PI * 140;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Timer - ${activity.name}`} />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 p-4 lg:p-6">
                    {/* Activity info */}
                    <div className="text-center">
                        <div
                            className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
                            style={{
                                backgroundColor: activity.color + '20',
                                color: activity.color,
                            }}
                        >
                            <div
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: activity.color }}
                            />
                            {activity.name}
                        </div>
                        {activity.description && (
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                        )}
                    </div>

                    {/* Timer circle */}
                    <div className="relative">
                        <svg width="320" height="320" className="-rotate-90">
                            {/* Background circle */}
                            <circle
                                cx="160"
                                cy="160"
                                r="140"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-border/30"
                            />
                            {/* Progress circle */}
                            <circle
                                cx="160"
                                cy="160"
                                r="140"
                                fill="none"
                                stroke={activity.color}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-1000 ease-linear"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-mono text-6xl font-bold tabular-nums tracking-tight">
                                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                            </span>
                            <span className="mt-1 text-sm text-muted-foreground">
                                {activity.point_cost} pts on completion
                            </span>
                        </div>
                    </div>

                    {/* Controls */}
                    {!showConfirm ? (
                        <div className="flex items-center gap-3">
                            {timerState === 'ready' && (
                                <Button size="lg" onClick={start} className="gap-2 px-8">
                                    <Play className="size-5" />
                                    Start
                                </Button>
                            )}
                            {timerState === 'running' && (
                                <Button size="lg" variant="outline" onClick={pause} className="gap-2 px-8">
                                    <Pause className="size-5" />
                                    Pause
                                </Button>
                            )}
                            {timerState === 'paused' && (
                                <>
                                    <Button size="lg" onClick={resume} className="gap-2 px-8">
                                        <Play className="size-5" />
                                        Resume
                                    </Button>
                                    <Button size="lg" variant="outline" onClick={reset} className="gap-2">
                                        <RotateCcw className="size-5" />
                                        Reset
                                    </Button>
                                </>
                            )}
                            {timerState !== 'ready' && (
                                <Button
                                    size="lg"
                                    variant="ghost"
                                    onClick={() => router.visit('/dashboard')}
                                    className="gap-2"
                                >
                                    <X className="size-5" />
                                    Cancel
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full max-w-sm rounded-xl border border-green-200/80 bg-white/80 p-6 text-center shadow-lg backdrop-blur-sm dark:border-green-800/50 dark:bg-black/60">
                            <CheckCircle2
                                className="mx-auto mb-3 size-12"
                                style={{ color: activity.color }}
                            />
                            <h3 className="text-lg font-semibold">Time&apos;s up!</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Did you complete the activity?
                            </p>
                            <div className="mt-5 flex gap-3">
                                <Button
                                    className="flex-1"
                                    onClick={() => handleComplete(true)}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Saving...' : 'Yes, completed!'}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleComplete(false)}
                                    disabled={submitting}
                                >
                                    No, cancel
                                </Button>
                            </div>
                            <button
                                onClick={reset}
                                className="mt-3 text-sm text-muted-foreground hover:text-foreground"
                            >
                                Try again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
