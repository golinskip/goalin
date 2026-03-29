import { Head, Link, router } from '@inertiajs/react';
import { BarChart3, Calendar, CheckCircle, Clock, Gift, History, Settings, Star, Target, Zap } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Goal Tracker', href: '/goal-tracker' },
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

type RewardItem = {
    id: number;
    name: string;
    color: string;
    picture: string | null;
    cost_in_points: number;
};

type CurrentReward = RewardItem & {
    pointsProgress: number;
    percentage: number;
};

type RewardProgression = {
    totalEarned: number;
    totalSpent: number;
    availablePoints: number;
    achievedRewards: RewardItem[];
    currentReward: CurrentReward | null;
    queuedRewards: RewardItem[];
};

type Props = {
    activities: Activity[];
    rewardProgression: RewardProgression;
};

type LogMode = 'today' | 'postponed' | null;

export default function GoalTracker({ activities, rewardProgression }: Props) {
    const [logMode, setLogMode] = useState<LogMode>(null);
    const [selectedActivity, setSelectedActivity] = useState<number | null>(null);
    const [quantity, setQuantity] = useState('1');
    const [completedAt, setCompletedAt] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedTimerActivity, setSelectedTimerActivity] = useState<string>('');

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
                comment: comment || null,
            },
            {
                onSuccess: () => {
                    setLogMode(null);
                    setSelectedActivity(null);
                    setQuantity('1');
                    setCompletedAt('');
                    setComment('');
                    setSubmitting(false);
                },
                onError: () => setSubmitting(false),
            },
        );
    }, [selectedActivity, logMode, completedAt, quantity, comment, today, submitting]);

    const { achievedRewards, currentReward, queuedRewards, availablePoints } = rewardProgression;
    const hasAnyRewards = achievedRewards.length > 0 || currentReward !== null || queuedRewards.length > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Goal Tracker" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    {/* Setup Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/goals">
                                <Target className="size-4 text-emerald-500" />
                                Goals
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/activities">
                                <Zap className="size-4 text-amber-500" />
                                Activities
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/rewards">
                                <Gift className="size-4 text-purple-500" />
                                Rewards
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/statistics">
                                <BarChart3 className="size-4 text-blue-500" />
                                Statistics
                            </Link>
                        </Button>
                    </div>

                    {/* Log Activity Section */}
                    <div className="rounded-xl border border-green-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                        <h2 className="mb-3 text-lg font-semibold">Log Activity</h2>

                        {activities.length === 0 ? (
                            <div className="flex items-center justify-between gap-4 py-4">
                                <div className="flex items-center gap-3">
                                    <Zap className="size-8 text-green-400/50 dark:text-green-600/50" />
                                    <div>
                                        <p className="text-muted-foreground">No activities created yet</p>
                                        <p className="text-sm text-muted-foreground/75">
                                            Create activity types first, then come back to log them.
                                        </p>
                                    </div>
                                </div>
                                <Button asChild size="sm">
                                    <Link href="/activities/create">Create Activity</Link>
                                </Button>
                            </div>
                        ) : logMode === null ? (
                            <div className="flex flex-wrap items-center gap-3">
                                <Button variant="outline" onClick={() => setLogMode('postponed')} className="gap-2">
                                    <History className="size-4 text-orange-500" />
                                    Postponed
                                </Button>

                                <Button variant="outline" onClick={() => setLogMode('today')} className="gap-2">
                                    <Calendar className="size-4 text-green-500" />
                                    Today&apos;s Activity
                                </Button>

                                <div className="flex items-center gap-2">
                                    <Select value={selectedTimerActivity} onValueChange={setSelectedTimerActivity}>
                                        <SelectTrigger className="w-48">
                                            <Clock className="size-4 text-blue-500" />
                                            <SelectValue placeholder="Timer activity..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timerActivities.length > 0 ? (
                                                timerActivities.map((activity) => (
                                                    <SelectItem key={activity.id} value={String(activity.id)}>
                                                        <span className="flex items-center gap-2">
                                                            <span
                                                                className="inline-block size-2.5 shrink-0 rounded-full"
                                                                style={{ backgroundColor: activity.color }}
                                                            />
                                                            {activity.name}
                                                            <span className="text-xs text-muted-foreground">
                                                                {activity.duration_minutes}min
                                                            </span>
                                                        </span>
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="_none" disabled>
                                                    No timer activities
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {selectedTimerActivity && (
                                        <Button size="sm" asChild>
                                            <Link href={`/activities/${selectedTimerActivity}/timer`}>Start</Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setLogMode(null);
                                            setSelectedActivity(null);
                                            setQuantity('1');
                                            setCompletedAt('');
                                            setComment('');
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
                                    <div className="grid gap-1.5">
                                        <Label>Select Activity</Label>
                                        <div className="grid gap-1.5">
                                            {activities.map((activity) => (
                                                <button
                                                    key={activity.id}
                                                    onClick={() => setSelectedActivity(activity.id)}
                                                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                                                        selectedActivity === activity.id
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-border/50 hover:border-border'
                                                    }`}
                                                >
                                                    <div
                                                        className="size-3.5 shrink-0 rounded-full"
                                                        style={{ backgroundColor: activity.color }}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">{activity.name}</p>
                                                        {activity.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {activity.tags.map((tag) => (
                                                                    <span key={tag} className="text-[10px] text-muted-foreground">
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

                                    <div className="space-y-3">
                                        {logMode === 'postponed' && (
                                            <div className="grid gap-1.5">
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

                                        <div className="grid gap-1.5">
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

                                        <div className="grid gap-1.5">
                                            <Label htmlFor="comment">Comment</Label>
                                            <textarea
                                                id="comment"
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                placeholder="Optional note..."
                                                rows={2}
                                                maxLength={1000}
                                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                            />
                                        </div>

                                        {selectedActivity && (
                                            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">Points to earn:</p>
                                                <p className="text-xl font-semibold text-primary">
                                                    {(activities.find((a) => a.id === selectedActivity)?.point_cost ?? 0) *
                                                        (parseInt(quantity) || 1)}{' '}
                                                    pts
                                                </p>
                                            </div>
                                        )}

                                        <Button
                                            onClick={handleLogActivity}
                                            disabled={!selectedActivity || submitting || (logMode === 'postponed' && !completedAt)}
                                            className="w-full"
                                        >
                                            {submitting ? 'Saving...' : 'Log Activity'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reward Progression */}
                    {hasAnyRewards && (
                        <div className="rounded-xl border border-purple-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-purple-800/50 dark:bg-black/40">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Reward Progress</h2>
                                <span className="text-sm text-muted-foreground">{availablePoints} pts available</span>
                            </div>

                            {/* Current Reward Progress */}
                            {currentReward ? (
                                <div className="mb-6">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/50"
                                            style={{ backgroundColor: currentReward.color + '20' }}
                                        >
                                            {currentReward.picture ? (
                                                <img
                                                    src={currentReward.picture}
                                                    alt={currentReward.name}
                                                    className="size-10 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <Gift className="size-6" style={{ color: currentReward.color }} />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="truncate font-medium">{currentReward.name}</p>
                                                <p className="shrink-0 text-sm text-muted-foreground">
                                                    {currentReward.pointsProgress} / {currentReward.cost_in_points} pts
                                                </p>
                                            </div>
                                            <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${currentReward.percentage}%`,
                                                        backgroundColor: currentReward.color,
                                                    }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {currentReward.percentage}% complete
                                                {currentReward.cost_in_points - currentReward.pointsProgress > 0 && (
                                                    <>
                                                        {' '}
                                                        &middot; {currentReward.cost_in_points - currentReward.pointsProgress} pts to go
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : achievedRewards.length > 0 && queuedRewards.length === 0 ? (
                                <div className="mb-6 flex flex-col items-center rounded-lg border border-green-200/50 bg-green-50/50 py-6 text-center dark:border-green-800/30 dark:bg-green-900/10">
                                    <CheckCircle className="mb-2 size-8 text-green-500" />
                                    <p className="font-medium text-green-700 dark:text-green-400">All rewards achieved!</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Add more rewards to keep the momentum going.
                                    </p>
                                    <Button asChild variant="outline" size="sm" className="mt-3">
                                        <Link href="/rewards/create">Add Reward</Link>
                                    </Button>
                                </div>
                            ) : null}

                            {/* Achieved & Queued */}
                            {(achievedRewards.length > 0 || queuedRewards.length > 0) && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {achievedRewards.length > 0 && (
                                        <div>
                                            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                                                Achieved ({achievedRewards.length})
                                            </h3>
                                            <div className="space-y-2">
                                                {achievedRewards.map((reward) => (
                                                    <div
                                                        key={reward.id}
                                                        className="flex items-center gap-3 rounded-lg border border-green-200/50 bg-green-50/30 p-3 dark:border-green-800/30 dark:bg-green-900/10"
                                                    >
                                                        <div
                                                            className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                                                            style={{ backgroundColor: reward.color + '20' }}
                                                        >
                                                            {reward.picture ? (
                                                                <img
                                                                    src={reward.picture}
                                                                    alt={reward.name}
                                                                    className="size-6 rounded object-cover"
                                                                />
                                                            ) : (
                                                                <Gift className="size-4" style={{ color: reward.color }} />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium">{reward.name}</p>
                                                        </div>
                                                        <CheckCircle className="size-4 shrink-0 text-green-500" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {queuedRewards.length > 0 && (
                                        <div>
                                            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                                                Up Next ({queuedRewards.length})
                                            </h3>
                                            <div className="space-y-2">
                                                {queuedRewards.map((reward, index) => (
                                                    <div
                                                        key={reward.id}
                                                        className="flex items-center gap-3 rounded-lg border border-border/30 bg-white/30 p-3 dark:bg-white/5"
                                                    >
                                                        <div
                                                            className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                                                            style={{ backgroundColor: reward.color + '20' }}
                                                        >
                                                            {reward.picture ? (
                                                                <img
                                                                    src={reward.picture}
                                                                    alt={reward.name}
                                                                    className="size-6 rounded object-cover"
                                                                />
                                                            ) : (
                                                                <Gift className="size-4" style={{ color: reward.color }} />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium">{reward.name}</p>
                                                            <p className="text-xs text-muted-foreground">{reward.cost_in_points} pts</p>
                                                        </div>
                                                        <span className="shrink-0 text-xs text-muted-foreground/50">#{index + 1}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
