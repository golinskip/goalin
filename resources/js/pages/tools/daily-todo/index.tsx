import { Head, router, useForm } from '@inertiajs/react';
import {
    Calendar as CalendarIcon,
    Check,
    ChevronLeft,
    ChevronRight,
    CornerDownRight,
    ListTodo,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    destroy as destroyTask,
    store as storeTask,
    toggle as toggleTask,
    update as updateTask,
} from '@/actions/Domain/Tools/DailyTodo/Controllers/TodoTaskController';
import PageBackground from '@/components/page-background';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { index as dailyTodoIndex } from '@/routes/daily-todo';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Daily Todo', href: dailyTodoIndex() }];

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Subtask = {
    id: number;
    title: string;
    completed: boolean;
};

type Task = {
    id: number;
    title: string;
    due_date: string | null;
    completed: boolean;
    subtasks: Subtask[];
};

type CalendarDay = {
    date: string;
    total: number;
    completed: number;
};

type Props = {
    selectedDate: string;
    today: string;
    month: string;
    tasks: Task[];
    calendar: CalendarDay[];
};

function formatDateLabel(dateStr: string): string {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatMonthLabel(monthStr: string): string {
    return new Date(monthStr + '-01T12:00:00').toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });
}

function shiftMonth(monthStr: string, delta: number): string {
    const date = new Date(monthStr + '-01T12:00:00');
    date.setMonth(date.getMonth() + delta);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function shiftDay(dateStr: string, delta: number): string {
    const date = new Date(dateStr + 'T12:00:00');
    date.setDate(date.getDate() + delta);

    return date.toISOString().split('T')[0];
}

function EditTaskDialog({
    open,
    onOpenChange,
    task,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: Task | Subtask | null;
}) {
    const isTopLevel = task !== null && 'due_date' in task;

    const form = useForm({
        title: task?.title ?? '',
        due_date: (task && 'due_date' in task ? task.due_date : null) ?? '',
    });

    if (!task) {
        return null;
    }

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        form.put(updateTask.url(task.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isTopLevel ? 'Edit task' : 'Edit subtask'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Title</label>
                        <Input
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            autoFocus
                        />
                        {form.errors.title && <p className="text-xs text-destructive">{form.errors.title}</p>}
                    </div>

                    {isTopLevel && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Planned for</label>
                            <Input
                                type="date"
                                value={form.data.due_date}
                                onChange={(e) => form.setData('due_date', e.target.value)}
                            />
                            {form.errors.due_date && <p className="text-xs text-destructive">{form.errors.due_date}</p>}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Save changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AddSubtaskRow({ parentId }: { parentId: number }) {
    const form = useForm({ title: '', parent_id: parentId });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (form.data.title.trim() === '') {
            return;
        }

        form.post(storeTask.url(), {
            preserveScroll: true,
            onSuccess: () => form.reset('title'),
        });
    };

    return (
        <form onSubmit={submit} className="flex items-center gap-2 pl-8">
            <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground/50" />
            <Input
                value={form.data.title}
                onChange={(e) => form.setData('title', e.target.value)}
                placeholder="Add a subtask…"
                className="h-8 border-transparent bg-transparent px-1 text-sm shadow-none focus-visible:border-border focus-visible:bg-background"
            />
            {form.data.title.trim() !== '' && (
                <Button type="submit" size="icon" variant="ghost" className="size-7" disabled={form.processing}>
                    <Plus className="size-3.5" />
                </Button>
            )}
        </form>
    );
}

function TaskItem({
    task,
    onEdit,
    onEditSubtask,
}: {
    task: Task;
    onEdit: (task: Task) => void;
    onEditSubtask: (subtask: Subtask) => void;
}) {
    const toggle = (id: number) => {
        router.post(toggleTask.url(id), {}, { preserveScroll: true, preserveState: true });
    };

    const remove = (id: number, title: string) => {
        if (!confirm(`Delete "${title}"?`)) {
            return;
        }

        router.delete(destroyTask.url(id), { preserveScroll: true });
    };

    const doneSubtasks = task.subtasks.filter((s) => s.completed).length;

    return (
        <div className="rounded-lg border border-border bg-white/60 p-3 dark:bg-black/30">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => toggle(task.id)}
                    className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                        task.completed
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-muted-foreground/40 hover:border-indigo-500',
                    )}
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                    {task.completed && <Check className="size-3.5" />}
                </button>

                <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-medium', task.completed && 'text-muted-foreground line-through')}>
                        {task.title}
                    </p>
                    {task.subtasks.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            {doneSubtasks}/{task.subtasks.length} subtasks done
                        </p>
                    )}
                </div>

                <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(task)} title="Edit">
                        <Pencil className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:bg-destructive/10"
                        onClick={() => remove(task.id, task.title)}
                        title="Delete"
                    >
                        <Trash2 className="size-3.5" />
                    </Button>
                </div>
            </div>

            {task.subtasks.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {task.subtasks.map((subtask) => (
                        <li key={subtask.id} className="flex items-center gap-2 pl-8">
                            <button
                                type="button"
                                onClick={() => toggle(subtask.id)}
                                className={cn(
                                    'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                                    subtask.completed
                                        ? 'border-indigo-600 bg-indigo-600 text-white'
                                        : 'border-muted-foreground/40 hover:border-indigo-500',
                                )}
                                aria-label={subtask.completed ? 'Mark incomplete' : 'Mark complete'}
                            >
                                {subtask.completed && <Check className="size-3" />}
                            </button>
                            <span
                                className={cn(
                                    'min-w-0 flex-1 truncate text-sm',
                                    subtask.completed && 'text-muted-foreground line-through',
                                )}
                            >
                                {subtask.title}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => onEditSubtask(subtask)}
                                title="Edit"
                            >
                                <Pencil className="size-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive hover:bg-destructive/10"
                                onClick={() => remove(subtask.id, subtask.title)}
                                title="Delete"
                            >
                                <Trash2 className="size-3" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-1.5">
                <AddSubtaskRow parentId={task.id} />
            </div>
        </div>
    );
}

export default function DailyTodoIndex({ selectedDate, today, month, tasks, calendar }: Props) {
    const [editingTask, setEditingTask] = useState<Task | Subtask | null>(null);

    const addForm = useForm({ title: '', due_date: selectedDate });

    const navigate = (params: { date?: string; month?: string }) => {
        router.get(
            dailyTodoIndex.url({ query: { date: params.date ?? selectedDate, month: params.month ?? month } }),
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const selectDate = (date: string) => {
        navigate({ date, month: date.slice(0, 7) });
    };

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();

        if (addForm.data.title.trim() === '') {
            return;
        }

        addForm.transform((data) => ({ ...data, due_date: selectedDate }));
        addForm.post(storeTask.url(), {
            preserveScroll: true,
            onSuccess: () => addForm.reset('title'),
        });
    };

    const weeks = useMemo(() => {
        const chunks: CalendarDay[][] = [];
        for (let i = 0; i < calendar.length; i += 7) {
            chunks.push(calendar.slice(i, i + 7));
        }

        return chunks;
    }, [calendar]);

    const monthPrefix = month;
    const remaining = tasks.filter((t) => !t.completed).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Daily Todo" />

            <div className="relative flex h-full flex-1 flex-col">
                <PageBackground />

                <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <div className="grid gap-6 lg:grid-cols-5">
                        {/* Day panel */}
                        <div className="rounded-xl border border-indigo-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm lg:col-span-3 dark:border-indigo-800/50 dark:bg-black/40">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5">
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => selectDate(shiftDay(selectedDate, -1))}>
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <Input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => e.target.value && selectDate(e.target.value)}
                                        className="h-8 w-[160px] text-sm"
                                    />
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => selectDate(shiftDay(selectedDate, 1))}>
                                        <ChevronRight className="size-4" />
                                    </Button>
                                    {selectedDate !== today && (
                                        <Button variant="ghost" size="sm" className="ml-1 text-xs" onClick={() => selectDate(today)}>
                                            Today
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">{formatDateLabel(selectedDate)}</h2>
                                <p className="text-xs text-muted-foreground">
                                    {tasks.length === 0
                                        ? 'Nothing planned yet'
                                        : `${remaining} of ${tasks.length} task${tasks.length === 1 ? '' : 's'} remaining`}
                                </p>
                            </div>

                            <form onSubmit={addTask} className="mb-4 flex items-center gap-2">
                                <Input
                                    value={addForm.data.title}
                                    onChange={(e) => addForm.setData('title', e.target.value)}
                                    placeholder="Add a task for this day…"
                                    className="h-9"
                                />
                                <Button type="submit" size="sm" disabled={addForm.processing || addForm.data.title.trim() === ''}>
                                    <Plus className="mr-1 size-4" />
                                    Add
                                </Button>
                            </form>
                            {addForm.errors.title && <p className="-mt-2 mb-3 text-xs text-destructive">{addForm.errors.title}</p>}

                            <div className="space-y-2">
                                {tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
                                        <ListTodo className="mb-2 size-8 text-muted-foreground/40" />
                                        <p className="text-sm text-muted-foreground">No tasks for this day.</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Add one above, or pick another day on the calendar.</p>
                                    </div>
                                ) : (
                                    tasks.map((task) => (
                                        <TaskItem
                                            key={task.id}
                                            task={task}
                                            onEdit={setEditingTask}
                                            onEditSubtask={setEditingTask}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Calendar */}
                        <div className="rounded-xl border border-indigo-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm lg:col-span-2 dark:border-indigo-800/50 dark:bg-black/40">
                            <div className="mb-3 flex items-center justify-between">
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate({ month: shiftMonth(month, -1) })}>
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <CalendarIcon className="size-4 text-muted-foreground" />
                                    {formatMonthLabel(month)}
                                </div>
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate({ month: shiftMonth(month, 1) })}>
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>

                            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-muted-foreground">
                                {WEEKDAY_LABELS.map((label) => (
                                    <div key={label}>{label}</div>
                                ))}
                            </div>

                            <div className="space-y-1">
                                {weeks.map((week, weekIndex) => (
                                    <div key={weekIndex} className="grid grid-cols-7 gap-1">
                                        {week.map((day) => {
                                            const dayNumber = Number(day.date.slice(8, 10));
                                            const isCurrentMonth = day.date.slice(0, 7) === monthPrefix;
                                            const isSelected = day.date === selectedDate;
                                            const isToday = day.date === today;
                                            const allDone = day.total > 0 && day.completed === day.total;
                                            const pending = day.total - day.completed;

                                            return (
                                                <button
                                                    key={day.date}
                                                    type="button"
                                                    onClick={() => selectDate(day.date)}
                                                    title={day.total > 0 ? `${day.completed}/${day.total} done` : 'No tasks'}
                                                    className={cn(
                                                        'flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors',
                                                        isCurrentMonth
                                                            ? 'border-transparent hover:bg-indigo-500/10'
                                                            : 'border-transparent text-muted-foreground/40 hover:bg-muted',
                                                        isSelected && 'border-indigo-500 bg-indigo-500/15 font-semibold',
                                                        isToday && !isSelected && 'border-indigo-300/60 dark:border-indigo-700/60',
                                                    )}
                                                >
                                                    <span>{dayNumber}</span>
                                                    {day.total > 0 && (
                                                        <span
                                                            className={cn(
                                                                'mt-0.5 inline-flex h-1.5 min-w-1.5 items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none',
                                                                allDone
                                                                    ? 'bg-emerald-500 text-white'
                                                                    : 'bg-indigo-500 text-white',
                                                            )}
                                                        >
                                                            {allDone ? '' : pending}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-full bg-indigo-500" /> Pending
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-full bg-emerald-500" /> All done
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <EditTaskDialog
                key={editingTask ? `edit-${'due_date' in editingTask ? 'task' : 'sub'}-${editingTask.id}` : 'none'}
                open={editingTask !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingTask(null);
                    }
                }}
                task={editingTask}
            />
        </AppLayout>
    );
}
