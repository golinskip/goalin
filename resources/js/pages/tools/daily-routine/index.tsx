import { Head, router, useForm } from '@inertiajs/react';
import { Check, ChevronLeft, ChevronRight, ListChecks, Pencil, Plus, SkipForward, Trash2, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
    destroy as destroyTask,
    store as storeTask,
    update as updateTask,
} from '@/actions/Domain/Tools/DailyRoutine/Controllers/RoutineTaskController';
import PageBackground from '@/components/page-background';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { index as dailyRoutineIndex } from '@/routes/daily-routine';
import { log as logRoute } from '@/routes/routine-tasks';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Daily Routine', href: dailyRoutineIndex() }];

const WEEKDAYS: { value: number; short: string; long: string }[] = [
    { value: 1, short: 'Mon', long: 'Monday' },
    { value: 2, short: 'Tue', long: 'Tuesday' },
    { value: 3, short: 'Wed', long: 'Wednesday' },
    { value: 4, short: 'Thu', long: 'Thursday' },
    { value: 5, short: 'Fri', long: 'Friday' },
    { value: 6, short: 'Sat', long: 'Saturday' },
    { value: 7, short: 'Sun', long: 'Sunday' },
];

const COLOR_OPTIONS = ['emerald', 'sky', 'rose', 'amber', 'violet', 'teal', 'orange', 'pink'];

const COLOR_DOT: Record<string, string> = {
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    violet: 'bg-violet-500',
    teal: 'bg-teal-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
};

type RoutineTaskStatus = 'done' | 'skipped' | 'missed';

type RoutineTask = {
    id: number;
    name: string;
    color: string | null;
    weekdays: number[];
    starts_on: string;
    ends_on: string;
};

type TaskForDay = {
    id: number;
    name: string;
    color: string | null;
    status: RoutineTaskStatus | null;
};

type CalendarDay = {
    date: string;
    scheduled: number;
    done: number;
    skipped: number;
    percent: number | null;
};

type Props = {
    selectedDate: string;
    today: string;
    tasks: RoutineTask[];
    tasksForSelectedDay: TaskForDay[];
    calendar: CalendarDay[];
};

function endOfYearString(): string {
    const today = new Date();

    return `${today.getFullYear()}-12-31`;
}

function todayString(): string {
    return new Date().toISOString().split('T')[0];
}

function formatDateLabel(dateStr: string): string {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

function calendarTone(day: CalendarDay): { className: string; label: string } {
    if (day.percent === null) {
        return { className: 'bg-muted-foreground/15 text-muted-foreground', label: 'No task' };
    }

    if (day.percent >= 90) {
        return { className: 'bg-emerald-500/80 text-white', label: `${day.percent}%` };
    }

    if (day.percent >= 70) {
        return { className: 'bg-emerald-500/55 text-emerald-950 dark:text-emerald-50', label: `${day.percent}%` };
    }

    if (day.percent >= 50) {
        return { className: 'bg-amber-400/70 text-amber-950 dark:text-amber-50', label: `${day.percent}%` };
    }

    if (day.percent >= 25) {
        return { className: 'bg-orange-500/70 text-orange-950 dark:text-orange-50', label: `${day.percent}%` };
    }

    return { className: 'bg-rose-500/75 text-rose-950 dark:text-rose-50', label: `${day.percent}%` };
}

type TaskFormData = {
    name: string;
    color: string;
    weekdays: number[];
    starts_on: string;
    ends_on: string;
};

function TaskFormDialog({
    open,
    onOpenChange,
    editing,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: RoutineTask | null;
}) {
    const initialData: TaskFormData = useMemo(
        () =>
            editing
                ? {
                      name: editing.name,
                      color: editing.color ?? 'emerald',
                      weekdays: editing.weekdays,
                      starts_on: editing.starts_on,
                      ends_on: editing.ends_on,
                  }
                : {
                      name: '',
                      color: 'emerald',
                      weekdays: [1, 2, 3, 4, 5, 6, 7],
                      starts_on: todayString(),
                      ends_on: endOfYearString(),
                  },
        [editing],
    );

    const form = useForm<TaskFormData>(initialData);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const onSuccess = () => {
            form.reset();
            onOpenChange(false);
        };

        if (editing) {
            form.put(updateTask.url(editing.id), { preserveScroll: true, onSuccess });
        } else {
            form.post(storeTask.url(), { preserveScroll: true, onSuccess });
        }
    };

    const toggleWeekday = (day: number) => {
        const current = form.data.weekdays;
        form.setData(
            'weekdays',
            current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b),
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    form.clearErrors();
                    form.setData(initialData);
                }

                onOpenChange(next);
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editing ? 'Edit task' : 'New routine task'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            placeholder="e.g. Read 20 pages"
                            autoFocus
                        />
                        {form.errors.name && <p className="text-xs text-destructive">{form.errors.name}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Repeat on</label>
                        <div className="flex flex-wrap gap-1.5">
                            {WEEKDAYS.map((day) => {
                                const active = form.data.weekdays.includes(day.value);

                                return (
                                    <button
                                        type="button"
                                        key={day.value}
                                        onClick={() => toggleWeekday(day.value)}
                                        className={cn(
                                            'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                                            active
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-border bg-background hover:bg-muted',
                                        )}
                                    >
                                        {day.short}
                                    </button>
                                );
                            })}
                        </div>
                        {form.errors.weekdays && <p className="text-xs text-destructive">{form.errors.weekdays}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((color) => (
                                <button
                                    type="button"
                                    key={color}
                                    onClick={() => form.setData('color', color)}
                                    aria-label={color}
                                    className={cn(
                                        'size-7 rounded-full ring-offset-background transition-all',
                                        COLOR_DOT[color],
                                        form.data.color === color
                                            ? 'ring-2 ring-foreground ring-offset-2'
                                            : 'opacity-70 hover:opacity-100',
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Start date</label>
                            <Input
                                type="date"
                                value={form.data.starts_on}
                                onChange={(e) => form.setData('starts_on', e.target.value)}
                            />
                            {form.errors.starts_on && <p className="text-xs text-destructive">{form.errors.starts_on}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">End date</label>
                            <Input
                                type="date"
                                value={form.data.ends_on}
                                onChange={(e) => form.setData('ends_on', e.target.value)}
                            />
                            {form.errors.ends_on && <p className="text-xs text-destructive">{form.errors.ends_on}</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {editing ? 'Save changes' : 'Create task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function DailyRoutineIndex({ selectedDate, today, tasks, tasksForSelectedDay, calendar }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<RoutineTask | null>(null);

    const navigateDate = useCallback((date: string) => {
        router.get(
            dailyRoutineIndex.url({ query: { date } }),
            {},
            { preserveState: true, preserveScroll: true },
        );
    }, []);

    const shiftDate = useCallback(
        (delta: number) => {
            const next = new Date(selectedDate + 'T12:00:00');
            next.setDate(next.getDate() + delta);
            const nextStr = next.toISOString().split('T')[0];

            if (nextStr > today) {
                return;
            }

            navigateDate(nextStr);
        },
        [selectedDate, today, navigateDate],
    );

    const setStatus = (taskId: number, status: RoutineTaskStatus | null) => {
        router.post(
            logRoute.url(taskId),
            { log_date: selectedDate, status },
            { preserveScroll: true, preserveState: true },
        );
    };

    const handleEdit = (task: RoutineTask) => {
        setEditingTask(task);
        setDialogOpen(true);
    };

    const handleNew = () => {
        setEditingTask(null);
        setDialogOpen(true);
    };

    const handleDelete = (task: RoutineTask) => {
        if (!confirm(`Delete "${task.name}"? This will remove all its history.`)) {
            return;
        }

        router.delete(destroyTask.url(task.id), { preserveScroll: true });
    };

    const summary = useMemo(() => {
        const recent = calendar.slice(-30);
        const withTasks = recent.filter((d) => d.percent !== null);

        if (withTasks.length === 0) {
            return null;
        }

        const avg = Math.round(
            withTasks.reduce((acc, d) => acc + (d.percent ?? 0), 0) / withTasks.length,
        );

        return { avg, days: withTasks.length };
    }, [calendar]);

    const isPastOrToday = selectedDate <= today;
    const canGoNext = selectedDate < today;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Daily Routine" />

            <div className="relative flex h-full flex-1 flex-col">
                <PageBackground />

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Day panel */}
                        <div className="rounded-xl border border-emerald-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm lg:col-span-2 dark:border-emerald-800/50 dark:bg-black/40">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5">
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => shiftDate(-1)}>
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <Input
                                        type="date"
                                        value={selectedDate}
                                        max={today}
                                        onChange={(e) => navigateDate(e.target.value)}
                                        className="h-8 w-[160px] text-sm"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => shiftDate(1)}
                                        disabled={!canGoNext}
                                    >
                                        <ChevronRight className="size-4" />
                                    </Button>
                                    {selectedDate !== today && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="ml-1 text-xs"
                                            onClick={() => navigateDate(today)}
                                        >
                                            Today
                                        </Button>
                                    )}
                                </div>
                                <Button size="sm" onClick={handleNew}>
                                    <Plus className="mr-1.5 size-3.5" />
                                    New task
                                </Button>
                            </div>

                            <h2 className="text-lg font-semibold">{formatDateLabel(selectedDate)}</h2>

                            <div className="mt-4 space-y-2">
                                {tasksForSelectedDay.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
                                        <ListChecks className="mb-2 size-8 text-muted-foreground/40" />
                                        <p className="text-sm text-muted-foreground">No tasks scheduled for this day.</p>
                                        <Button size="sm" variant="outline" className="mt-3" onClick={handleNew}>
                                            <Plus className="mr-1.5 size-3.5" />
                                            Add a task
                                        </Button>
                                    </div>
                                ) : (
                                    tasksForSelectedDay.map((task) => {
                                        const colorClass = COLOR_DOT[task.color ?? 'emerald'] ?? COLOR_DOT.emerald;

                                        return (
                                            <div
                                                key={task.id}
                                                className={cn(
                                                    'flex items-center justify-between gap-3 rounded-lg border bg-white/60 px-3 py-2.5 dark:bg-black/30',
                                                    task.status === 'done' && 'border-emerald-300/70 bg-emerald-50/60 dark:border-emerald-700/60 dark:bg-emerald-950/30',
                                                    task.status === 'skipped' && 'border-amber-300/70 bg-amber-50/60 dark:border-amber-700/60 dark:bg-amber-950/30',
                                                    task.status === 'missed' && 'border-rose-300/70 bg-rose-50/60 dark:border-rose-700/60 dark:bg-rose-950/30',
                                                )}
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className={cn('size-2.5 shrink-0 rounded-full', colorClass)} />
                                                    <span
                                                        className={cn(
                                                            'truncate text-sm font-medium',
                                                            task.status === 'done' && 'line-through text-muted-foreground',
                                                        )}
                                                    >
                                                        {task.name}
                                                    </span>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    {!isPastOrToday ? null : (
                                                        <>
                                                            <Button
                                                                variant={task.status === 'done' ? 'default' : 'outline'}
                                                                size="sm"
                                                                className={cn(
                                                                    'h-7 px-2 text-xs',
                                                                    task.status === 'done' && 'bg-emerald-600 hover:bg-emerald-700',
                                                                )}
                                                                onClick={() => setStatus(task.id, task.status === 'done' ? null : 'done')}
                                                            >
                                                                <Check className="mr-1 size-3" />
                                                                Done
                                                            </Button>
                                                            <Button
                                                                variant={task.status === 'skipped' ? 'default' : 'outline'}
                                                                size="sm"
                                                                className={cn(
                                                                    'h-7 px-2 text-xs',
                                                                    task.status === 'skipped' && 'bg-amber-500 hover:bg-amber-600',
                                                                )}
                                                                onClick={() => setStatus(task.id, task.status === 'skipped' ? null : 'skipped')}
                                                            >
                                                                <SkipForward className="mr-1 size-3" />
                                                                Skip
                                                            </Button>
                                                            <Button
                                                                variant={task.status === 'missed' ? 'default' : 'outline'}
                                                                size="sm"
                                                                className={cn(
                                                                    'h-7 px-2 text-xs',
                                                                    task.status === 'missed' && 'bg-rose-500 hover:bg-rose-600',
                                                                )}
                                                                onClick={() => setStatus(task.id, task.status === 'missed' ? null : 'missed')}
                                                            >
                                                                <X className="mr-1 size-3" />
                                                                Miss
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Calendar heatmap */}
                        <div className="rounded-xl border border-emerald-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm lg:col-span-1 dark:border-emerald-800/50 dark:bg-black/40">
                            <div className="mb-3 flex items-baseline justify-between">
                                <h3 className="text-sm font-semibold">Last {calendar.length} days</h3>
                                {summary && (
                                    <span className="text-xs text-muted-foreground">
                                        {summary.avg}% avg · {summary.days} days
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-10 gap-1">
                                {calendar.map((day) => {
                                    const tone = calendarTone(day);
                                    const isSelected = day.date === selectedDate;

                                    return (
                                        <button
                                            key={day.date}
                                            type="button"
                                            onClick={() => navigateDate(day.date)}
                                            title={`${day.date} — ${tone.label}${day.scheduled ? ` (${day.done}/${day.scheduled - day.skipped} done${day.skipped ? `, ${day.skipped} skipped` : ''})` : ''}`}
                                            className={cn(
                                                'aspect-square rounded transition-all hover:scale-110',
                                                tone.className,
                                                isSelected && 'ring-2 ring-foreground ring-offset-1 ring-offset-background',
                                            )}
                                        />
                                    );
                                })}
                            </div>

                            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                                <div className="flex items-center justify-between">
                                    <span>Less</span>
                                    <div className="flex items-center gap-0.5">
                                        <div className="size-3 rounded bg-rose-500/75" />
                                        <div className="size-3 rounded bg-orange-500/70" />
                                        <div className="size-3 rounded bg-amber-400/70" />
                                        <div className="size-3 rounded bg-emerald-500/55" />
                                        <div className="size-3 rounded bg-emerald-500/80" />
                                    </div>
                                    <span>More</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="size-3 rounded bg-muted-foreground/15" />
                                    <span>No task scheduled</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* All tasks */}
                    <div className="rounded-xl border border-emerald-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-emerald-800/50 dark:bg-black/40">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold">All routine tasks ({tasks.length})</h3>
                        </div>

                        {tasks.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No tasks yet. Click <strong>New task</strong> to add your first routine.
                            </p>
                        ) : (
                            <ul className="divide-y divide-border">
                                {tasks.map((task) => {
                                    const colorClass = COLOR_DOT[task.color ?? 'emerald'] ?? COLOR_DOT.emerald;
                                    const days = WEEKDAYS.filter((d) => task.weekdays.includes(d.value))
                                        .map((d) => d.short)
                                        .join(', ');

                                    return (
                                        <li key={task.id} className="flex items-center justify-between gap-3 py-2.5">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className={cn('size-2.5 shrink-0 rounded-full', colorClass)} />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{task.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {days} · {task.starts_on} → {task.ends_on}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 gap-1">
                                                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(task)}>
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDelete(task)}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editingTask} />
        </AppLayout>
    );
}
