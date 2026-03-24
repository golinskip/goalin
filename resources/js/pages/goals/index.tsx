import { Head, Link, router } from '@inertiajs/react';
import { GripVertical, Pencil, Plus, Target, Trash2, Zap } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { index as goalsIndex, create as goalsCreate } from '@/routes/goals';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Goals',
        href: goalsIndex(),
    },
];

type Goal = {
    id: number;
    name: string;
    description: string | null;
    color: string;
    activities_count: number;
    sort_order: number;
    updated_at: string;
};

type Props = {
    goals: Goal[];
};

function timeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
}

export default function GoalsIndex({ goals: initialGoals }: Props) {
    const [goals, setGoals] = useState(initialGoals);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = useCallback((index: number) => {
        dragItem.current = index;
    }, []);

    const handleDragEnter = useCallback((index: number) => {
        dragOverItem.current = index;
    }, []);

    const handleDragEnd = useCallback(() => {
        if (dragItem.current === null || dragOverItem.current === null) return;

        const items = [...goals];
        const draggedItem = items[dragItem.current];
        items.splice(dragItem.current, 1);
        items.splice(dragOverItem.current, 0, draggedItem);

        const reordered = items.map((item, index) => ({ ...item, sort_order: index }));

        setGoals(reordered);
        dragItem.current = null;
        dragOverItem.current = null;

        router.patch(
            '/goals/reorder',
            {
                order: reordered.map((g) => ({ id: g.id, sort_order: g.sort_order })),
            } as Record<string, unknown>,
            { preserveScroll: true },
        );
    }, [goals]);

    const handleDelete = useCallback((id: number) => {
        if (!confirm('Are you sure you want to delete this goal?')) return;
        router.delete(`/goals/${id}`, { preserveScroll: true });
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Goals" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-semibold">Goals</h1>
                        <Button asChild>
                            <Link href={goalsCreate()}>
                                <Plus className="mr-2 size-4" />
                                Add Goal
                            </Link>
                        </Button>
                    </div>

                    {goals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-yellow-200/80 bg-white/70 py-20 text-center shadow-sm backdrop-blur-sm dark:border-yellow-800/50 dark:bg-black/40">
                            <Target className="mb-3 size-12 text-yellow-400/50 dark:text-yellow-600/50" />
                            <p className="text-muted-foreground">No goals yet</p>
                            <p className="mt-1 text-sm text-muted-foreground/75">
                                Define your goals to give purpose to your activities.
                            </p>
                            <Button asChild className="mt-4">
                                <Link href={goalsCreate()}>
                                    <Plus className="mr-2 size-4" />
                                    Add Goal
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-green-200/80 bg-white/70 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border/50 text-left text-muted-foreground">
                                            <th className="w-10 px-3 py-3"></th>
                                            <th className="px-3 py-3 font-medium">Name</th>
                                            <th className="px-3 py-3 font-medium">Color</th>
                                            <th className="px-3 py-3 text-right font-medium">Activities</th>
                                            <th className="px-3 py-3 font-medium">Last Changed</th>
                                            <th className="w-24 px-3 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {goals.map((goal, index) => (
                                            <tr
                                                key={goal.id}
                                                draggable
                                                onDragStart={() => handleDragStart(index)}
                                                onDragEnter={() => handleDragEnter(index)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={(e) => e.preventDefault()}
                                                className="border-b border-border/30 transition-colors last:border-0 hover:bg-white/50 dark:hover:bg-white/5"
                                            >
                                                <td className="px-3 py-3">
                                                    <GripVertical className="size-4 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="flex size-8 items-center justify-center rounded-lg"
                                                            style={{ backgroundColor: goal.color + '20' }}
                                                        >
                                                            <Target className="size-4" style={{ color: goal.color }} />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{goal.name}</div>
                                                            {goal.description && (
                                                                <div className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                                                                    {goal.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="size-4 rounded-full border border-border/50"
                                                            style={{ backgroundColor: goal.color }}
                                                        />
                                                        <span className="text-xs text-muted-foreground">{goal.color}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                    <div className="inline-flex items-center gap-1 text-muted-foreground">
                                                        <Zap className="size-3.5" />
                                                        <span className="text-sm">{goal.activities_count}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-muted-foreground">
                                                    {timeAgo(goal.updated_at)}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="size-8" asChild>
                                                            <Link href={`/goals/${goal.id}/edit`}>
                                                                <Pencil className="size-3.5" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-destructive hover:text-destructive"
                                                            onClick={() => handleDelete(goal.id)}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
