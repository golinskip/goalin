import { Head, Link, router, useForm } from '@inertiajs/react';
import { Check, ListMusic, ListPlus, Music, Pause, Play, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { randomColor } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Music Player', href: '/music' }];

type MusicFileType = {
    id: number;
    title: string;
    artist: string | null;
    original_filename: string;
    duration_seconds: number | null;
    file_size: number;
    created_at: string;
};

type PlaylistType = {
    id: number;
    name: string;
    description: string | null;
    color: string;
    music_files_count: number;
    music_file_ids: number[];
};

type Props = {
    musicFiles: MusicFileType[];
    playlists: PlaylistType[];
    maxFileSize: number;
};

function formatDuration(seconds: number | null): string {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/x-m4a'];
const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];

function isAudioFile(file: File): boolean {
    if (ACCEPTED_AUDIO_TYPES.includes(file.type)) return true;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return ACCEPTED_EXTENSIONS.includes(ext);
}

export default function MusicIndex({ musicFiles, playlists, maxFileSize }: Props) {
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [editingFile, setEditingFile] = useState<MusicFileType | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [rejectedFiles, setRejectedFiles] = useState<{ name: string; reason: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [previewingId, setPreviewingId] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const dragCounter = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const togglePreview = useCallback((fileId: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        if (previewingId === fileId) {
            audio.pause();
            setPreviewingId(null);
            return;
        }

        audio.src = `/music/${fileId}/stream`;
        audio.play();
        setPreviewingId(fileId);
    }, [previewingId]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => setPreviewingId(null);
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, []);

    const playlistForm = useForm({ name: '', description: '', color: randomColor() });
    const editForm = useForm({ title: '', artist: '' });

    const addFiles = useCallback((incoming: File[]) => {
        const rejected: { name: string; reason: string }[] = [];
        const accepted: File[] = [];

        for (const file of incoming) {
            if (!isAudioFile(file)) {
                rejected.push({ name: file.name, reason: 'Not an audio file' });
            } else if (file.size > maxFileSize) {
                rejected.push({ name: file.name, reason: `Exceeds ${formatFileSize(maxFileSize)} limit (${formatFileSize(file.size)})` });
            } else {
                accepted.push(file);
            }
        }

        setRejectedFiles(rejected);

        if (accepted.length > 0) {
            setPendingFiles((prev) => {
                const existing = new Set(prev.map((f) => f.name + f.size));
                const unique = accepted.filter((f) => !existing.has(f.name + f.size));
                return [...prev, ...unique];
            });
        }
    }, [maxFileSize]);

    const removeFile = useCallback((index: number) => {
        setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleUpload = useCallback(() => {
        if (pendingFiles.length === 0 || uploading) return;
        setUploading(true);

        const formData = new FormData();
        pendingFiles.forEach((file) => formData.append('files[]', file));

        router.post('/music', formData, {
            forceFormData: true,
            onSuccess: () => {
                setPendingFiles([]);
                setRejectedFiles([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onFinish: () => setUploading(false),
        });
    }, [pendingFiles, uploading]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current = 0;
            setIsDragging(false);

            const files = Array.from(e.dataTransfer.files);
            addFiles(files);
        },
        [addFiles],
    );

    const totalPendingSize = useMemo(
        () => pendingFiles.reduce((sum, f) => sum + f.size, 0),
        [pendingFiles],
    );

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

    const handleEdit = useCallback(
        (file: MusicFileType) => {
            setEditingFile(file);
            editForm.setData({ title: file.title, artist: file.artist ?? '' });
        },
        [editForm],
    );

    const submitEdit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!editingFile) return;
            editForm.put(`/music/${editingFile.id}`, {
                onSuccess: () => setEditingFile(null),
            });
        },
        [editForm, editingFile],
    );

    const handleDelete = useCallback((id: number) => {
        if (!confirm('Delete this music file?')) return;
        if (previewingId === id) {
            audioRef.current?.pause();
            setPreviewingId(null);
        }
        router.delete(`/music/${id}`, { preserveScroll: true });
    }, [previewingId]);

    const handleDeletePlaylist = useCallback((id: number) => {
        if (!confirm('Delete this playlist?')) return;
        router.delete(`/playlists/${id}`, { preserveScroll: true });
    }, []);

    const handleAddToPlaylist = useCallback((playlistId: number, musicFileId: number) => {
        router.post(`/playlists/${playlistId}/tracks`, { music_file_id: musicFileId }, { preserveScroll: true });
    }, []);

    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) return musicFiles;
        const q = searchQuery.toLowerCase();
        return musicFiles.filter(
            (f) => f.title.toLowerCase().includes(q) || (f.artist && f.artist.toLowerCase().includes(q)),
        );
    }, [musicFiles, searchQuery]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Music Player" />
            <audio ref={audioRef} className="hidden" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
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

                    {/* Music Library Section */}
                    <div
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        <div className="mb-3 flex items-center justify-between gap-4">
                            <h2 className="flex shrink-0 items-center gap-2 text-lg font-semibold">
                                <Music className="size-5" />
                                Music Library
                            </h2>
                            {musicFiles.length > 0 && (
                                <div className="relative max-w-xs flex-1">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/50" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by title or artist..."
                                        className="pl-9"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground/50 hover:text-foreground"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Drop Zone / Upload Area */}
                        <div
                            className={`mb-4 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                                isDragging
                                    ? 'border-pink-500 bg-pink-50/80 dark:bg-pink-950/30'
                                    : 'border-pink-200/80 bg-white/50 hover:border-pink-300 dark:border-pink-800/50 dark:bg-black/30 dark:hover:border-pink-700'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="audio/*"
                                onChange={(e) => {
                                    const files = e.target.files ? Array.from(e.target.files) : [];
                                    addFiles(files);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="hidden"
                                id="music-file-input"
                            />

                            <Upload className={`mx-auto mb-2 size-8 ${isDragging ? 'text-pink-500' : 'text-pink-400/50'}`} />
                            <p className={`font-medium ${isDragging ? 'text-pink-600 dark:text-pink-400' : 'text-muted-foreground'}`}>
                                {isDragging ? 'Drop audio files here' : 'Drag & drop audio files here'}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground/75">
                                or{' '}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="font-medium text-pink-600 underline underline-offset-2 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
                                >
                                    browse files
                                </button>
                                <span className="ml-1">(.mp3, .wav, .ogg, .flac, .aac, .m4a)</span>
                                <span className="ml-1">- max {formatFileSize(maxFileSize)} per file</span>
                            </p>
                        </div>

                        {/* Rejected Files Warning */}
                        {rejectedFiles.length > 0 && (
                            <div className="mb-4 rounded-xl border border-red-200/80 bg-red-50/70 p-4 dark:border-red-800/50 dark:bg-red-950/30">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                        {rejectedFiles.length} file{rejectedFiles.length !== 1 ? 's' : ''} rejected
                                    </p>
                                    <button
                                        onClick={() => setRejectedFiles([])}
                                        className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>
                                <ul className="mt-2 space-y-1">
                                    {rejectedFiles.map((f, i) => (
                                        <li key={i} className="text-xs text-red-600/80 dark:text-red-400/80">
                                            <span className="font-medium">{f.name}</span> - {f.reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Pending Files Queue */}
                        {pendingFiles.length > 0 && (
                            <div className="mb-4 rounded-xl border border-pink-200/80 bg-white/70 shadow-sm backdrop-blur-sm dark:border-pink-800/50 dark:bg-black/40">
                                <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
                                    <p className="text-sm font-medium">
                                        {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} ready
                                        <span className="ml-2 text-muted-foreground">({formatFileSize(totalPendingSize)})</span>
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setPendingFiles([]);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                        >
                                            Clear
                                        </Button>
                                        <Button size="sm" onClick={handleUpload} disabled={uploading}>
                                            {uploading && <Spinner />}
                                            Upload {pendingFiles.length > 1 ? 'All' : ''}
                                        </Button>
                                    </div>
                                </div>
                                <div className="divide-y divide-border/50">
                                    {pendingFiles.map((file, index) => (
                                        <div
                                            key={file.name + file.size}
                                            className="flex items-center gap-3 px-5 py-2"
                                        >
                                            <Music className="size-4 shrink-0 text-pink-500/40" />
                                            <p className="min-w-0 flex-1 truncate text-sm">{file.name}</p>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {formatFileSize(file.size)}
                                            </span>
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="rounded-md p-1 text-muted-foreground/50 hover:text-red-500"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Edit File Modal (inline) */}
                        {editingFile && (
                            <div className="mb-4 rounded-xl border border-pink-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-pink-800/50 dark:bg-black/40">
                                <h3 className="mb-3 font-medium">Edit Track</h3>
                                <form onSubmit={submitEdit} className="flex flex-wrap items-end gap-4">
                                    <div className="grid min-w-48 flex-1 gap-2">
                                        <Label htmlFor="edit-title">Title</Label>
                                        <Input
                                            id="edit-title"
                                            value={editForm.data.title}
                                            onChange={(e) => editForm.setData('title', e.target.value)}
                                            required
                                        />
                                        <InputError message={editForm.errors.title} />
                                    </div>
                                    <div className="grid min-w-48 flex-1 gap-2">
                                        <Label htmlFor="edit-artist">Artist</Label>
                                        <Input
                                            id="edit-artist"
                                            value={editForm.data.artist}
                                            onChange={(e) => editForm.setData('artist', e.target.value)}
                                            placeholder="Unknown"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="submit" disabled={editForm.processing}>
                                            {editForm.processing && <Spinner />}
                                            Save
                                        </Button>
                                        <Button variant="ghost" type="button" onClick={() => setEditingFile(null)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {musicFiles.length === 0 && pendingFiles.length === 0 ? (
                            <div className="rounded-xl border border-pink-200/80 bg-white/70 p-8 text-center shadow-sm backdrop-blur-sm dark:border-pink-800/50 dark:bg-black/40">
                                <Music className="mx-auto mb-2 size-8 text-pink-400/50" />
                                <p className="text-muted-foreground">No music files uploaded yet</p>
                                <p className="text-sm text-muted-foreground/75">Drag files above or browse to build your library.</p>
                            </div>
                        ) : musicFiles.length > 0 ? (
                            <div className="rounded-xl border border-pink-200/80 bg-white/70 shadow-sm backdrop-blur-sm dark:border-pink-800/50 dark:bg-black/40">
                                {filteredFiles.length === 0 ? (
                                    <div className="px-5 py-8 text-center">
                                        <Search className="mx-auto mb-2 size-6 text-muted-foreground/30" />
                                        <p className="text-sm text-muted-foreground">No tracks matching &ldquo;{searchQuery}&rdquo;</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/50">
                                        {filteredFiles.map((file) => (
                                            <div
                                                key={file.id}
                                                className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-black/[.02] dark:hover:bg-white/[.02] ${previewingId === file.id ? 'bg-pink-50/50 dark:bg-pink-950/20' : ''}`}
                                            >
                                                <button
                                                    onClick={() => togglePreview(file.id)}
                                                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-500/10 text-pink-600 transition-colors hover:bg-pink-500/20 dark:text-pink-400"
                                                >
                                                    {previewingId === file.id ? (
                                                        <Pause className="size-3.5" />
                                                    ) : (
                                                        <Play className="size-3.5 translate-x-px" />
                                                    )}
                                                </button>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{file.title}</p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {file.artist ?? 'Unknown artist'}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    {formatDuration(file.duration_seconds)}
                                                </span>
                                                <span className="shrink-0 text-xs text-muted-foreground/60">
                                                    {formatFileSize(file.file_size)}
                                                </span>
                                                {playlists.length > 0 && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground/50 hover:text-foreground">
                                                            <ListPlus className="size-3.5" />
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            {playlists.map((playlist) => {
                                                                const alreadyAdded = playlist.music_file_ids.includes(file.id);
                                                                return (
                                                                    <DropdownMenuItem
                                                                        key={playlist.id}
                                                                        disabled={alreadyAdded}
                                                                        onClick={() => !alreadyAdded && handleAddToPlaylist(playlist.id, file.id)}
                                                                    >
                                                                        <div
                                                                            className="size-2.5 shrink-0 rounded-full"
                                                                            style={{ backgroundColor: playlist.color }}
                                                                        />
                                                                        <span className="truncate">{playlist.name}</span>
                                                                        {alreadyAdded && <Check className="ml-auto size-3.5 shrink-0 text-muted-foreground" />}
                                                                    </DropdownMenuItem>
                                                                );
                                                            })}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(file)}
                                                    className="rounded-md p-1 text-muted-foreground/50 hover:text-foreground"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(file.id)}
                                                    className="rounded-md p-1 text-muted-foreground/50 hover:text-red-500"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
