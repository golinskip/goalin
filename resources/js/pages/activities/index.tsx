import { Head, Link, router } from '@inertiajs/react';
import { Clock, GripVertical, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { index as activitiesIndex, create as activitiesCreate } from '@/routes/activities';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Activities',
        href: activitiesIndex(),
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
    goals: { id: number; name: string; color: string }[];
    sort_order: number;
    updated_at: string;
};

type Props = {
    activities: Activity[];
};

function timeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
        return 'just now';
    }
    if (diffMins < 60) {
        return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }
    if (diffDays === 1) {
        return 'yesterday';
    }
    return `${diffDays}d ago`;
}

function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export default function ActivitiesIndex({ activities: initialActivities }: Props) {
    const [activities, setActivities] = useState(initialActivities);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = useCallback((index: number) => {
        dragItem.current = index;
    }, []);

    const handleDragEnter = useCallback((index: number) => {
        dragOverItem.current = index;
    }, []);

    const handleDragEnd = useCallback(() => {
        if (dragItem.current === null || dragOverItem.current === null) {
            return;
        }

        const items = [...activities];
        const draggedItem = items[dragItem.current];
        items.splice(dragItem.current, 1);
        items.splice(dragOverItem.current, 0, draggedItem);

        const reordered = items.map((item, index) => ({
            ...item,
            sort_order: index,
        }));

        setActivities(reordered);
        dragItem.current = null;
        dragOverItem.current = null;

        router.patch(
            '/activities/reorder',
            {
                order: reordered.map((a) => ({
                    id: a.id,
                    sort_order: a.sort_order,
                })),
            } as Record<string, unknown>,
            { preserveScroll: true },
        );
    }, [activities]);

    const handleDelete = useCallback((id: number) => {
        if (!confirm('Are you sure you want to delete this activity?')) {
            return;
        }
        router.delete(`/activities/${id}`, { preserveScroll: true });
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activities" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-semibold">Activities</h1>
                        <Button asChild>
                            <Link href={activitiesCreate()}>
                                <Plus className="mr-2 size-4" />
                                Add Activity
                            </Link>
                        </Button>
                    </div>

                    {activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-yellow-200/80 bg-white/70 py-20 text-center shadow-sm backdrop-blur-sm dark:border-yellow-800/50 dark:bg-black/40">
                            <Zap className="mb-3 size-12 text-yellow-400/50 dark:text-yellow-600/50" />
                            <p className="text-muted-foreground">No activities yet</p>
                            <p className="mt-1 text-sm text-muted-foreground/75">
                                Create your first activity type to start tracking.
                            </p>
                            <Button asChild className="mt-4">
                                <Link href={activitiesCreate()}>
                                    <Plus className="mr-2 size-4" />
                                    Add Activity
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
                                            <th className="px-3 py-3 text-right font-medium">Points</th>
                                            <th className="px-3 py-3 font-medium">Timer</th>
                                            <th className="px-3 py-3 font-medium">Tags</th>
                                            <th className="px-3 py-3 font-medium">Goals</th>
                                            <th className="px-3 py-3 font-medium">Last Changed</th>
                                            <th className="w-24 px-3 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activities.map((activity, index) => (
                                            <tr
                                                key={activity.id}
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
                                                    <div className="font-medium">{activity.name}</div>
                                                    {activity.description && (
                                                        <div className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                                                            {activity.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="size-4 rounded-full border border-border/50"
                                                            style={{ backgroundColor: activity.color }}
                                                        />
                                                        <span className="text-xs text-muted-foreground">{activity.color}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-right tabular-nums font-medium">
                                                    {activity.point_cost}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {activity.needs_timer ? (
                                                        <div className="inline-flex items-center gap-1 text-primary">
                                                            <Clock className="size-3.5" />
                                                            <span className="text-xs">
                                                                {formatDuration(activity.duration_minutes!)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground/50">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {activity.tags.length > 0 ? (
                                                            activity.tags.map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                                                                    style={{
                                                                        backgroundColor: activity.color + '20',
                                                                        color: activity.color,
                                                                    }}
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground/50">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {activity.goals.length > 0 ? (
                                                            activity.goals.map((goal) => (
                                                                <span
                                                                    key={goal.id}
                                                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                                                    style={{
                                                                        backgroundColor: goal.color + '20',
                                                                        color: goal.color,
                                                                    }}
                                                                >
                                                                    {goal.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground/50">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-muted-foreground">
                                                    {timeAgo(activity.updated_at)}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="size-8" asChild>
                                                            <Link href={`/activities/${activity.id}/edit`}>
                                                                <Pencil className="size-3.5" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-destructive hover:text-destructive"
                                                            onClick={() => handleDelete(activity.id)}
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
