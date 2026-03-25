import { Head, router } from '@inertiajs/react';
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Clock, Flame, Star, Trophy, Zap } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { statistics } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Statistics', href: statistics() },
];

const CALENDAR_CALENDAR_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ISO_CALENDAR_WEEKDAY_LABELS: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

type DayLog = {
    id: number;
    activity_name: string;
    activity_color: string;
    quantity: number;
    points_earned: number;
    used_timer: boolean;
    comment: string | null;
    created_at: string;
};

type WeekdayStat = {
    weekday: number;
    activities: number;
    points: number;
};

type CalendarDay = {
    activities: number;
    points: number;
};

type Props = {
    month: string;
    selectedDate: string | null;
    calendarDays: Record<string, CalendarDay>;
    weekdayStats: WeekdayStat[];
    totalDays: number;
    currentStreak: number;
    longestStreak: number;
    totalActivities: number;
    totalPoints: number;
    dayLogs: DayLog[];
};

function getMonthLabel(month: string): string {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getCalendarGrid(month: string): (string | null)[][] {
    const [year, m] = month.split('-');
    const firstDay = new Date(parseInt(year), parseInt(m) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(m), 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const weeks: (string | null)[][] = [];
    let currentWeek: (string | null)[] = Array(startDow).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${m}-${String(day).padStart(2, '0')}`;
        currentWeek.push(dateStr);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
            currentWeek.push(null);
        }
        weeks.push(currentWeek);
    }

    return weeks;
}

function shiftMonth(month: string, delta: number): string {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function Statistics({
    month,
    selectedDate,
    calendarDays,
    weekdayStats,
    totalDays,
    currentStreak,
    longestStreak,
    totalActivities,
    totalPoints,
    dayLogs,
}: Props) {
    const today = new Date().toISOString().split('T')[0];
    const weeks = getCalendarGrid(month);

    const maxActivities = Math.max(...Object.values(calendarDays).map((d) => d.activities), 1);

    const weekdayMax = Math.max(...weekdayStats.map((s) => s.activities), 1);
    const bestWeekday = weekdayStats.reduce(
        (best, stat) => (stat.activities > best.activities ? stat : best),
        { weekday: 0, activities: 0, points: 0 },
    );

    const navigateMonth = useCallback(
        (delta: number) => {
            const newMonth = shiftMonth(month, delta);
            router.get(
                statistics.url({ query: { month: newMonth } }),
                {},
                { preserveState: true, preserveScroll: true },
            );
        },
        [month],
    );

    const selectDate = useCallback(
        (date: string) => {
            router.get(
                statistics.url({ query: { month, date: date === selectedDate ? undefined : date } }),
                {},
                { preserveState: true, preserveScroll: true },
            );
        },
        [month, selectedDate],
    );

    const selectedDateLabel = selectedDate
        ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
          })
        : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Statistics" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    {/* Overview Stats */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-green-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/15">
                                    <Zap className="size-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Activities</p>
                                    <p className="text-2xl font-semibold">{totalActivities}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-yellow-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-yellow-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-500/15">
                                    <Star className="size-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Points</p>
                                    <p className="text-2xl font-semibold">{totalPoints}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-orange-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-orange-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/15">
                                    <Flame className="size-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Current Streak</p>
                                    <p className="text-2xl font-semibold">
                                        {currentStreak} <span className="text-sm font-normal text-muted-foreground">days</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-purple-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-purple-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/15">
                                    <Trophy className="size-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Longest Streak</p>
                                    <p className="text-2xl font-semibold">
                                        {longestStreak} <span className="text-sm font-normal text-muted-foreground">days</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Calendar */}
                        <div className="rounded-xl border border-blue-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm lg:col-span-2 dark:border-blue-800/50 dark:bg-black/40">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-lg font-semibold">
                                    <CalendarDays className="size-5" />
                                    {getMonthLabel(month)}
                                </h2>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => navigateMonth(-1)}>
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => navigateMonth(1)}>
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {CALENDAR_WEEKDAY_LABELS.map((label) => (
                                    <div key={label} className="py-1 text-center text-xs font-medium text-muted-foreground">
                                        {label}
                                    </div>
                                ))}

                                {weeks.flat().map((dateStr, i) => {
                                    if (!dateStr) {
                                        return <div key={`empty-${i}`} className="aspect-square" />;
                                    }

                                    const dayNum = parseInt(dateStr.split('-')[2]);
                                    const dayData = calendarDays[dateStr];
                                    const isToday = dateStr === today;
                                    const isSelected = dateStr === selectedDate;
                                    const intensity = dayData ? Math.min(dayData.activities / maxActivities, 1) : 0;

                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => selectDate(dateStr)}
                                            className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-all ${
                                                isSelected
                                                    ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                                                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                                            } ${isToday ? 'font-bold' : ''}`}
                                        >
                                            <span className={isToday ? 'text-primary' : ''}>{dayNum}</span>
                                            {dayData && (
                                                <div
                                                    className="mt-0.5 size-2 rounded-full"
                                                    style={{
                                                        backgroundColor: `rgba(34, 197, 94, ${0.3 + intensity * 0.7})`,
                                                    }}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{totalDays} active days total</span>
                                <div className="flex items-center gap-1.5">
                                    <span>Less</span>
                                    {[0.15, 0.35, 0.6, 0.85, 1].map((opacity) => (
                                        <div
                                            key={opacity}
                                            className="size-3 rounded-sm"
                                            style={{ backgroundColor: `rgba(34, 197, 94, ${opacity})` }}
                                        />
                                    ))}
                                    <span>More</span>
                                </div>
                            </div>
                        </div>

                        {/* Best Weekdays */}
                        <div className="rounded-xl border border-indigo-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-indigo-800/50 dark:bg-black/40">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                <BarChart3 className="size-5" />
                                Best Weekdays
                            </h2>

                            {weekdayStats.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5, 6, 7].map((isoDay) => {
                                        const label = ISO_WEEKDAY_LABELS[isoDay];
                                        const stat = weekdayStats.find((s) => s.weekday === isoDay);
                                        const activities = stat?.activities ?? 0;
                                        const points = stat?.points ?? 0;
                                        const percentage = weekdayMax > 0 ? (activities / weekdayMax) * 100 : 0;
                                        const isBest = stat && bestWeekday.weekday === stat.weekday && activities > 0;

                                        return (
                                            <div key={label}>
                                                <div className="mb-1 flex items-center justify-between text-sm">
                                                    <span className={`font-medium ${isBest ? 'text-primary' : ''}`}>
                                                        {label} {isBest && '(best)'}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {activities} activities &middot; {points} pts
                                                    </span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${percentage}%`,
                                                            backgroundColor: isBest ? 'var(--primary)' : 'rgb(99, 102, 241)',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Day Detail */}
                    {selectedDate && (
                        <div className="rounded-xl border border-green-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                            <h2 className="mb-4 text-lg font-semibold">{selectedDateLabel}</h2>

                            {dayLogs.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">No activities logged on this day</p>
                            ) : (
                                <div className="space-y-2">
                                    {dayLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-center gap-3 rounded-lg border border-border/50 bg-white/50 p-3 dark:bg-white/5"
                                        >
                                            <div
                                                className="size-3.5 shrink-0 rounded-full"
                                                style={{ backgroundColor: log.activity_color }}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-medium">{log.activity_name}</p>
                                                    {log.used_timer && <Clock className="size-3.5 text-blue-500" />}
                                                </div>
                                                {log.comment && (
                                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{log.comment}</p>
                                                )}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-sm font-medium text-primary">+{log.points_earned} pts</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {log.quantity > 1 && <>&times;{log.quantity} &middot; </>}
                                                    {log.created_at}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between border-t border-border/50 pt-3 text-sm">
                                        <span className="text-muted-foreground">
                                            {dayLogs.reduce((sum, l) => sum + l.quantity, 0)} activities
                                        </span>
                                        <span className="font-semibold text-primary">
                                            {dayLogs.reduce((sum, l) => sum + l.points_earned, 0)} pts earned
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
