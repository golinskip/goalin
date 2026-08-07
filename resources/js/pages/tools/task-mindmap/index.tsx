import { Head, router, useForm } from '@inertiajs/react';
import {
    AlignLeft,
    Ban,
    BookOpen,
    Briefcase,
    Bug,
    Calendar,
    CalendarClock,
    Check,
    CheckSquare,
    ChevronRight,
    CircleDashed,
    Code,
    ExternalLink,
    Flag,
    Folder,
    GripVertical,
    Heart,
    Lightbulb,
    Link2,
    ListTree,
    type LucideIcon,
    Music,
    PenTool,
    Pencil,
    Plus,
    Rocket,
    Star,
    Tag,
    Target,
    Trash2,
    X,
    Zap,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
    destroy as destroyTask,
    reorder as reorderTasks,
    status as statusTask,
    store as storeTask,
    update as updateTask,
} from '@/actions/Domain/Tools/TaskMindmap/Controllers/MindmapTaskController';
import PageBackground from '@/components/page-background';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { index as taskMindmapIndex } from '@/routes/task-mindmap';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Task Mindmap', href: taskMindmapIndex() }];

type Status = 'todo' | 'in_progress' | 'done' | 'rejected';
type Priority = 'low' | 'medium' | 'high';

type TaskLink = { label: string | null; url: string };

type TaskNode = {
    id: number;
    title: string;
    status: Status;
    progress: number;
    description: string | null;
    links: TaskLink[];
    tags: string[];
    color: string | null;
    icon: string | null;
    priority: Priority | null;
    deadline: string | null;
    done_count: number;
    total_count: number;
    progress_sum: number;
    children: TaskNode[];
};

type Props = {
    tree: TaskNode[];
};

type View = 'open' | 'all';

const ICONS: Record<string, LucideIcon> = {
    target: Target,
    flag: Flag,
    star: Star,
    zap: Zap,
    book: BookOpen,
    code: Code,
    briefcase: Briefcase,
    heart: Heart,
    lightbulb: Lightbulb,
    folder: Folder,
    rocket: Rocket,
    bug: Bug,
    calendar: Calendar,
    music: Music,
    pen: PenTool,
    check: CheckSquare,
};

const ICON_KEYS = Object.keys(ICONS);

const PRIORITY_META: Record<Priority, { label: string; badge: string; dot: string }> = {
    high: { label: 'High', badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
    medium: { label: 'Medium', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
    low: { label: 'Low', badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
};

function formatDeadline(dateStr: string): string {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOpen(node: TaskNode): boolean {
    return node.status === 'todo' || node.status === 'in_progress';
}

/**
 * Completion of a node: the whole branch when it has children (in-progress
 * descendants counting for their own share), otherwise the task's own percent.
 */
function completionOf(node: TaskNode): number {
    if (node.total_count === 0) {
        return node.progress;
    }

    return Math.round((node.progress_sum / node.total_count) * 100);
}

function hasDetails(node: TaskNode): boolean {
    return (
        (node.description !== null && node.description.trim() !== '') ||
        node.links.length > 0 ||
        node.tags.length > 0 ||
        node.priority !== null ||
        node.deadline !== null
    );
}

type NodeContext = {
    view: View;
    expanded: Set<number>;
    onToggleExpand: (id: number) => void;
    onEdit: (node: TaskNode) => void;
    onStatus: (node: TaskNode, status: Status) => void;
    onDelete: (node: TaskNode) => void;
    onAdded: (parentId: number) => void;
    onShowAll: () => void;
    dragStart: (parentId: number | null, id: number) => void;
    dragEnter: (parentId: number | null, id: number) => void;
    dragEnd: () => void;
};

function AddTaskForm({
    parentId,
    onAdded,
    placeholder,
    compact = false,
}: {
    parentId: number | null;
    onAdded: () => void;
    placeholder: string;
    compact?: boolean;
}) {
    const form = useForm<{ title: string; parent_id: number | null }>({ title: '', parent_id: parentId });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (form.data.title.trim() === '') {
            return;
        }

        form.post(storeTask.url(), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                form.reset('title');
                onAdded();
            },
        });
    };

    return (
        <form onSubmit={submit} className="flex items-center gap-2">
            <Input
                value={form.data.title}
                onChange={(e) => form.setData('title', e.target.value)}
                placeholder={placeholder}
                className={compact ? 'h-8 text-sm' : 'h-9'}
            />
            <Button type="submit" size={compact ? 'sm' : 'default'} variant={compact ? 'ghost' : 'default'} disabled={form.processing || form.data.title.trim() === ''}>
                <Plus className={compact ? 'size-4' : 'mr-1 size-4'} />
                {!compact && 'Add'}
            </Button>
        </form>
    );
}

function ProgressMeter({ percent, branch }: { percent: number; branch: boolean }) {
    return (
        <span
            className="hidden shrink-0 items-center gap-1.5 sm:inline-flex"
            title={branch ? `${percent}% of this branch complete` : `${percent}% done`}
        >
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                <span
                    className={cn('block h-full rounded-full transition-[width]', branch ? 'bg-indigo-500' : 'bg-amber-500')}
                    style={{ width: `${percent}%` }}
                />
            </span>
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{percent}%</span>
        </span>
    );
}

function StatusIcon({ status, progress, color }: { status: Status; progress: number; color: string | null }) {
    if (status === 'in_progress') {
        return (
            <span className="relative flex size-5 shrink-0 overflow-hidden rounded-md border border-amber-500" title={`In progress — ${progress}%`}>
                <span className="absolute inset-x-0 bottom-0 bg-amber-500/70" style={{ height: `${Math.max(progress, 8)}%` }} />
            </span>
        );
    }

    if (status === 'done') {
        return (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-emerald-600 bg-emerald-600 text-white">
                <Check className="size-3.5" />
            </span>
        );
    }

    if (status === 'rejected') {
        return (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-rose-500 bg-rose-500 text-white">
                <Ban className="size-3" />
            </span>
        );
    }

    return <span className="size-5 shrink-0 rounded-md border border-muted-foreground/40" style={color ? { borderColor: color } : undefined} />;
}

function TaskRow({ node, parentId, ctx }: { node: TaskNode; parentId: number | null; ctx: NodeContext }) {
    const visibleChildren = ctx.view === 'open' ? node.children.filter(isOpen) : node.children;
    const hiddenChildren = node.children.length - visibleChildren.length;
    const isExpanded = ctx.expanded.has(node.id);
    const hasChildren = node.children.length > 0;
    const Icon = node.icon ? ICONS[node.icon] : null;
    const resolved = node.status === 'done' || node.status === 'rejected';
    const completion = completionOf(node);
    const showCompletion = node.total_count > 0 ? completion > 0 : node.status === 'in_progress';

    return (
        <li>
            <div
                onDragEnter={() => ctx.dragEnter(parentId, node.id)}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                    'group flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 hover:border-border hover:bg-white/60 dark:hover:bg-black/20',
                    node.status === 'done' && 'opacity-80',
                    node.status === 'rejected' && 'opacity-60',
                )}
                style={node.color ? { borderLeft: `3px solid ${node.color}` } : undefined}
            >
                <span
                    draggable
                    onDragStart={() => ctx.dragStart(parentId, node.id)}
                    onDragEnd={ctx.dragEnd}
                    className="shrink-0 cursor-grab text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing"
                    title="Drag to reorder"
                >
                    <GripVertical className="size-4" />
                </span>

                <button
                    type="button"
                    onClick={() => hasChildren && ctx.onToggleExpand(node.id)}
                    className={cn('flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground', hasChildren ? 'hover:bg-muted' : 'invisible')}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                    <ChevronRight className={cn('size-4 transition-transform', isExpanded && 'rotate-90')} />
                </button>

                <button
                    type="button"
                    onClick={() => ctx.onStatus(node, 'done')}
                    title={node.status === 'done' ? 'Mark as to do' : 'Mark as done'}
                >
                    <StatusIcon status={node.status} progress={node.progress} color={node.color} />
                </button>

                {Icon && <Icon className="size-4 shrink-0" style={node.color ? { color: node.color } : undefined} />}
                {node.priority && <span className={cn('size-2 shrink-0 rounded-full', PRIORITY_META[node.priority].dot)} title={`${PRIORITY_META[node.priority].label} priority`} />}

                <button
                    type="button"
                    onClick={() => ctx.onEdit(node)}
                    className={cn(
                        'min-w-0 flex-1 truncate text-left text-sm hover:text-indigo-600 dark:hover:text-indigo-400',
                        resolved && 'text-muted-foreground line-through',
                    )}
                    title="Open details"
                >
                    {node.title}
                    {hasDetails(node) && !resolved && <AlignLeft className="ml-1.5 inline size-3 text-muted-foreground/50" />}
                </button>

                {node.deadline && (
                    <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                        <CalendarClock className="size-3" />
                        {formatDeadline(node.deadline)}
                    </span>
                )}

                {node.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="hidden shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline">
                        {tag}
                    </span>
                ))}

                {showCompletion && <ProgressMeter percent={completion} branch={node.total_count > 0} />}

                {node.total_count > 0 && (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground" title="Done / total in this branch">
                        {node.done_count}/{node.total_count}
                    </span>
                )}

                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => ctx.onStatus(node, 'done')} title="Mark as done">
                        <Check className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn('size-7', node.status === 'in_progress' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}
                        onClick={() => ctx.onStatus(node, 'in_progress')}
                        title={node.status === 'in_progress' ? 'Mark as to do' : 'Mark as in progress'}
                    >
                        <CircleDashed className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn('size-7', node.status === 'rejected' ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}
                        onClick={() => ctx.onStatus(node, 'rejected')}
                        title={node.status === 'rejected' ? 'Mark as to do' : 'Mark as rejected'}
                    >
                        <Ban className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => ctx.onEdit(node)} title="Details">
                        <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => ctx.onToggleExpand(node.id)} title="Add subtask">
                        <Plus className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:bg-destructive/10"
                        onClick={() => ctx.onDelete(node)}
                        title="Delete"
                    >
                        <Trash2 className="size-3.5" />
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <div className="ml-6 border-l border-border/60 pl-2">
                    {visibleChildren.length > 0 ? (
                        <ul className="space-y-0.5 py-0.5">
                            {visibleChildren.map((child) => (
                                <TaskRow key={child.id} node={child} parentId={node.id} ctx={ctx} />
                            ))}
                        </ul>
                    ) : (
                        ctx.view === 'open' && hasChildren && <p className="py-1 text-xs text-muted-foreground/70">No open subtasks.</p>
                    )}
                    {ctx.view === 'open' && hiddenChildren > 0 && (
                        <button
                            type="button"
                            onClick={ctx.onShowAll}
                            className="py-1 text-xs text-muted-foreground/70 hover:text-foreground"
                        >
                            {hiddenChildren} finished subtask{hiddenChildren === 1 ? '' : 's'} hidden — show
                        </button>
                    )}
                    <div className="py-1">
                        <AddTaskForm parentId={node.id} onAdded={() => ctx.onAdded(node.id)} placeholder="Add a subtask…" compact />
                    </div>
                </div>
            )}
        </li>
    );
}

type EditFormData = {
    title: string;
    description: string;
    deadline: string;
    color: string;
    icon: string;
    priority: '' | Priority;
    status: Status;
    progress: number;
    tags: string[];
    links: TaskLink[];
};

const STATUS_LABELS: Record<Status, string> = {
    todo: 'To do',
    in_progress: 'In progress',
    done: 'Done',
    rejected: 'Rejected',
};

function EditTaskDialog({ open, onOpenChange, task }: { open: boolean; onOpenChange: (open: boolean) => void; task: TaskNode | null }) {
    const form = useForm<EditFormData>({
        title: task?.title ?? '',
        description: task?.description ?? '',
        deadline: task?.deadline ?? '',
        color: task?.color ?? '',
        icon: task?.icon ?? '',
        priority: task?.priority ?? '',
        status: task?.status ?? 'todo',
        progress: task?.progress ?? 0,
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

    /** Keep the pair consistent the same way the server does. */
    const setStatus = (status: Status) => {
        const progress = status === 'done' ? 100 : status === 'todo' ? 0 : Math.min(99, form.data.progress);
        form.setData({ ...form.data, status, progress });
    };

    const setProgress = (value: number) => {
        const progress = Math.min(100, Math.max(0, Number.isNaN(value) ? 0 : value));
        const status =
            progress === 100 ? 'done' : progress > 0 && form.data.status !== 'rejected' ? 'in_progress' : form.data.status;

        form.setData({ ...form.data, progress, status });
    };

    const updateLink = (index: number, field: keyof TaskLink, value: string) => {
        form.setData('links', form.data.links.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        form.transform((data) => ({
            ...data,
            priority: data.priority === '' ? null : data.priority,
            color: data.color === '' ? null : data.color,
            icon: data.icon === '' ? null : data.icon,
            deadline: data.deadline === '' ? null : data.deadline,
            links: data.links.filter((link) => link.url.trim() !== ''),
        }));

        form.put(updateTask.url(task.id), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Task details</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Title</label>
                        <Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} autoFocus />
                        {form.errors.title && <p className="text-xs text-destructive">{form.errors.title}</p>}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Status</label>
                            <Select value={form.data.status} onValueChange={(value) => setStatus(value as Status)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(['todo', 'in_progress', 'done', 'rejected'] as const).map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {STATUS_LABELS[status]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Progress</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={form.data.progress}
                                    onChange={(e) => setProgress(Number(e.target.value))}
                                    className="h-2 flex-1 accent-indigo-600"
                                    aria-label="Percent done"
                                />
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={form.data.progress}
                                    onChange={(e) => setProgress(Number(e.target.value))}
                                    className="h-9 w-16 text-sm"
                                />
                                <span className="text-sm text-muted-foreground">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Deadline</label>
                            <Input type="date" value={form.data.deadline} onChange={(e) => form.setData('deadline', e.target.value)} />
                        </div>
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
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Color</label>
                                {form.data.color !== '' && (
                                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => form.setData('color', '')}>
                                        Clear
                                    </button>
                                )}
                            </div>
                            <ColorPicker id={`mindmap-color-${task.id}`} value={form.data.color || '#6366f1'} onChange={(color) => form.setData('color', color)} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Icon</label>
                            <div className="flex flex-wrap gap-1">
                                <button
                                    type="button"
                                    onClick={() => form.setData('icon', '')}
                                    className={cn(
                                        'flex size-8 items-center justify-center rounded-md border text-xs',
                                        form.data.icon === '' ? 'border-foreground bg-muted' : 'border-border hover:bg-muted',
                                    )}
                                    title="No icon"
                                >
                                    <X className="size-4 text-muted-foreground" />
                                </button>
                                {ICON_KEYS.map((key) => {
                                    const IconComp = ICONS[key];

                                    return (
                                        <button
                                            type="button"
                                            key={key}
                                            onClick={() => form.setData('icon', key)}
                                            className={cn(
                                                'flex size-8 items-center justify-center rounded-md border',
                                                form.data.icon === key ? 'border-foreground bg-muted' : 'border-border hover:bg-muted',
                                            )}
                                            title={key}
                                        >
                                            <IconComp className="size-4" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            className="min-h-[80px] w-full rounded-lg border border-border bg-white/50 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-black/20"
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
                                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                        {tag}
                                        <button type="button" onClick={() => form.setData('tags', form.data.tags.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>
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
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => form.setData('links', [...form.data.links, { label: '', url: '' }])}>
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
                                        <Input value={link.label ?? ''} onChange={(e) => updateLink(index, 'label', e.target.value)} placeholder="Label" className="h-8 w-1/3 text-sm" />
                                        <Input value={link.url} onChange={(e) => updateLink(index, 'url', e.target.value)} placeholder="https://…" className="h-8 flex-1 text-sm" />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 shrink-0 text-destructive hover:bg-destructive/10"
                                            onClick={() => form.setData('links', form.data.links.filter((_, i) => i !== index))}
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

export default function TaskMindmapIndex({ tree }: Props) {
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [view, setView] = useState<View>('open');
    const [editing, setEditing] = useState<TaskNode | null>(null);

    const dragFrom = useRef<{ parentId: number | null; id: number } | null>(null);
    const dragTo = useRef<{ parentId: number | null; id: number } | null>(null);

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

    const siblingsOf = (parentId: number | null): TaskNode[] => {
        if (parentId === null) {
            return tree;
        }

        const stack = [...tree];
        while (stack.length > 0) {
            const node = stack.pop()!;
            if (node.id === parentId) {
                return node.children;
            }
            stack.push(...node.children);
        }

        return [];
    };

    const ctx: NodeContext = {
        view,
        expanded,
        onToggleExpand: toggleExpand,
        onEdit: setEditing,
        onStatus: (node, status) => {
            const next = node.status === status ? 'todo' : status;
            router.post(statusTask.url(node.id), { status: next }, { preserveScroll: true, preserveState: true });
        },
        onShowAll: () => setView('all'),
        onDelete: (node) => {
            const warning = node.children.length > 0 ? `Delete "${node.title}" and all its subtasks?` : `Delete "${node.title}"?`;
            if (confirm(warning)) {
                router.delete(destroyTask.url(node.id), { preserveScroll: true, preserveState: true });
            }
        },
        onAdded: (parentId) => setExpanded((current) => new Set(current).add(parentId)),
        dragStart: (parentId, id) => {
            dragFrom.current = { parentId, id };
        },
        dragEnter: (parentId, id) => {
            if (dragFrom.current && dragFrom.current.parentId === parentId) {
                dragTo.current = { parentId, id };
            }
        },
        dragEnd: () => {
            const from = dragFrom.current;
            const to = dragTo.current;
            dragFrom.current = null;
            dragTo.current = null;

            if (!from || !to || from.parentId !== to.parentId || from.id === to.id) {
                return;
            }

            /** Resolve against the unfiltered siblings so a filtered view still reorders correctly. */
            const siblings = [...siblingsOf(from.parentId)];
            const fromIndex = siblings.findIndex((item) => item.id === from.id);
            const toIndex = siblings.findIndex((item) => item.id === to.id);

            if (fromIndex === -1 || toIndex === -1) {
                return;
            }

            const [moved] = siblings.splice(fromIndex, 1);
            siblings.splice(toIndex, 0, moved);

            router.patch(
                reorderTasks.url(),
                { order: siblings.map((item, position) => ({ id: item.id, position })) },
                { preserveScroll: true, preserveState: true },
            );
        },
    };

    const totals = useMemo(() => {
        let done = 0;
        let total = 0;
        let progress = 0;
        for (const node of tree) {
            const counts = node.status === 'rejected' ? 0 : 1;
            total += node.total_count + counts;
            done += node.done_count + (node.status === 'done' ? 1 : 0);
            progress += node.progress_sum + (counts * node.progress) / 100;
        }

        return { done, total, percent: total === 0 ? 0 : Math.round((progress / total) * 100) };
    }, [tree]);

    const rootNodes = view === 'open' ? tree.filter(isOpen) : tree;
    const hiddenRoots = tree.length - rootNodes.length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Task Mindmap" />

            <div className="relative flex h-full flex-1 flex-col">
                <PageBackground />

                <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 p-4 lg:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-semibold">Task Mindmap</h1>
                            <p className="text-sm text-muted-foreground">
                                {totals.total === 0
                                    ? 'Break big goals into a tree of tasks'
                                    : `${totals.done} of ${totals.total} tasks done · ${totals.percent}% complete`}
                            </p>
                        </div>
                        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-white/60 p-0.5 text-sm dark:bg-black/30">
                            {(['open', 'all'] as const).map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setView(v)}
                                    className={cn(
                                        'rounded-md px-3 py-1 font-medium transition-colors',
                                        view === v ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {v === 'open' ? 'Open' : 'All'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-indigo-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-indigo-800/50 dark:bg-black/40">
                        <div className="mb-3">
                            <AddTaskForm parentId={null} onAdded={() => undefined} placeholder="Add a top-level task…" />
                        </div>

                        {rootNodes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
                                <ListTree className="mb-2 size-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">
                                    {view === 'open' && tree.length > 0 ? 'No open tasks — switch to “All” to see finished ones.' : 'No tasks yet. Add your first one above.'}
                                </p>
                            </div>
                        ) : (
                            <>
                                <ul className="space-y-0.5">
                                    {rootNodes.map((node) => (
                                        <TaskRow key={node.id} node={node} parentId={null} ctx={ctx} />
                                    ))}
                                </ul>
                                {view === 'open' && hiddenRoots > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setView('all')}
                                        className="mt-2 text-xs text-muted-foreground/70 hover:text-foreground"
                                    >
                                        {hiddenRoots} finished task{hiddenRoots === 1 ? '' : 's'} hidden — show all
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <EditTaskDialog
                key={editing ? `edit-${editing.id}` : 'none'}
                open={editing !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditing(null);
                    }
                }}
                task={editing}
            />
        </AppLayout>
    );
}
