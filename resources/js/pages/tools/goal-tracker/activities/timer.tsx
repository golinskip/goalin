import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Music, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { index as goalTrackerIndex } from '@/routes/goal-tracker';
import type { BreadcrumbItem } from '@/types';

type TimerMusicFile = {
    id: number;
    title: string;
    artist: string | null;
    duration_seconds: number | null;
};

type Props = {
    activity: {
        id: number;
        name: string;
        description: string | null;
        color: string;
        duration_minutes: number;
        point_cost: number;
    };
    timerMusic: TimerMusicFile[];
};

type TimerState = 'running' | 'paused' | 'finished';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Goal Tracker', href: goalTrackerIndex() },
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

function MiniPlayer({ tracks }: { tracks: TimerMusicFile[] }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const currentTrack = tracks[currentIndex];

    const play = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;

        if (audio.src !== `/music/${currentTrack.id}/stream`) {
            audio.src = `/music/${currentTrack.id}/stream`;
        }
        audio.play();
        setIsPlaying(true);
    }, [currentTrack]);

    const pause = useCallback(() => {
        audioRef.current?.pause();
        setIsPlaying(false);
    }, []);

    const togglePlay = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }, [isPlaying, play, pause]);

    const skipNext = useCallback(() => {
        const nextIndex = (currentIndex + 1) % tracks.length;
        setCurrentIndex(nextIndex);
        const audio = audioRef.current;
        if (audio) {
            audio.src = `/music/${tracks[nextIndex].id}/stream`;
            if (isPlaying) audio.play();
        }
    }, [currentIndex, tracks, isPlaying]);

    const skipPrev = useCallback(() => {
        const audio = audioRef.current;
        if (audio && audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
        setCurrentIndex(prevIndex);
        if (audio) {
            audio.src = `/music/${tracks[prevIndex].id}/stream`;
            if (isPlaying) audio.play();
        }
    }, [currentIndex, tracks, isPlaying]);

    const toggleMute = useCallback(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.muted = !audio.muted;
            setIsMuted(!isMuted);
        }
    }, [isMuted]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => {
            if (tracks.length > 1) {
                skipNext();
            } else {
                audio.currentTime = 0;
                audio.play();
            }
        };

        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, [skipNext, tracks.length]);

    return (
        <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-black/5 px-4 py-2.5 backdrop-blur-sm dark:bg-white/5">
            <audio ref={audioRef} className="hidden" />

            <Music className="size-4 shrink-0 text-muted-foreground/50" />

            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{currentTrack.title}</p>
                {currentTrack.artist && (
                    <p className="truncate text-[10px] text-muted-foreground">{currentTrack.artist}</p>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
                {tracks.length > 1 && (
                    <button
                        onClick={skipPrev}
                        className="rounded-md p-1 text-muted-foreground/60 hover:text-foreground"
                    >
                        <SkipBack className="size-3.5" />
                    </button>
                )}
                <button
                    onClick={togglePlay}
                    className="flex size-7 items-center justify-center rounded-full bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20"
                >
                    {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 translate-x-px" />}
                </button>
                {tracks.length > 1 && (
                    <button
                        onClick={skipNext}
                        className="rounded-md p-1 text-muted-foreground/60 hover:text-foreground"
                    >
                        <SkipForward className="size-3.5" />
                    </button>
                )}
                <button
                    onClick={toggleMute}
                    className="rounded-md p-1 text-muted-foreground/60 hover:text-foreground"
                >
                    {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                </button>
            </div>
        </div>
    );
}

export default function ActivityTimer({ activity, timerMusic }: Props) {
    const totalSeconds = activity.duration_minutes * 60;
    const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
    const [timerState, setTimerState] = useState<TimerState>('running');
    const [showConfirm, setShowConfirm] = useState(false);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Wall-clock tracking: remember when the timer was started and how many
    // seconds had already elapsed at that point. On every tick (and on
    // visibility change) we recompute secondsLeft from Date.now() so the
    // timer stays accurate even if the browser throttles setInterval.
    const startedAtRef = useRef<number>(Date.now());
    const elapsedBeforePauseRef = useRef<number>(0);

    const computeSecondsLeft = useCallback(() => {
        const elapsed = elapsedBeforePauseRef.current + (Date.now() - startedAtRef.current) / 1000;
        return Math.max(0, Math.round(totalSeconds - elapsed));
    }, [totalSeconds]);

    const clearTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const startInterval = useCallback(() => {
        startedAtRef.current = Date.now();
        intervalRef.current = setInterval(() => {
            setSecondsLeft(computeSecondsLeft());
        }, 250);
    }, [computeSecondsLeft]);

    // Auto-start on mount
    useEffect(() => {
        startInterval();
        return () => clearTimer();
    }, [startInterval, clearTimer]);

    // Sync on tab re-focus (catches throttled intervals in background tabs)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && timerState === 'running') {
                setSecondsLeft(computeSecondsLeft());
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [timerState, computeSecondsLeft]);

    useEffect(() => {
        if (secondsLeft <= 0 && timerState === 'running') {
            clearTimer();
            setTimerState('finished');
            setShowConfirm(true);
            createRingSound();
        }
    }, [secondsLeft, timerState, clearTimer]);

    const timerPause = useCallback(() => {
        // Capture elapsed time so far
        elapsedBeforePauseRef.current += (Date.now() - startedAtRef.current) / 1000;
        clearTimer();
        setTimerState('paused');
    }, [clearTimer]);

    const resume = useCallback(() => {
        setTimerState('running');
        startInterval();
    }, [startInterval]);

    const reset = useCallback(() => {
        clearTimer();
        elapsedBeforePauseRef.current = 0;
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
                        comment: comment || null,
                    },
                    {
                        onSuccess: () => setSubmitting(false),
                        onError: () => setSubmitting(false),
                    },
                );
            } else {
                router.visit('/goal-tracker');
            }
        },
        [activity.id, comment],
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
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Optional comment..."
                                rows={2}
                                maxLength={1000}
                                className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                            />
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
                                <Button size="lg" variant="outline" onClick={timerPause} className="gap-2 px-8">
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
                                onClick={() => router.visit('/goal-tracker')}
                                className="gap-2"
                            >
                                <X className="size-5" />
                                Cancel
                            </Button>
                        </div>
                    )}

                    {/* Mini Music Player */}
                    <div className="w-full max-w-sm">
                        {timerMusic.length > 0 ? (
                            <MiniPlayer tracks={timerMusic} />
                        ) : (
                            <div className="flex items-center gap-2.5 rounded-xl border border-border/30 bg-black/5 px-4 py-2.5 backdrop-blur-sm dark:bg-white/5">
                                <Music className="size-4 shrink-0 text-muted-foreground/40" />
                                <p className="text-xs text-muted-foreground">
                                    Tag music files with <span className="font-medium">&ldquo;timer&rdquo;</span> in the Music Player to play them here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
