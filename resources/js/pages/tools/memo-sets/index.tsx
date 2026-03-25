import { Head, Link, router } from '@inertiajs/react';
import { BookOpen, Layers, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { index as memoSetsIndex, create as memoSetsCreate } from '@/routes/memo-sets';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Memo Cards', href: memoSetsIndex() },
];

type MemoSet = {
    id: number;
    name: string;
    description: string | null;
    color: string;
    cards_count: number;
    updated_at: string;
};

type Props = {
    memoSets: MemoSet[];
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

export default function MemoSetsIndex({ memoSets }: Props) {
    const handleDelete = useCallback((id: number) => {
        if (!confirm('Are you sure you want to delete this memo set and all its cards?')) return;
        router.delete(`/memo-sets/${id}`, { preserveScroll: true });
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Memo Cards" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-semibold">Memo Cards</h1>
                        <Button asChild>
                            <Link href={memoSetsCreate()}>
                                <Plus className="mr-2 size-4" />
                                New Set
                            </Link>
                        </Button>
                    </div>

                    {memoSets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-blue-200/80 bg-white/70 py-20 text-center shadow-sm backdrop-blur-sm dark:border-blue-800/50 dark:bg-black/40">
                            <Layers className="mb-3 size-12 text-blue-400/50 dark:text-blue-600/50" />
                            <p className="text-muted-foreground">No memo sets yet</p>
                            <p className="mt-1 text-sm text-muted-foreground/75">
                                Create a set and add flashcards to start learning.
                            </p>
                            <Button asChild className="mt-4">
                                <Link href={memoSetsCreate()}>
                                    <Plus className="mr-2 size-4" />
                                    New Set
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {memoSets.map((set) => (
                                <div
                                    key={set.id}
                                    className="group rounded-xl border border-border/50 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md dark:bg-black/40"
                                >
                                    <div className="mb-3 flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex size-10 items-center justify-center rounded-lg"
                                                style={{ backgroundColor: set.color + '20' }}
                                            >
                                                <BookOpen className="size-5" style={{ color: set.color }} />
                                            </div>
                                            <div>
                                                <Link
                                                    href={`/memo-sets/${set.id}`}
                                                    className="font-semibold hover:underline"
                                                >
                                                    {set.name}
                                                </Link>
                                                <p className="text-xs text-muted-foreground">
                                                    {set.cards_count} {set.cards_count === 1 ? 'card' : 'cards'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {set.description && (
                                        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                                            {set.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">{timeAgo(set.updated_at)}</span>
                                        <div className="flex items-center gap-1">
                                            {set.cards_count > 0 && (
                                                <Button variant="ghost" size="icon" className="size-8" asChild>
                                                    <Link href={`/memo-sets/${set.id}/learn`}>
                                                        <Play className="size-3.5 text-green-600" />
                                                    </Link>
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="size-8" asChild>
                                                <Link href={`/memo-sets/${set.id}/edit`}>
                                                    <Pencil className="size-3.5" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(set.id)}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
