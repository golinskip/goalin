import { Head, Link, router, useForm } from '@inertiajs/react';
import { Library, ListMusic, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { randomColor } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Music Player', href: '/music' }];

type PlaylistType = {
    id: number;
    name: string;
    description: string | null;
    color: string;
    music_files_count: number;
    music_file_ids: number[];
};

type Props = {
    playlists: PlaylistType[];
};

export default function MusicIndex({ playlists }: Props) {
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const playlistForm = useForm({ name: '', description: '', color: randomColor() });

    const handleCreatePlaylist = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            playlistForm.post('/playlists', {
                onSuccess: () => {
                    setShowCreatePlaylist(false);
                    playlistForm.reset();
                    playlistForm.setData('color', randomColor());
                },
            });
        },
        [playlistForm],
    );

    const handleDeletePlaylist = useCallback((id: number) => {
        if (!confirm('Delete this playlist?')) return;
        router.delete(`/playlists/${id}`, { preserveScroll: true });
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Music Player" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    {/* Music Library Button */}
                    <div>
                        <Button asChild variant="outline" size="lg">
                            <Link href="/music/library">
                                <Library className="size-5" />
                                Music Library
                            </Link>
                        </Button>
                    </div>

                    {/* Playlists Section */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-lg font-semibold">
                                <ListMusic className="size-5" />
                                Playlists
                            </h2>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowCreatePlaylist(!showCreatePlaylist)}
                            >
                                {showCreatePlaylist ? <X className="size-4" /> : <Plus className="size-4" />}
                                {showCreatePlaylist ? 'Cancel' : 'New Playlist'}
                            </Button>
                        </div>

                        {showCreatePlaylist && (
                            <div className="mb-4 rounded-xl border border-pink-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-pink-800/50 dark:bg-black/40">
                                <form onSubmit={handleCreatePlaylist} className="flex flex-wrap items-end gap-4">
                                    <div className="grid min-w-48 flex-1 gap-2">
                                        <Label htmlFor="playlist-name">Name</Label>
                                        <Input
                                            id="playlist-name"
                                            value={playlistForm.data.name}
                                            onChange={(e) => playlistForm.setData('name', e.target.value)}
                                            placeholder="My Playlist"
                                            required
                                        />
                                        <InputError message={playlistForm.errors.name} />
                                    </div>
                                    <div className="grid min-w-48 flex-1 gap-2">
                                        <Label htmlFor="playlist-desc">Description</Label>
                                        <Input
                                            id="playlist-desc"
                                            value={playlistForm.data.description}
                                            onChange={(e) => playlistForm.setData('description', e.target.value)}
                                            placeholder="Optional description"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="playlist-color">Color</Label>
                                        <input
                                            id="playlist-color"
                                            type="color"
                                            value={playlistForm.data.color}
                                            onChange={(e) => playlistForm.setData('color', e.target.value)}
                                            className="h-9 w-14 cursor-pointer rounded-md border border-input"
                                        />
                                    </div>
                                    <Button type="submit" disabled={playlistForm.processing}>
                                        {playlistForm.processing && <Spinner />}
                                        Create
                                    </Button>
                                </form>
                            </div>
                        )}

                        {playlists.length === 0 && !showCreatePlaylist ? (
                            <div className="rounded-xl border border-pink-200/80 bg-white/70 p-8 text-center shadow-sm backdrop-blur-sm dark:border-pink-800/50 dark:bg-black/40">
                                <ListMusic className="mx-auto mb-2 size-8 text-pink-400/50" />
                                <p className="text-muted-foreground">No playlists yet</p>
                                <p className="text-sm text-muted-foreground/75">Create a playlist to organize your music.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {playlists.map((playlist) => (
                                    <div
                                        key={playlist.id}
                                        className="group relative rounded-xl border bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:bg-black/40"
                                        style={{
                                            borderColor: playlist.color + '40',
                                        }}
                                    >
                                        <Link href={`/playlists/${playlist.id}`} className="block">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                                                    style={{ backgroundColor: playlist.color + '25' }}
                                                >
                                                    <ListMusic className="size-5" style={{ color: playlist.color }} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-semibold">{playlist.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {playlist.music_files_count} track{playlist.music_files_count !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            {playlist.description && (
                                                <p className="mt-2 truncate text-sm text-muted-foreground">{playlist.description}</p>
                                            )}
                                        </Link>
                                        <button
                                            onClick={() => handleDeletePlaylist(playlist.id)}
                                            className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
