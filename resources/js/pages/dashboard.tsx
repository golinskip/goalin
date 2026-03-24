import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Clock, History, Star, Target, TrendingUp, Zap } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    },
];

type Activity = {
    id: number;
    name: string;
    description: string | null;
    point_cost: number;
    color: string;
    needs_timer: boolean;
    duration_minutes: number | null;
    tags: string[];
};

type Props = {
    activities: Activity[];
    todayPoints: number;
    totalPoints: number;
    todayActivities: number;
    totalActivities: number;
};

type LogMode = 'today' | 'postponed' | null;

export default function Dashboard({
    activities,
    todayPoints,
    totalPoints,
    todayActivities,
    totalActivities,
}: Props) {
    const [logMode, setLogMode] = useState<LogMode>(null);
    const [selectedActivity, setSelectedActivity] = useState<number | null>(null);
    const [quantity, setQuantity] = useState('1');
    const [completedAt, setCompletedAt] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const timerActivities = activities.filter((a) => a.needs_timer);
    const today = new Date().toISOString().split('T')[0];

    const handleLogActivity = useCallback(() => {
        if (!selectedActivity || submitting) return;

        setSubmitting(true);
        router.post(
            '/activity-logs',
            {
                activity_id: selectedActivity,
                completed_at: logMode === 'postponed' ? completedAt : today,
                quantity: parseInt(quantity) || 1,
                used_timer: false,
            },
            {
                onSuccess: () => {
                    setLogMode(null);
                    setSelectedActivity(null);
                    setQuantity('1');
                    setCompletedAt('');
                    setSubmitting(false);
                },
                onError: () => setSubmitting(false),
            },
        );
    }, [selectedActivity, logMode, completedAt, quantity, today, submitting]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    {/* Stats */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-green-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/15">
                                    <Zap className="size-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Today&apos;s Activities</p>
                                    <p className="text-2xl font-semibold">{todayActivities}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-yellow-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-yellow-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-500/15">
                                    <Star className="size-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Today&apos;s Points</p>
                                    <p className="text-2xl font-semibold">{todayPoints}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-blue-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-blue-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/15">
                                    <Target className="size-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Activities</p>
                                    <p className="text-2xl font-semibold">{totalActivities}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-green-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/15">
                                    <TrendingUp className="size-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Points</p>
                                    <p className="text-2xl font-semibold">{totalPoints}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Log Activity Section */}
                    <div className="rounded-xl border border-green-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                        <h2 className="mb-4 text-lg font-semibold">Log Activity</h2>

                        {activities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Zap className="mb-3 size-12 text-green-400/50 dark:text-green-600/50" />
                                <p className="text-muted-foreground">No activities created yet</p>
                                <p className="mt-1 text-sm text-muted-foreground/75">
                                    Create activity types first, then come back to log them.
                                </p>
                                <Button asChild className="mt-4">
                                    <Link href="/activities/create">Create Activity</Link>
                                </Button>
                            </div>
                        ) : logMode === null ? (
                            <div className="grid gap-4 sm:grid-cols-3">
                                <button
                                    onClick={() => setLogMode('postponed')}
                                    className="group flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-white/50 p-6 transition-all hover:border-primary/30 hover:bg-primary/5 dark:bg-black/20 dark:hover:bg-primary/10"
                                >
                                    <div className="flex size-12 items-center justify-center rounded-full bg-orange-500/15 transition-colors group-hover:bg-orange-500/25">
                                        <History className="size-6 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-medium">Postponed Activity</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Log a past activity with a specific date
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setLogMode('today')}
                                    className="group flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-white/50 p-6 transition-all hover:border-primary/30 hover:bg-primary/5 dark:bg-black/20 dark:hover:bg-primary/10"
                                >
                                    <div className="flex size-12 items-center justify-center rounded-full bg-green-500/15 transition-colors group-hover:bg-green-500/25">
                                        <Calendar className="size-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-medium">Today&apos;s Activity</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Log a just finished activity for today
                                        </p>
                                    </div>
                                </button>

                                <div className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-white/50 p-6 dark:bg-black/20">
                                    <div className="flex size-12 items-center justify-center rounded-full bg-blue-500/15">
                                        <Clock className="size-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-medium">Timer Activity</p>
                                        <p className="mb-3 mt-1 text-xs text-muted-foreground">
                                            Start a countdown timer for an activity
                                        </p>
                                    </div>
                                    {timerActivities.length > 0 ? (
                                        <div className="flex w-full flex-col gap-2">
                                            {timerActivities.map((activity) => (
                                                <Button
                                                    key={activity.id}
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full justify-start"
                                                    asChild
                                                >
                                                    <Link href={`/activities/${activity.id}/timer`}>
                                                        <div
                                                            className="mr-2 size-3 rounded-full"
                                                            style={{ backgroundColor: activity.color }}
                                                        />
                                                        <span className="truncate">{activity.name}</span>
                                                        <span className="ml-auto text-xs text-muted-foreground">
                                                            {activity.duration_minutes}min
                                                        </span>
                                                    </Link>
                                                </Button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground/50">
                                            No timer activities configured
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setLogMode(null);
                                            setSelectedActivity(null);
                                            setQuantity('1');
                                            setCompletedAt('');
                                        }}
                                        className="text-sm text-muted-foreground hover:text-foreground"
                                    >
                                        &larr; Back
                                    </button>
                                    <h3 className="font-medium">
                                        {logMode === 'today' ? "Today's Activity" : 'Postponed Activity'}
                                    </h3>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>Select Activity</Label>
                                        <div className="grid gap-2">
                                            {activities.map((activity) => (
                                                <button
                                                    key={activity.id}
                                                    onClick={() => setSelectedActivity(activity.id)}
                                                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                                        selectedActivity === activity.id
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-border/50 hover:border-border'
                                                    }`}
                                                >
                                                    <div
                                                        className="size-4 shrink-0 rounded-full"
                                                        style={{ backgroundColor: activity.color }}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">{activity.name}</p>
                                                        {activity.tags.length > 0 && (
                                                            <div className="mt-0.5 flex flex-wrap gap-1">
                                                                {activity.tags.map((tag) => (
                                                                    <span
                                                                        key={tag}
                                                                        className="text-[10px] text-muted-foreground"
                                                                    >
                                                                        #{tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="shrink-0 text-sm font-medium text-primary">
                                                        {activity.point_cost} pts
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {logMode === 'postponed' && (
                                            <div className="grid gap-2">
                                                <Label htmlFor="completed_at">Date</Label>
                                                <Input
                                                    id="completed_at"
                                                    type="date"
                                                    max={today}
                                                    value={completedAt}
                                                    onChange={(e) => setCompletedAt(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        )}

                                        <div className="grid gap-2">
                                            <Label htmlFor="quantity">Number of times</Label>
                                            <Input
                                                id="quantity"
                                                type="number"
                                                min="1"
                                                max="999"
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                            />
                                        </div>

                                        {selectedActivity && (
                                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                                                <p className="text-sm text-muted-foreground">Points to earn:</p>
                                                <p className="text-2xl font-semibold text-primary">
                                                    {(activities.find((a) => a.id === selectedActivity)?.point_cost ?? 0) *
                                                        (parseInt(quantity) || 1)}{' '}
                                                    pts
                                                </p>
                                            </div>
                                        )}

                                        <Button
                                            onClick={handleLogActivity}
                                            disabled={
                                                !selectedActivity ||
                                                submitting ||
                                                (logMode === 'postponed' && !completedAt)
                                            }
                                            className="w-full"
                                        >
                                            {submitting ? 'Saving...' : 'Log Activity'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
