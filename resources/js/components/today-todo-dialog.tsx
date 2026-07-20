import { router } from '@inertiajs/react';
import {
    AlignLeft,
    Check,
    ChevronDown,
    CornerDownRight,
    ExternalLink,
    Flag,
    Link2,
    ListTodo,
    RefreshCw,
    Tag,
} from 'lucide-react';
import { useState } from 'react';
import { toggle as toggleTask } from '@/actions/Domain/Tools/DailyTodo/Controllers/TodoTaskController';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Priority = 'low' | 'medium' | 'high';

type TaskLink = {
    label: string | null;
    url: string;
};

export type TodoDetails = {
    id: number;
    title: string;
    completed: boolean;
    not_done?: boolean;
    description: string | null;
    links: TaskLink[];
    tags: string[];
    estimated_cycles: number | null;
    priority: Priority | null;
};

export type TodoItem = TodoDetails & {
    due_date?: string | null;
    subtasks: TodoDetails[];
};

const PRIORITY_META: Record<Priority, { label: string; badge: string; dot: string }> = {
    high: { label: 'High', badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
    medium: { label: 'Medium', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
    low: { label: 'Low', badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
};

function hasDetails(item: TodoDetails): boolean {
    return (
        (item.description !== null && item.description.trim() !== '') ||
        item.links.length > 0 ||
        item.tags.length > 0 ||
        item.estimated_cycles !== null ||
        item.priority !== null
    );
}

function toggle(id: number): void {
    router.post(toggleTask.url(id), {}, { preserveScroll: true, preserveState: true });
}

function DetailBlock({ item }: { item: TodoDetails }) {
    return (
        <div className="mt-2 space-y-3 rounded-lg bg-muted/50 p-3">
            {(item.priority || item.estimated_cycles != null) && (
                <div className="flex flex-wrap items-center gap-2">
                    {item.priority && (
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_META[item.priority].badge)}>
                            <Flag className="size-3" />
                            {PRIORITY_META[item.priority].label}
                        </span>
                    )}
                    {item.estimated_cycles != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs font-medium">
                            <RefreshCw className="size-3" />
                            {item.estimated_cycles} cycle{item.estimated_cycles === 1 ? '' : 's'}
                        </span>
                    )}
                </div>
            )}

            {item.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    <Tag className="size-3.5 text-muted-foreground" />
                    {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {item.description && item.description.trim() !== '' && (
                <p className="flex gap-1.5 text-sm">
                    <AlignLeft className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="whitespace-pre-wrap">{item.description}</span>
                </p>
            )}

            {item.links.length > 0 && (
                <ul className="space-y-1">
                    {item.links.map((link, index) => (
                        <li key={index}>
                            <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex max-w-full items-center gap-1.5 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                                <Link2 className="size-3.5 shrink-0" />
                                <span className="truncate">{link.label && link.label.trim() !== '' ? link.label : link.url}</span>
                                <ExternalLink className="size-3 shrink-0 opacity-60" />
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function TodoRow({
    item,
    subtask = false,
    expanded,
    onToggleExpand,
}: {
    item: TodoDetails;
    subtask?: boolean;
    expanded: boolean;
    onToggleExpand: () => void;
}) {
    const showDetails = hasDetails(item);

    return (
        <div className={cn(subtask && 'pl-6')}>
            <div className="flex items-center gap-2">
                {subtask && <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground/50" />}
                <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={cn(
                        'flex shrink-0 items-center justify-center rounded border transition-colors',
                        subtask ? 'size-4' : 'size-5 rounded-md',
                        item.completed ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-muted-foreground/40 hover:border-indigo-500',
                    )}
                    aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                    {item.completed && <Check className={subtask ? 'size-3' : 'size-3.5'} />}
                </button>

                {item.priority && <span className={cn('size-2 shrink-0 rounded-full', PRIORITY_META[item.priority].dot)} />}

                <button
                    type="button"
                    onClick={showDetails ? onToggleExpand : undefined}
                    className={cn(
                        'min-w-0 flex-1 truncate text-left',
                        subtask ? 'text-sm' : 'text-sm font-medium',
                        item.completed && 'text-muted-foreground line-through',
                        item.not_done && 'text-rose-600/80 line-through dark:text-rose-400/80',
                        showDetails && 'hover:text-indigo-600 dark:hover:text-indigo-400',
                    )}
                    title={showDetails ? 'View details' : undefined}
                >
                    {item.title}
                </button>
                {item.not_done && (
                    <span className="shrink-0 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-600 dark:text-rose-400">
                        Not done
                    </span>
                )}

                {showDetails && (
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={expanded ? 'Hide details' : 'View details'}
                    >
                        <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
                    </button>
                )}
            </div>

            {showDetails && expanded && <DetailBlock item={item} />}
        </div>
    );
}

export function TodayTodoDialog({
    open,
    onOpenChange,
    todos,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    todos: TodoItem[];
}) {
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const toggleExpand = (id: number) => {
        setExpanded((current) => {
            const next = new Set(current);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    };

    const remaining = todos.filter((t) => !t.completed).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ListTodo className="size-5 text-indigo-600 dark:text-indigo-400" />
                        Today&apos;s todo
                        {todos.length > 0 && (
                            <span className="text-sm font-normal text-muted-foreground">
                                · {remaining} of {todos.length} left
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {todos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <ListTodo className="mb-2 size-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">Nothing planned for today.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {todos.map((task) => (
                            <li key={task.id} className="rounded-lg border border-border bg-white/60 p-3 dark:bg-black/30">
                                <TodoRow item={task} expanded={expanded.has(task.id)} onToggleExpand={() => toggleExpand(task.id)} />
                                {task.subtasks.length > 0 && (
                                    <ul className="mt-2 space-y-2">
                                        {task.subtasks.map((subtask) => (
                                            <li key={subtask.id}>
                                                <TodoRow
                                                    item={subtask}
                                                    subtask
                                                    expanded={expanded.has(subtask.id)}
                                                    onToggleExpand={() => toggleExpand(subtask.id)}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </DialogContent>
        </Dialog>
    );
}
