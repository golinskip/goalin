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

type TimerState = 'running' | 'paused' | 'finished';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard() },
    { title: 'Timer', href: '#' },
];

function createRingSound(): () => void {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const frequencies = [880, 1108.73, 880, 1108.73, 880];
    const noteDuration = 0.15;
    const gap = 0.08;

    frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.value = freq;

        const start = now + i * (noteDuration + gap);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
        gain.gain.linearRampToValueAtTime(0, start + noteDuration);

        osc.start(start);
        osc.stop(start + noteDuration);
    });

    return () => ctx.close();
}

export default function ActivityTimer({ activity }: Props) {
    const totalSeconds = activity.duration_minutes * 60;
    const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
    const [timerState, setTimerState] = useState<TimerState>('running');
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const startInterval = useCallback(() => {
        intervalRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);
    }, []);

    // Auto-start on mount
    useEffect(() => {
        startInterval();
        return () => clearTimer();
    }, [startInterval, clearTimer]);

    useEffect(() => {
        if (secondsLeft <= 0 && timerState === 'running') {
            clearTimer();
            setTimerState('finished');
            setShowConfirm(true);
            createRingSound();
        }
    }, [secondsLeft, timerState, clearTimer]);

    const pause = useCallback(() => {
        clearTimer();
        setTimerState('paused');
    }, [clearTimer]);

    const resume = useCallback(() => {
        setTimerState('running');
        startInterval();
    }, [startInterval]);

    const reset = useCallback(() => {
        clearTimer();
        setSecondsLeft(totalSeconds);
        setTimerState('running');
        setShowConfirm(false);
        startInterval();
    }, [clearTimer, totalSeconds, startInterval]);

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

    // Wake Lock to prevent screen sleep
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    useEffect(() => {
        async function requestWakeLock() {
            if ('wakeLock' in navigator) {
                try {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                } catch {
                    // Wake lock request failed (e.g. low battery)
                }
            }
        }

        requestWakeLock();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            wakeLockRef.current?.release();
            wakeLockRef.current = null;
        };
    }, []);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

    const circumference = 2 * Math.PI * 140;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const tabTitle =
        timerState === 'finished'
            ? `Done! - ${activity.name}`
            : timerState === 'paused'
              ? `${timeDisplay} (paused) - ${activity.name}`
              : `${timeDisplay} - ${activity.name}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={tabTitle} />

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

                    {/* Completion buttons - above timer when finished */}
                    {showConfirm && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-2" style={{ color: activity.color }}>
                                <CheckCircle2 className="size-6" />
                                <span className="text-lg font-semibold">Time&apos;s up!</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Did you complete the activity?</p>
                            <div className="flex gap-3">
                                <Button
                                    size="lg"
                                    onClick={() => handleComplete(true)}
                                    disabled={submitting}
                                    className="px-8"
                                >
                                    {submitting ? 'Saving...' : 'Yes, completed!'}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => handleComplete(false)}
                                    disabled={submitting}
                                >
                                    No, cancel
                                </Button>
                                <Button
                                    size="lg"
                                    variant="ghost"
                                    onClick={reset}
                                    className="gap-2"
                                >
                                    <RotateCcw className="size-4" />
                                    Try again
                                </Button>
                            </div>
                        </div>
                    )}

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
                                {timeDisplay}
                            </span>
                            <span className="mt-1 text-sm text-muted-foreground">
                                {activity.point_cost} pts on completion
                            </span>
                        </div>
                    </div>

                    {/* Controls - below timer when running/paused */}
                    {!showConfirm && (
                        <div className="flex items-center gap-3">
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
                            <Button
                                size="lg"
                                variant="ghost"
                                onClick={() => router.visit('/dashboard')}
                                className="gap-2"
                            >
                                <X className="size-5" />
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
