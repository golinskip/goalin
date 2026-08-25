import { Head, router, useForm } from '@inertiajs/react';
import {
    AlignLeft,
    Calendar as CalendarIcon,
    CalendarClock,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleSlash,
    Cloud,
    CloudUpload,
    CornerDownRight,
    DownloadCloud,
    ExternalLink,
    Flag,
    GripVertical,
    Link2,
    ListTodo,
    Pencil,
    Plus,
    RefreshCw,
    Tag,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    preview as todoistPreview,
    store as todoistImport,
} from '@/actions/Domain/Tools/DailyTodo/Controllers/TodoistImportController';
import {
    day as todoistSyncDay,
    store as todoistSendTask,
} from '@/actions/Domain/Tools/DailyTodo/Controllers/TodoistSyncController';
import {
    destroy as destroyTask,
    markNotDone as markNotDoneTask,
    store as storeTask,
    toggle as toggleTask,
    update as updateTask,
} from '@/actions/Domain/Tools/DailyTodo/Controllers/TodoTaskController';
import PageBackground from '@/components/page-background';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { index as dailyTodoIndex } from '@/routes/daily-todo';
import { reorder as reorderTasks } from '@/routes/todo-tasks';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Daily Todo', href: dailyTodoIndex() }];

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Priority = 'low' | 'medium' | 'high';

type TaskLink = {
    label: string | null;
    url: string;
};

type TaskDetails = {
    id: number;
    title: string;
    completed: boolean;
    not_done: boolean;
    description: string | null;
    links: TaskLink[];
    tags: string[];
    estimated_cycles: number | null;
    priority: Priority | null;
    todoist_linked: boolean;
};

type Subtask = TaskDetails;

type Task = TaskDetails & {
    due_date: string | null;
    subtasks: Subtask[];
};

type TodoistTask = {
    id: string;
    content: string;
    description: string | null;
    url: string;
    priority: number;
    labels: string[];
    already_imported: boolean;
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
    todoistConnected: boolean;
};

const PRIORITY_META: Record<Priority, { label: string; badge: string; dot: string }> = {
    high: {
        label: 'High',
        badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
        dot: 'bg-rose-500',
    },
    medium: {
        label: 'Medium',
        badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        dot: 'bg-amber-500',
    },
    low: {
        label: 'Low',
        badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
        dot: 'bg-sky-500',
    },
};

function isTopLevel(item: TaskDetails): item is Task {
    return 'due_date' in item;
}

function hasDetails(item: TaskDetails): boolean {
    return (
        (item.description !== null && item.description.trim() !== '') ||
        item.links.length > 0 ||
        item.tags.length > 0 ||
        item.estimated_cycles !== null ||
        item.priority !== null
    );
}

function getXsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

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

type EditFormData = {
    title: string;
    due_date: string;
    description: string;
    priority: '' | Priority;
    estimated_cycles: string;
    tags: string[];
    links: TaskLink[];
};

function EditTaskDialog({
    open,
    onOpenChange,
    task,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: TaskDetails | null;
}) {
    const topLevel = task !== null && isTopLevel(task);

    const form = useForm<EditFormData>({
        title: task?.title ?? '',
        due_date: (task && isTopLevel(task) ? task.due_date : null) ?? '',
        description: task?.description ?? '',
        priority: task?.priority ?? '',
        estimated_cycles: task?.estimated_cycles != null ? String(task.estimated_cycles) : '',
        tags: task?.tags ?? [],
        links: task?.links ?? [],
    });

    const [tagDraft, setTagDraft] = useState('');

    if (!task) {
        return null;
    }

    const addTag = () => {
        const value = tagDraft.trim();

        if (value === '' || form.data.tags.includes(value)) {
            setTagDraft('');

            return;
        }

        form.setData('tags', [...form.data.tags, value]);
        setTagDraft('');
    };

    const removeTag = (tag: string) => {
        form.setData('tags', form.data.tags.filter((t) => t !== tag));
    };

    const updateLink = (index: number, field: keyof TaskLink, value: string) => {
        form.setData(
            'links',
            form.data.links.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
        );
    };

    const addLink = () => {
        form.setData('links', [...form.data.links, { label: '', url: '' }]);
    };

    const removeLink = (index: number) => {
        form.setData('links', form.data.links.filter((_, i) => i !== index));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        form.transform((data) => ({
            ...data,
            priority: data.priority === '' ? null : data.priority,
            estimated_cycles: data.estimated_cycles === '' ? null : Number(data.estimated_cycles),
            links: data.links.filter((link) => link.url.trim() !== ''),
        }));

        form.put(updateTask.url(task.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{topLevel ? 'Edit task' : 'Edit subtask'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Title</label>
                        <Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} autoFocus />
                        {form.errors.title && <p className="text-xs text-destructive">{form.errors.title}</p>}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {topLevel && (
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
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Priority</label>
                            <Select
                                value={form.data.priority === '' ? 'none' : form.data.priority}
                                onValueChange={(value) => form.setData('priority', value === 'none' ? '' : (value as Priority))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Est. cycles</label>
                            <Input
                                type="number"
                                min={1}
                                max={999}
                                value={form.data.estimated_cycles}
                                onChange={(e) => form.setData('estimated_cycles', e.target.value)}
                                placeholder="—"
                            />
                            {form.errors.estimated_cycles && (
                                <p className="text-xs text-destructive">{form.errors.estimated_cycles}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            className="min-h-[90px] w-full rounded-lg border border-border bg-white/50 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-black/20"
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            placeholder="Add more detail…"
                            maxLength={5000}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Tags</label>
                        {form.data.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {form.data.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
                                    >
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <Input
                            value={tagDraft}
                            onChange={(e) => setTagDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    addTag();
                                }
                            }}
                            onBlur={addTag}
                            placeholder="Type a tag and press Enter"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Links</label>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addLink}>
                                <Plus className="mr-1 size-3.5" />
                                Add link
                            </Button>
                        </div>
                        {form.data.links.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No links yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {form.data.links.map((link, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            value={link.label ?? ''}
                                            onChange={(e) => updateLink(index, 'label', e.target.value)}
                                            placeholder="Label"
                                            className="h-8 w-1/3 text-sm"
                                        />
                                        <Input
                                            value={link.url}
                                            onChange={(e) => updateLink(index, 'url', e.target.value)}
                                            placeholder="https://…"
                                            className="h-8 flex-1 text-sm"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 shrink-0 text-destructive hover:bg-destructive/10"
                                            onClick={() => removeLink(index)}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {form.errors.links && <p className="text-xs text-destructive">{form.errors.links}</p>}
                    </div>

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

function PriorityDot({ priority }: { priority: Priority | null }) {
    if (!priority) {
        return null;
    }

    return <span className={cn('size-2 shrink-0 rounded-full', PRIORITY_META[priority].dot)} title={`${PRIORITY_META[priority].label} priority`} />;
}

function TitleButton({
    title,
    completed,
    onClick,
    className,
}: {
    title: string;
    completed: boolean;
    onClick: () => void;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'min-w-0 flex-1 truncate text-left hover:text-indigo-600 hover:underline dark:hover:text-indigo-400',
                completed && 'text-muted-foreground line-through',
                className,
            )}
            title="View details"
        >
            {title}
        </button>
    );
}

function TaskItem({
    task,
    index,
    activeDetailId,
    todoistConnected,
    onEdit,
    onShowDetails,
    onNotDone,
    onTaskDragStart,
    onTaskDragEnter,
    onDragEnd,
    onSubtaskDragStart,
    onSubtaskDragEnter,
}: {
    task: Task;
    index: number;
    activeDetailId: number | null;
    todoistConnected: boolean;
    onEdit: (task: TaskDetails) => void;
    onShowDetails: (item: TaskDetails) => void;
    onNotDone: (task: Task) => void;
    onTaskDragStart: (index: number) => void;
    onTaskDragEnter: (index: number) => void;
    onDragEnd: () => void;
    onSubtaskDragStart: (parentId: number, index: number) => void;
    onSubtaskDragEnter: (parentId: number, index: number) => void;
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

    const sendToTodoist = (id: number) => {
        router.post(todoistSendTask.url(id), {}, { preserveScroll: true, preserveState: true });
    };

    const doneSubtasks = task.subtasks.filter((s) => s.completed).length;

    return (
        <div
            onDragEnter={() => onTaskDragEnter(index)}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
                'rounded-lg border border-border bg-white/60 p-3 dark:bg-black/30',
                task.not_done && 'border-rose-300/70 bg-rose-50/50 dark:border-rose-800/50 dark:bg-rose-950/20',
            )}
        >
            <div className="flex items-center gap-2">
                <span
                    draggable
                    onDragStart={() => onTaskDragStart(index)}
                    onDragEnd={onDragEnd}
                    className="shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
                    title="Drag to reorder"
                >
                    <GripVertical className="size-4" />
                </span>
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

                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <PriorityDot priority={task.priority} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <TitleButton
                                title={task.title}
                                completed={task.completed}
                                onClick={() => onShowDetails(task)}
                                className={cn(
                                    'text-sm font-medium',
                                    activeDetailId === task.id && 'text-indigo-600 dark:text-indigo-400',
                                    task.not_done && 'text-rose-600/80 line-through dark:text-rose-400/80',
                                )}
                            />
                            {task.not_done && (
                                <span className="shrink-0 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-600 dark:text-rose-400">
                                    Not done
                                </span>
                            )}
                            {hasDetails(task) && <AlignLeft className="size-3.5 shrink-0 text-muted-foreground/60" />}
                            {task.todoist_linked && (
                                <Cloud className="size-3.5 shrink-0 text-red-500/70" aria-label="Linked with Todoist" />
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {task.subtasks.length > 0 && (
                                <span>
                                    {doneSubtasks}/{task.subtasks.length} subtasks
                                </span>
                            )}
                            {task.estimated_cycles != null && (
                                <span className="inline-flex items-center gap-1">
                                    <RefreshCw className="size-3" />
                                    {task.estimated_cycles}
                                </span>
                            )}
                            {task.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 gap-1">
                    {todoistConnected && !task.todoist_linked && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                            onClick={() => sendToTodoist(task.id)}
                            title="Send to Todoist"
                        >
                            <CloudUpload className="size-3.5" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            'size-8',
                            task.not_done
                                ? 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-400'
                                : 'text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400',
                        )}
                        onClick={() => onNotDone(task)}
                        title={task.not_done ? 'Clear "not done"' : 'Mark as not done'}
                    >
                        <CircleSlash className="size-3.5" />
                    </Button>
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
                    {task.subtasks.map((subtask, subtaskIndex) => (
                        <li
                            key={subtask.id}
                            onDragEnter={() => onSubtaskDragEnter(task.id, subtaskIndex)}
                            onDragOver={(e) => e.preventDefault()}
                            className="flex items-center gap-2 pl-4"
                        >
                            <span
                                draggable
                                onDragStart={() => onSubtaskDragStart(task.id, subtaskIndex)}
                                onDragEnd={onDragEnd}
                                className="shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
                                title="Drag to reorder"
                            >
                                <GripVertical className="size-3.5" />
                            </span>
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
                            <PriorityDot priority={subtask.priority} />
                            <TitleButton
                                title={subtask.title}
                                completed={subtask.completed}
                                onClick={() => onShowDetails(subtask)}
                                className={cn('text-sm', activeDetailId === subtask.id && 'text-indigo-600 dark:text-indigo-400')}
                            />
                            {hasDetails(subtask) && <AlignLeft className="size-3 shrink-0 text-muted-foreground/60" />}
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(subtask)} title="Edit">
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

function MarkNotDoneDialog({
    open,
    onOpenChange,
    task,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: Task | null;
}) {
    const [moveDate, setMoveDate] = useState(() => (task?.due_date ? shiftDay(task.due_date, 1) : ''));
    const [processing, setProcessing] = useState(false);

    if (!task) {
        return null;
    }

    const submit = (moveTo: string | null) => {
        setProcessing(true);

        router.post(markNotDoneTask.url(task.id), moveTo ? { move_to: moveTo } : {}, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mark as not done</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{task.title}</span> wasn&apos;t done. Do you want to move it to another day?
                    </p>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Move to</label>
                        <Input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button type="button" variant="ghost" onClick={() => submit(null)} disabled={processing}>
                        Keep on this day
                    </Button>
                    <Button type="button" onClick={() => submit(moveDate)} disabled={processing || moveDate === ''}>
                        <CalendarClock className="mr-1.5 size-4" />
                        Move task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DetailPanel({ item, onClose, onEdit }: { item: TaskDetails; onClose: () => void; onEdit: (item: TaskDetails) => void }) {
    const empty = !hasDetails(item);

    return (
        <div className="flex h-full flex-col">
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className={cn('text-base font-semibold', item.completed && 'text-muted-foreground line-through')}>{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{isTopLevel(item) ? 'Task details' : 'Subtask details'}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(item)} title="Edit">
                        <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={onClose} title="Close">
                        <X className="size-4" />
                    </Button>
                </div>
            </div>

            {empty ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
                    <AlignLeft className="mb-2 size-7 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No details yet.</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => onEdit(item)}>
                        <Pencil className="mr-1.5 size-3.5" />
                        Add details
                    </Button>
                </div>
            ) : (
                <div className="space-y-4 overflow-y-auto">
                    {(item.priority || item.estimated_cycles != null) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {item.priority && (
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                                        PRIORITY_META[item.priority].badge,
                                    )}
                                >
                                    <Flag className="size-3" />
                                    {PRIORITY_META[item.priority].label} priority
                                </span>
                            )}
                            {item.estimated_cycles != null && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                                    <RefreshCw className="size-3" />
                                    {item.estimated_cycles} cycle{item.estimated_cycles === 1 ? '' : 's'}
                                </span>
                            )}
                        </div>
                    )}

                    {item.tags.length > 0 && (
                        <div>
                            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <Tag className="size-3.5" /> Tags
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {item.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {item.description && item.description.trim() !== '' && (
                        <div>
                            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <AlignLeft className="size-3.5" /> Description
                            </p>
                            <p className="whitespace-pre-wrap text-sm">{item.description}</p>
                        </div>
                    )}

                    {item.links.length > 0 && (
                        <div>
                            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <Link2 className="size-3.5" /> Links
                            </p>
                            <ul className="space-y-1">
                                {item.links.map((link, index) => (
                                    <li key={index}>
                                        <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex max-w-full items-center gap-1.5 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                                        >
                                            <ExternalLink className="size-3.5 shrink-0" />
                                            <span className="truncate">{link.label && link.label.trim() !== '' ? link.label : link.url}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TodoistImportDialog({
    open,
    onOpenChange,
    date,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date: string;
}) {
    const [tasks, setTasks] = useState<TodoistTask[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        fetch(todoistPreview.url({ query: { date } }), {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to load Todoist tasks');
                }

                return response.json();
            })
            .then((data: { tasks: TodoistTask[] }) => {
                setTasks(data.tasks);
                setSelected(
                    data.tasks
                        .filter((task) => !task.already_imported)
                        .map((task) => task.id),
                );
            })
            .catch((e: unknown) => {
                if (e instanceof DOMException && e.name === 'AbortError') {
                    return;
                }

                setTasks([]);
                setSelected([]);
                setError(
                    'Could not reach Todoist. Check your API token in settings and try again.',
                );
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [date]);

    const importable = tasks.filter((task) => !task.already_imported);
    const allSelected =
        importable.length > 0 &&
        importable.every((task) => selected.includes(task.id));

    const toggle = (id: string) => {
        setSelected((current) =>
            current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id],
        );
    };

    const submit = () => {
        setImporting(true);

        router.post(
            todoistImport.url(),
            { date, ids: selected },
            {
                preserveScroll: true,
                onFinish: () => setImporting(false),
                onSuccess: () => onOpenChange(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import from Todoist</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Todoist tasks due on{' '}
                        <span className="font-medium text-foreground">
                            {formatDateLabel(date)}
                        </span>
                        . Pick the ones to add to this day.
                    </p>

                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                            <RefreshCw className="size-4 animate-spin" />
                            Loading tasks…
                        </div>
                    ) : error !== null ? (
                        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    ) : tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
                            <ListTodo className="mb-2 size-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">
                                No Todoist tasks due on this day.
                            </p>
                        </div>
                    ) : (
                        <>
                            {importable.length > 0 && (
                                <button
                                    type="button"
                                    className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                    onClick={() =>
                                        setSelected(
                                            allSelected
                                                ? []
                                                : importable.map(
                                                      (task) => task.id,
                                                  ),
                                        )
                                    }
                                >
                                    {allSelected
                                        ? 'Deselect all'
                                        : 'Select all'}
                                </button>
                            )}
                            <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
                                {tasks.map((task) => (
                                    <li key={task.id}>
                                        <label
                                            className={cn(
                                                'flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent p-2 hover:bg-muted/60',
                                                task.already_imported &&
                                                    'cursor-not-allowed opacity-60 hover:bg-transparent',
                                            )}
                                        >
                                            <Checkbox
                                                className="mt-0.5"
                                                checked={selected.includes(
                                                    task.id,
                                                )}
                                                disabled={task.already_imported}
                                                onCheckedChange={() =>
                                                    toggle(task.id)
                                                }
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm">
                                                    {task.content}
                                                </span>
                                                {task.description !== null &&
                                                    task.description.trim() !==
                                                        '' && (
                                                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                                            {task.description}
                                                        </span>
                                                    )}
                                                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                                    {task.already_imported && (
                                                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                            Already imported
                                                        </span>
                                                    )}
                                                    {task.labels.map(
                                                        (label) => (
                                                            <span
                                                                key={label}
                                                                className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300"
                                                            >
                                                                {label}
                                                            </span>
                                                        ),
                                                    )}
                                                </span>
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={importing}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={submit}
                        disabled={importing || loading || selected.length === 0}
                    >
                        <DownloadCloud className="mr-1.5 size-4" />
                        Import{' '}
                        {selected.length > 0
                            ? `${selected.length} task${selected.length === 1 ? '' : 's'}`
                            : 'tasks'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function DailyTodoIndex({ selectedDate, today, month, tasks, calendar, todoistConnected }: Props) {
    const [editingTask, setEditingTask] = useState<TaskDetails | null>(null);
    const [detailId, setDetailId] = useState<number | null>(null);
    const [notDoneTask, setNotDoneTask] = useState<Task | null>(null);
    const [todoistOpen, setTodoistOpen] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);
    const [orderedTasks, setOrderedTasks] = useState<Task[]>(tasks);

    useEffect(() => {
        setOrderedTasks(tasks);
    }, [tasks]);

    const dragTaskFrom = useRef<number | null>(null);
    const dragTaskTo = useRef<number | null>(null);
    const dragSubtask = useRef<{ parentId: number; from: number; to: number } | null>(null);

    const addForm = useForm({ title: '', due_date: selectedDate });

    const handleNotDone = (task: Task) => {
        if (task.not_done) {
            router.post(markNotDoneTask.url(task.id), {}, { preserveScroll: true, preserveState: true });

            return;
        }

        setNotDoneTask(task);
    };

    const persistOrder = (items: TaskDetails[]) => {
        router.patch(
            reorderTasks.url(),
            { order: items.map((item, position) => ({ id: item.id, position })) },
            { preserveScroll: true, preserveState: true },
        );
    };

    const handleTaskDragStart = (index: number) => {
        dragTaskFrom.current = index;
        dragSubtask.current = null;
    };

    const handleTaskDragEnter = (index: number) => {
        if (dragTaskFrom.current !== null) {
            dragTaskTo.current = index;
        }
    };

    const handleSubtaskDragStart = (parentId: number, index: number) => {
        dragSubtask.current = { parentId, from: index, to: index };
        dragTaskFrom.current = null;
    };

    const handleSubtaskDragEnter = (parentId: number, index: number) => {
        if (dragSubtask.current && dragSubtask.current.parentId === parentId) {
            dragSubtask.current.to = index;
        }
    };

    const handleDragEnd = () => {
        if (dragTaskFrom.current !== null && dragTaskTo.current !== null && dragTaskFrom.current !== dragTaskTo.current) {
            const items = [...orderedTasks];
            const [moved] = items.splice(dragTaskFrom.current, 1);
            items.splice(dragTaskTo.current, 0, moved);
            setOrderedTasks(items);
            persistOrder(items);
        } else if (dragSubtask.current && dragSubtask.current.from !== dragSubtask.current.to) {
            const { parentId, from, to } = dragSubtask.current;
            const parent = orderedTasks.find((t) => t.id === parentId);

            if (parent) {
                const subtasks = [...parent.subtasks];
                const [moved] = subtasks.splice(from, 1);
                subtasks.splice(to, 0, moved);
                setOrderedTasks(orderedTasks.map((t) => (t.id === parentId ? { ...t, subtasks } : t)));
                persistOrder(subtasks);
            }
        }

        dragTaskFrom.current = null;
        dragTaskTo.current = null;
        dragSubtask.current = null;
    };

    const detailItem = useMemo<TaskDetails | null>(() => {
        if (detailId === null) {
            return null;
        }

        for (const task of orderedTasks) {
            if (task.id === detailId) {
                return task;
            }

            for (const subtask of task.subtasks) {
                if (subtask.id === detailId) {
                    return subtask;
                }
            }
        }

        return null;
    }, [detailId, orderedTasks]);

    const navigate = (params: { date?: string; month?: string }) => {
        router.get(
            dailyTodoIndex.url({ query: { date: params.date ?? selectedDate, month: params.month ?? month } }),
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const selectDate = (date: string) => {
        setDetailId(null);
        setSyncResult(null);
        navigate({ date, month: date.slice(0, 7) });
    };

    const syncDayWithTodoist = async () => {
        setSyncing(true);
        setSyncResult(null);

        try {
            const response = await fetch(todoistSyncDay.url(), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getXsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ date: selectedDate }),
            });

            if (!response.ok) {
                throw new Error('Sync failed');
            }

            const data: { updated: number; imported: number; gone: number } = await response.json();
            const parts = [`${data.updated} updated`];

            if (data.imported > 0) {
                parts.push(`${data.imported} new`);
            }

            if (data.gone > 0) {
                parts.push(`${data.gone} gone from Todoist`);
            }

            setSyncResult(parts.join(' · '));
            router.reload();
        } catch {
            setSyncResult('Could not reach Todoist.');
        } finally {
            setSyncing(false);
        }
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

    const remaining = orderedTasks.filter((t) => !t.completed).length;

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
                                {todoistConnected && (
                                    <div className="flex items-center gap-2">
                                        {syncResult !== null && (
                                            <span className="text-xs text-muted-foreground">{syncResult}</span>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs"
                                            onClick={syncDayWithTodoist}
                                            disabled={syncing}
                                            title="Pull this day's tasks from Todoist"
                                        >
                                            <RefreshCw className={cn('mr-1.5 size-3.5', syncing && 'animate-spin')} />
                                            Sync from Todoist
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setTodoistOpen(true)}>
                                            <DownloadCloud className="mr-1.5 size-3.5" />
                                            Import from Todoist
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">{formatDateLabel(selectedDate)}</h2>
                                <p className="text-xs text-muted-foreground">
                                    {orderedTasks.length === 0
                                        ? 'Nothing planned yet'
                                        : `${remaining} of ${orderedTasks.length} task${orderedTasks.length === 1 ? '' : 's'} remaining`}
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
                                {orderedTasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
                                        <ListTodo className="mb-2 size-8 text-muted-foreground/40" />
                                        <p className="text-sm text-muted-foreground">No tasks for this day.</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Add one above, or pick another day on the calendar.</p>
                                    </div>
                                ) : (
                                    orderedTasks.map((task, taskIndex) => (
                                        <TaskItem
                                            key={task.id}
                                            task={task}
                                            index={taskIndex}
                                            activeDetailId={detailId}
                                            todoistConnected={todoistConnected}
                                            onEdit={setEditingTask}
                                            onShowDetails={(item) => setDetailId(item.id)}
                                            onNotDone={handleNotDone}
                                            onTaskDragStart={handleTaskDragStart}
                                            onTaskDragEnter={handleTaskDragEnter}
                                            onDragEnd={handleDragEnd}
                                            onSubtaskDragStart={handleSubtaskDragStart}
                                            onSubtaskDragEnter={handleSubtaskDragEnter}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Calendar / Details */}
                        <div className="rounded-xl border border-indigo-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm lg:col-span-2 dark:border-indigo-800/50 dark:bg-black/40">
                            {detailItem ? (
                                <DetailPanel item={detailItem} onClose={() => setDetailId(null)} onEdit={setEditingTask} />
                            ) : (
                                <>
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
                                                    const isCurrentMonth = day.date.slice(0, 7) === month;
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
                                                                        allDone ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white',
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
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <EditTaskDialog
                key={editingTask ? `edit-${editingTask.id}` : 'none'}
                open={editingTask !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingTask(null);
                    }
                }}
                task={editingTask}
            />

            {todoistOpen && <TodoistImportDialog open onOpenChange={setTodoistOpen} date={selectedDate} />}

            <MarkNotDoneDialog
                key={notDoneTask ? `not-done-${notDoneTask.id}` : 'not-done-none'}
                open={notDoneTask !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setNotDoneTask(null);
                    }
                }}
                task={notDoneTask}
            />
        </AppLayout>
    );
}
