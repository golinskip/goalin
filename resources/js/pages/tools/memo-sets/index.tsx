import { Head, Link, router, useForm } from '@inertiajs/react';
import { BookOpen, Folder, FolderInput, FolderPlus, Layers, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import PageBackground from '@/components/page-background';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AppLayout from '@/layouts/app-layout';
import { randomColor } from '@/lib/utils';
import { index as memoSetsIndex } from '@/routes/memo-sets';
import type { BreadcrumbItem } from '@/types';

type FolderSummary = {
    id: number;
    name: string;
    color: string;
    folders_count: number;
    sets_count: number;
};

type MemoSet = {
    id: number;
    name: string;
    description: string | null;
    color: string;
    cards_count: number;
    updated_at: string;
};

type FolderOption = {
    id: number;
    parent_id: number | null;
    name: string;
    path: string;
};

type Crumb = {
    id: number;
    name: string;
};

type Props = {
    currentFolder: { id: number; name: string; color: string; parent_id: number | null } | null;
    breadcrumb: Crumb[];
    folders: FolderSummary[];
    memoSets: MemoSet[];
    folderOptions: FolderOption[];
};

/** What a move dialog is acting on. */
type MoveTarget = { kind: 'folder' | 'set'; id: number; name: string };

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

function folderSummary(folder: FolderSummary): string {
    const parts: string[] = [];

    if (folder.folders_count > 0) {
        parts.push(`${folder.folders_count} ${folder.folders_count === 1 ? 'folder' : 'folders'}`);
    }

    if (folder.sets_count > 0) {
        parts.push(`${folder.sets_count} ${folder.sets_count === 1 ? 'set' : 'sets'}`);
    }

    return parts.length === 0 ? 'Empty' : parts.join(' · ');
}

function FolderFormDialog({
    open,
    onOpenChange,
    editing,
    parentId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: FolderSummary | null;
    parentId: number | null;
}) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: editing?.name ?? '',
        color: editing?.color ?? randomColor(),
        parent_id: parentId,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        };

        if (editing) {
            put(`/memo-folders/${editing.id}`, options);
        } else {
            post('/memo-folders', options);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editing ? 'Edit folder' : 'New folder'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="folder-name">Name</Label>
                        <Input
                            id="folder-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder='e.g. "Languages"'
                            autoFocus
                            required
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <ColorPicker
                            id="folder-color"
                            label="Color"
                            value={data.color}
                            onChange={(color) => setData('color', color)}
                        />
                        <InputError message={errors.color} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            {editing ? 'Save changes' : 'Create folder'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MoveDialog({
    target,
    onOpenChange,
    folderOptions,
    currentParentId,
}: {
    target: MoveTarget | null;
    onOpenChange: (open: boolean) => void;
    folderOptions: FolderOption[];
    currentParentId: number | null;
}) {
    const [processing, setProcessing] = useState(false);

    /**
     * A folder cannot be moved into itself or its own descendants, so those are
     * left out of the picker.
     */
    const choices = useMemo(() => {
        if (target === null || target.kind === 'set') {
            return folderOptions;
        }

        const isBeneathTarget = (option: FolderOption): boolean => {
            let parentId = option.parent_id;

            while (parentId !== null) {
                if (parentId === target.id) {
                    return true;
                }

                parentId = folderOptions.find((candidate) => candidate.id === parentId)?.parent_id ?? null;
            }

            return false;
        };

        return folderOptions.filter((option) => option.id !== target.id && !isBeneathTarget(option));
    }, [target, folderOptions]);

    if (target === null) {
        return null;
    }

    const move = (folderId: number | null) => {
        setProcessing(true);

        const url = target.kind === 'folder' ? `/memo-folders/${target.id}/move` : `/memo-sets/${target.id}/move`;
        const payload = target.kind === 'folder' ? { parent_id: folderId } : { memo_folder_id: folderId };

        router.put(url, payload, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move &ldquo;{target.name}&rdquo;</DialogTitle>
                </DialogHeader>

                <p className="text-sm text-muted-foreground">Pick a destination.</p>

                <div className="max-h-72 space-y-1 overflow-y-auto">
                    <button
                        type="button"
                        disabled={processing || currentParentId === null}
                        onClick={() => move(null)}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                    >
                        <Layers className="size-4 shrink-0 text-muted-foreground" />
                        Memo Cards
                        {currentParentId === null && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
                    </button>

                    {choices.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            disabled={processing || currentParentId === option.id}
                            onClick={() => move(option.id)}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                        >
                            <Folder className="size-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{option.path}</span>
                            {currentParentId === option.id && (
                                <span className="ml-auto shrink-0 text-xs text-muted-foreground">Current</span>
                            )}
                        </button>
                    ))}
                </div>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function MemoSetsIndex({ currentFolder, breadcrumb, folders, memoSets, folderOptions }: Props) {
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<FolderSummary | null>(null);
    const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Memo Cards', href: memoSetsIndex() },
        ...breadcrumb.map((crumb) => ({ title: crumb.name, href: `/memo-folders/${crumb.id}` })),
    ];

    const handleDeleteSet = useCallback((id: number) => {
        if (!confirm('Are you sure you want to delete this memo set and all its cards?')) {
            return;
        }

        router.delete(`/memo-sets/${id}`, { preserveScroll: true });
    }, []);

    const handleDeleteFolder = useCallback((folder: FolderSummary) => {
        if (!confirm(`Delete the folder "${folder.name}"?`)) {
            return;
        }

        router.delete(`/memo-folders/${folder.id}`, { preserveScroll: true });
    }, []);

    const openNewFolder = () => {
        setEditingFolder(null);
        setFolderDialogOpen(true);
    };

    const openEditFolder = (folder: FolderSummary) => {
        setEditingFolder(folder);
        setFolderDialogOpen(true);
    };

    const createSetHref = currentFolder ? `/memo-sets/create?folder=${currentFolder.id}` : '/memo-sets/create';
    const isEmpty = folders.length === 0 && memoSets.length === 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={currentFolder ? currentFolder.name : 'Memo Cards'} />

            <div className="relative flex h-full flex-1 flex-col">
                <PageBackground />

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h1 className="flex items-center gap-2 text-2xl font-semibold">
                            {currentFolder && <Folder className="size-6 shrink-0" style={{ color: currentFolder.color }} />}
                            {currentFolder ? currentFolder.name : 'Memo Cards'}
                        </h1>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={openNewFolder}>
                                <FolderPlus className="mr-2 size-4" />
                                New Folder
                            </Button>
                            <Button asChild>
                                <Link href={createSetHref}>
                                    <Plus className="mr-2 size-4" />
                                    New Set
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {isEmpty ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-blue-200/80 bg-white/70 py-20 text-center shadow-sm backdrop-blur-sm dark:border-blue-800/50 dark:bg-black/40">
                            <Layers className="mb-3 size-12 text-blue-400/50 dark:text-blue-600/50" />
                            <p className="text-muted-foreground">{currentFolder ? 'This folder is empty' : 'No memo sets yet'}</p>
                            <p className="mt-1 text-sm text-muted-foreground/75">
                                Create a set to start learning, or add a folder to group sets together.
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                                <Button variant="outline" onClick={openNewFolder}>
                                    <FolderPlus className="mr-2 size-4" />
                                    New Folder
                                </Button>
                                <Button asChild>
                                    <Link href={createSetHref}>
                                        <Plus className="mr-2 size-4" />
                                        New Set
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {folders.length > 0 && (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {folders.map((folder) => {
                                        const isPopulated = folder.folders_count + folder.sets_count > 0;

                                        return (
                                            <div
                                                key={folder.id}
                                                className="group rounded-xl border border-border/50 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md dark:bg-black/40"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                                                        style={{ backgroundColor: folder.color + '20' }}
                                                    >
                                                        <Folder className="size-5" style={{ color: folder.color }} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={`/memo-folders/${folder.id}`}
                                                            className="block truncate font-semibold hover:underline"
                                                        >
                                                            {folder.name}
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground">{folderSummary(folder)}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        title="Move"
                                                        onClick={() => setMoveTarget({ kind: 'folder', id: folder.id, name: folder.name })}
                                                    >
                                                        <FolderInput className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        title="Edit"
                                                        onClick={() => openEditFolder(folder)}
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-destructive hover:text-destructive"
                                                        title={isPopulated ? 'Empty this folder before deleting it' : 'Delete'}
                                                        disabled={isPopulated}
                                                        onClick={() => handleDeleteFolder(folder)}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {memoSets.length > 0 && (
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
                                                        <Link href={`/memo-sets/${set.id}`} className="font-semibold hover:underline">
                                                            {set.name}
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground">
                                                            {set.cards_count} {set.cards_count === 1 ? 'card' : 'cards'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {set.description && (
                                                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{set.description}</p>
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
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        title="Move"
                                                        onClick={() => setMoveTarget({ kind: 'set', id: set.id, name: set.name })}
                                                    >
                                                        <FolderInput className="size-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="size-8" asChild>
                                                        <Link href={`/memo-sets/${set.id}/edit`}>
                                                            <Pencil className="size-3.5" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-destructive hover:text-destructive"
                                                        onClick={() => handleDeleteSet(set.id)}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <FolderFormDialog
                key={editingFolder?.id ?? 'new-folder'}
                open={folderDialogOpen}
                onOpenChange={setFolderDialogOpen}
                editing={editingFolder}
                parentId={currentFolder?.id ?? null}
            />

            <MoveDialog
                target={moveTarget}
                onOpenChange={(open) => {
                    if (!open) {
                        setMoveTarget(null);
                    }
                }}
                folderOptions={folderOptions}
                currentParentId={currentFolder?.id ?? null}
            />
        </AppLayout>
    );
}
