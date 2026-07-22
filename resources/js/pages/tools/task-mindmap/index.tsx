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

type Status = 'todo' | 'done' | 'rejected';
type Priority = 'low' | 'medium' | 'high';

type TaskLink = { label: string | null; url: string };

type TaskNode = {
    id: number;
    title: string;
    status: Status;
    description: string | null;
    links: TaskLink[];
    tags: string[];
    color: string | null;
    icon: string | null;
    priority: Priority | null;
    deadline: string | null;
    done_count: number;
    total_count: number;
    children: TaskNode[];
};

type Props = {
    tree: TaskNode[];
};

type View = 'all' | 'todo';

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
    dragStart: (parentId: number | null, index: number) => void;
    dragEnter: (parentId: number | null, index: number) => void;
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

function StatusIcon({ status, color }: { status: Status; color: string | null }) {
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

function TaskRow({ node, parentId, index, ctx }: { node: TaskNode; parentId: number | null; index: number; ctx: NodeContext }) {
    const visibleChildren = ctx.view === 'todo' ? node.children.filter((c) => c.status === 'todo') : node.children;
    const isExpanded = ctx.expanded.has(node.id);
    const hasChildren = node.children.length > 0;
    const canReorder = ctx.view === 'all';
    const Icon = node.icon ? ICONS[node.icon] : null;
    const resolved = node.status !== 'todo';

    return (
        <li>
            <div
                onDragEnter={() => canReorder && ctx.dragEnter(parentId, index)}
                onDragOver={(e) => canReorder && e.preventDefault()}
                className={cn(
                    'group flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 hover:border-border hover:bg-white/60 dark:hover:bg-black/20',
                    node.status === 'done' && 'opacity-80',
                    node.status === 'rejected' && 'opacity-60',
                )}
                style={node.color ? { borderLeft: `3px solid ${node.color}` } : undefined}
            >
                {canReorder ? (
                    <span
                        draggable
                        onDragStart={() => ctx.dragStart(parentId, index)}
                        onDragEnd={ctx.dragEnd}
                        className="shrink-0 cursor-grab text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing"
                        title="Drag to reorder"
                    >
                        <GripVertical className="size-4" />
                    </span>
                ) : (
                    <span className="w-4 shrink-0" />
                )}

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
                    <StatusIcon status={node.status} color={node.color} />
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
                            {visibleChildren.map((child, childIndex) => (
                                <TaskRow key={child.id} node={child} parentId={node.id} index={childIndex} ctx={ctx} />
                            ))}
                        </ul>
                    ) : (
                        ctx.view === 'todo' && <p className="py-1 text-xs text-muted-foreground/70">No open subtasks.</p>
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
    tags: string[];
    links: TaskLink[];
};

function EditTaskDialog({ open, onOpenChange, task }: { open: boolean; onOpenChange: (open: boolean) => void; task: TaskNode | null }) {
    const form = useForm<EditFormData>({
        title: task?.title ?? '',
        description: task?.description ?? '',
        deadline: task?.deadline ?? '',
        color: task?.color ?? '',
        icon: task?.icon ?? '',
        priority: task?.priority ?? '',
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
    const [view, setView] = useState<View>('all');
    const [editing, setEditing] = useState<TaskNode | null>(null);

    const dragFrom = useRef<{ parentId: number | null; index: number } | null>(null);
    const dragTo = useRef<{ parentId: number | null; index: number } | null>(null);

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
        onDelete: (node) => {
            const warning = node.children.length > 0 ? `Delete "${node.title}" and all its subtasks?` : `Delete "${node.title}"?`;
            if (confirm(warning)) {
                router.delete(destroyTask.url(node.id), { preserveScroll: true, preserveState: true });
            }
        },
        onAdded: (parentId) => setExpanded((current) => new Set(current).add(parentId)),
        dragStart: (parentId, index) => {
            dragFrom.current = { parentId, index };
        },
        dragEnter: (parentId, index) => {
            if (dragFrom.current && dragFrom.current.parentId === parentId) {
                dragTo.current = { parentId, index };
            }
        },
        dragEnd: () => {
            const from = dragFrom.current;
            const to = dragTo.current;
            dragFrom.current = null;
            dragTo.current = null;

            if (!from || !to || from.parentId !== to.parentId || from.index === to.index) {
                return;
            }

            const siblings = [...siblingsOf(from.parentId)];
            const [moved] = siblings.splice(from.index, 1);
            siblings.splice(to.index, 0, moved);

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
        for (const node of tree) {
            total += node.total_count + (node.status === 'rejected' ? 0 : 1);
            done += node.done_count + (node.status === 'done' ? 1 : 0);
        }

        return { done, total };
    }, [tree]);

    const rootNodes = view === 'todo' ? tree.filter((n) => n.status === 'todo') : tree;

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
                                {totals.total === 0 ? 'Break big goals into a tree of tasks' : `${totals.done} of ${totals.total} tasks done`}
                            </p>
                        </div>
                        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-white/60 p-0.5 text-sm dark:bg-black/30">
                            {(['all', 'todo'] as const).map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setView(v)}
                                    className={cn(
                                        'rounded-md px-3 py-1 font-medium transition-colors',
                                        view === v ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {v === 'all' ? 'All' : 'To do'}
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
                                    {view === 'todo' && tree.length > 0 ? 'No open tasks — switch to “All” to see finished ones.' : 'No tasks yet. Add your first one above.'}
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-0.5">
                                {rootNodes.map((node, index) => (
                                    <TaskRow key={node.id} node={node} parentId={null} index={index} ctx={ctx} />
                                ))}
                            </ul>
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
