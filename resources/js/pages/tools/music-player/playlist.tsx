import { Head, router, useForm } from '@inertiajs/react';
import {
    ChevronLeft,
    ListMusic,
    Music,
    Pause,
    Pencil,
    Play,
    Plus,
    SkipBack,
    SkipForward,
    Tag,
    Trash2,
    Upload,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type PlaylistType = {
    id: number;
    name: string;
    description: string | null;
    color: string;
};

type Track = {
    id: number;
    title: string;
    artist: string | null;
    duration_seconds: number | null;
    file_size: number;
    position: number;
    tags: string[];
};

type AvailableFile = {
    id: number;
    title: string;
    artist: string | null;
    duration_seconds: number | null;
};

type Props = {
    playlist: PlaylistType;
    tracks: Track[];
    availableFiles: AvailableFile[];
    maxFileSize: number;
    suggestedTags: string[];
    availableTags: string[];
};

function formatDuration(seconds: number | null): string {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
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

function Player({
    tracks,
    playlistName,
    playlistColor,
}: {
    tracks: Track[];
    playlistName: string;
    playlistColor: string;
}) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [minimized, setMinimized] = useState(false);

    const currentTrack = tracks[currentIndex] ?? null;

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;

        audio.src = `/music/${currentTrack.id}/stream`;
        if (isPlaying) {
            audio.play().catch(() => setIsPlaying(false));
        }
    }, [currentIndex, currentTrack]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onDurationChange = () => setDuration(audio.duration || 0);
        const onEnded = () => {
            if (currentIndex < tracks.length - 1) {
                setCurrentIndex((i) => i + 1);
            } else {
                setIsPlaying(false);
            }
        };

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('durationchange', onDurationChange);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('durationchange', onDurationChange);
            audio.removeEventListener('ended', onEnded);
        };
    }, [currentIndex, tracks.length]);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().then(() => setIsPlaying(true)).catch(() => {});
        }
    }, [isPlaying, currentTrack]);

    const skipPrev = useCallback(() => {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1);
    }, [currentIndex]);

    const skipNext = useCallback(() => {
        if (currentIndex < tracks.length - 1) setCurrentIndex((i) => i + 1);
    }, [currentIndex, tracks.length]);

    const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audio.currentTime = ratio * duration;
    }, [duration]);

    const toggleMute = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isMuted) {
            audio.volume = volume;
            setIsMuted(false);
        } else {
            audio.volume = 0;
            setIsMuted(true);
        }
    }, [isMuted, volume]);

    const changeVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;
        const v = parseFloat(e.target.value);
        setVolume(v);
        audio.volume = v;
        setIsMuted(v === 0);
    }, []);

    const playTrack = useCallback((index: number) => {
        setCurrentIndex(index);
        setIsPlaying(true);
    }, []);

    if (tracks.length === 0) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <>
            <audio ref={audioRef} preload="auto" />

            {/* Track list */}
            <div className="rounded-xl border bg-white/70 shadow-sm backdrop-blur-sm dark:bg-black/40" style={{ borderColor: playlistColor + '40' }}>
                <div className="divide-y divide-border/50">
                    {tracks.map((track, index) => (
                        <button
                            key={track.id}
                            onClick={() => playTrack(index)}
                            className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-black/[.02] dark:hover:bg-white/[.02] ${
                                index === currentIndex ? 'bg-black/[.04] dark:bg-white/[.04]' : ''
                            }`}
                        >
                            <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
                                {index === currentIndex && isPlaying ? (
                                    <span className="inline-block size-2 animate-pulse rounded-full" style={{ backgroundColor: playlistColor }} />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className={`truncate text-sm font-medium ${index === currentIndex ? 'text-foreground' : ''}`}>
                                    {track.title}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <p className="truncate text-xs text-muted-foreground">{track.artist ?? 'Unknown artist'}</p>
                                    {track.tags.length > 0 && (
                                        <>
                                            <span className="text-muted-foreground/30">&middot;</span>
                                            {track.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="rounded-full bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-medium text-pink-600 dark:text-pink-400"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatDuration(track.duration_seconds)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Floating Player */}
            {currentTrack && (
                <div
                    className="fixed right-4 bottom-4 z-50 overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md"
                    style={{
                        borderColor: playlistColor + '60',
                        backgroundColor: 'rgba(255,255,255,0.92)',
                        width: minimized ? '280px' : '360px',
                    }}
                >
                    <div className="dark:bg-black/70">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-1">
                            <p className="truncate text-xs font-medium text-muted-foreground">{playlistName}</p>
                            <button
                                onClick={() => setMinimized(!minimized)}
                                className="text-muted-foreground/50 hover:text-foreground"
                            >
                                {minimized ? <Plus className="size-3.5" /> : <X className="size-3.5" />}
                            </button>
                        </div>

                        {/* Track Info */}
                        <div className="px-4 py-1">
                            <p className="truncate text-sm font-semibold">{currentTrack.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{currentTrack.artist ?? 'Unknown artist'}</p>
                        </div>

                        {!minimized && (
                            <>
                                {/* Progress Bar */}
                                <div className="px-4 pt-2">
                                    <div className="group cursor-pointer rounded-full bg-black/10 dark:bg-white/10" onClick={seek}>
                                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: playlistColor }} />
                                    </div>
                                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>

                                {/* Volume */}
                                <div className="flex items-center gap-2 px-4 pb-1">
                                    <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground">
                                        {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={isMuted ? 0 : volume}
                                        onChange={changeVolume}
                                        className="h-1 w-full accent-pink-500"
                                    />
                                </div>
                            </>
                        )}

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4 px-4 pb-3">
                            <button
                                onClick={skipPrev}
                                disabled={currentIndex === 0}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                                <SkipBack className="size-4" />
                            </button>
                            <button
                                onClick={togglePlay}
                                className="flex size-9 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
                                style={{ backgroundColor: playlistColor }}
                            >
                                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-[1px]" />}
                            </button>
                            <button
                                onClick={skipNext}
                                disabled={currentIndex === tracks.length - 1}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                                <SkipForward className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function PlaylistShow({ playlist, tracks, availableFiles, maxFileSize, suggestedTags, availableTags }: Props) {
    const [showAdd, setShowAdd] = useState(false);
    const [selectedFileId, setSelectedFileId] = useState('');
    const [editingTrack, setEditingTrack] = useState<Track | null>(null);
    const addForm = useForm({ music_file_id: '' });

    // Upload state
    const [isDragging, setIsDragging] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [rejectedFiles, setRejectedFiles] = useState<{ name: string; reason: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
    const [uploadTags, setUploadTags] = useState<string[]>([]);
    const [uploadTagInput, setUploadTagInput] = useState('');
    const [showUploadTagSuggestions, setShowUploadTagSuggestions] = useState(false);
    const dragCounter = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadTagInputRef = useRef<HTMLInputElement>(null);

    // Edit tag state
    const editForm = useForm({ title: '', artist: '', tags: [] as string[], redirect_to_playlist: 0 });
    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const tagInputRef = useRef<HTMLInputElement>(null);

    const allTagOptions = useMemo(() => {
        const combined = new Set([...suggestedTags, ...availableTags]);
        return Array.from(combined);
    }, [suggestedTags, availableTags]);

    // Edit tag helpers
    const filteredTagSuggestions = useMemo(() => {
        if (!tagInput && !showTagSuggestions) return [];
        const q = tagInput.toLowerCase();
        return allTagOptions.filter(
            (tag) => (!q || tag.toLowerCase().includes(q)) && !editForm.data.tags.includes(tag),
        );
    }, [allTagOptions, tagInput, showTagSuggestions, editForm.data.tags]);

    const addTag = useCallback(
        (tag: string) => {
            const trimmed = tag.trim();
            if (trimmed && !editForm.data.tags.includes(trimmed)) {
                editForm.setData('tags', [...editForm.data.tags, trimmed]);
            }
            setTagInput('');
            setShowTagSuggestions(false);
            tagInputRef.current?.focus();
        },
        [editForm],
    );

    const removeTag = useCallback(
        (tag: string) => {
            editForm.setData('tags', editForm.data.tags.filter((t) => t !== tag));
        },
        [editForm],
    );

    function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (tagInput.trim()) addTag(tagInput);
        }
        if (e.key === 'Backspace' && !tagInput && editForm.data.tags.length > 0) {
            removeTag(editForm.data.tags[editForm.data.tags.length - 1]);
        }
    }

    // Upload tag helpers
    const filteredUploadTagSuggestions = useMemo(() => {
        if (!uploadTagInput && !showUploadTagSuggestions) return [];
        const q = uploadTagInput.toLowerCase();
        return allTagOptions.filter(
            (tag) => (!q || tag.toLowerCase().includes(q)) && !uploadTags.includes(tag),
        );
    }, [allTagOptions, uploadTagInput, showUploadTagSuggestions, uploadTags]);

    const addUploadTag = useCallback(
        (tag: string) => {
            const trimmed = tag.trim();
            if (trimmed && !uploadTags.includes(trimmed)) {
                setUploadTags((prev) => [...prev, trimmed]);
            }
            setUploadTagInput('');
            setShowUploadTagSuggestions(false);
            uploadTagInputRef.current?.focus();
        },
        [uploadTags],
    );

    const removeUploadTag = useCallback((tag: string) => {
        setUploadTags((prev) => prev.filter((t) => t !== tag));
    }, []);

    function handleUploadTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (uploadTagInput.trim()) addUploadTag(uploadTagInput);
        }
        if (e.key === 'Backspace' && !uploadTagInput && uploadTags.length > 0) {
            removeUploadTag(uploadTags[uploadTags.length - 1]);
        }
    }

    // Upload file helpers
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
        setUploadErrors({});

        const formData = new FormData();
        pendingFiles.forEach((file) => formData.append('files[]', file));
        formData.append('playlist_id', String(playlist.id));
        uploadTags.forEach((tag) => formData.append('tags[]', tag));

        router.post('/music', formData, {
            forceFormData: true,
            onSuccess: () => {
                setPendingFiles([]);
                setRejectedFiles([]);
                setUploadErrors({});
                setUploadTags([]);
                setUploadTagInput('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onError: (errors) => setUploadErrors(errors),
            onFinish: () => setUploading(false),
        });
    }, [pendingFiles, uploading, playlist.id, uploadTags]);

    const totalPendingSize = useMemo(
        () => pendingFiles.reduce((sum, f) => sum + f.size, 0),
        [pendingFiles],
    );

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
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
            addFiles(Array.from(e.dataTransfer.files));
        },
        [addFiles],
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Music Player', href: '/music' },
        { title: playlist.name, href: `/playlists/${playlist.id}` },
    ];

    const handleAddTrack = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!selectedFileId) return;

            addForm.setData('music_file_id', selectedFileId);

            router.post(`/playlists/${playlist.id}/tracks`, { music_file_id: parseInt(selectedFileId) }, {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedFileId('');
                    setShowAdd(false);
                },
            });
        },
        [addForm, selectedFileId, playlist.id],
    );

    const handleRemoveTrack = useCallback(
        (trackId: number) => {
            if (!confirm('Remove this track from the playlist?')) return;
            router.delete(`/playlists/${playlist.id}/tracks/${trackId}`, { preserveScroll: true });
        },
        [playlist.id],
    );

    const handleEditTrack = useCallback(
        (track: Track) => {
            setEditingTrack(track);
            editForm.setData({
                title: track.title,
                artist: track.artist ?? '',
                tags: track.tags ?? [],
                redirect_to_playlist: playlist.id,
            });
            setTagInput('');
        },
        [editForm, playlist.id],
    );

    const submitEdit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!editingTrack) return;
            editForm.put(`/music/${editingTrack.id}`, {
                onSuccess: () => setEditingTrack(null),
            });
        },
        [editForm, editingTrack],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={playlist.name} />

            <div
                className="relative flex h-full flex-1 flex-col"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" asChild>
                            <a href="/music">
                                <ChevronLeft className="size-4" />
                                Back
                            </a>
                        </Button>
                        <div className="flex items-center gap-3">
                            <div
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                                style={{ backgroundColor: playlist.color + '25' }}
                            >
                                <ListMusic className="size-5" style={{ color: playlist.color }} />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold">{playlist.name}</h1>
                                {playlist.description && (
                                    <p className="text-sm text-muted-foreground">{playlist.description}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Upload Area */}
                    <div
                        className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
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
                            id="playlist-file-input"
                        />

                        <Upload className={`mx-auto mb-2 size-6 ${isDragging ? 'text-pink-500' : 'text-pink-400/50'}`} />
                        <p className={`text-sm font-medium ${isDragging ? 'text-pink-600 dark:text-pink-400' : 'text-muted-foreground'}`}>
                            {isDragging ? 'Drop audio files here' : 'Drag & drop files to upload to this playlist'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/75">
                            or{' '}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="font-medium text-pink-600 underline underline-offset-2 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
                            >
                                browse files
                            </button>
                            <span className="ml-1">- max {formatFileSize(maxFileSize)} per file</span>
                        </p>
                    </div>

                    {/* Rejected Files Warning */}
                    {rejectedFiles.length > 0 && (
                        <div className="rounded-xl border border-red-200/80 bg-red-50/70 p-4 dark:border-red-800/50 dark:bg-red-950/30">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                    {rejectedFiles.length} file{rejectedFiles.length !== 1 ? 's' : ''} rejected
                                </p>
                                <button onClick={() => setRejectedFiles([])} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
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
                        <div className="rounded-xl border bg-white/70 shadow-sm backdrop-blur-sm dark:bg-black/40" style={{ borderColor: playlist.color + '40' }}>
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-3">
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
                                            setUploadTags([]);
                                            setUploadTagInput('');
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

                            {/* Upload Tags */}
                            <div className="border-b border-border/50 px-5 py-3">
                                <Label className="mb-2 block text-xs text-muted-foreground">Tags for uploaded files</Label>
                                <div className="relative">
                                    <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring">
                                        {uploadTags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 px-2 py-0.5 text-xs font-medium text-pink-700 dark:text-pink-300"
                                            >
                                                {tag}
                                                <button type="button" onClick={() => removeUploadTag(tag)} className="rounded-full p-0.5 hover:bg-pink-500/20">
                                                    <X className="size-3" />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            ref={uploadTagInputRef}
                                            type="text"
                                            value={uploadTagInput}
                                            onChange={(e) => {
                                                setUploadTagInput(e.target.value);
                                                setShowUploadTagSuggestions(true);
                                            }}
                                            onFocus={() => setShowUploadTagSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowUploadTagSuggestions(false), 200)}
                                            onKeyDown={handleUploadTagKeyDown}
                                            placeholder={uploadTags.length === 0 ? 'Add tags (optional)...' : ''}
                                            className="min-w-[100px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                        />
                                    </div>
                                    {showUploadTagSuggestions && filteredUploadTagSuggestions.length > 0 && (
                                        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                                            {filteredUploadTagSuggestions.map((tag) => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        addUploadTag(tag);
                                                    }}
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                                                >
                                                    {suggestedTags.includes(tag) && (
                                                        <span className="rounded bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-medium text-pink-600 dark:text-pink-400">
                                                            suggested
                                                        </span>
                                                    )}
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="divide-y divide-border/50">
                                {pendingFiles.map((file, index) => (
                                    <div key={file.name + file.size} className="flex items-center gap-3 px-5 py-2">
                                        <Music className="size-4 shrink-0 text-pink-500/40" />
                                        <p className="min-w-0 flex-1 truncate text-sm">{file.name}</p>
                                        <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                                        <button onClick={() => removeFile(index)} className="rounded-md p-1 text-muted-foreground/50 hover:text-red-500">
                                            <X className="size-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upload Errors */}
                    {Object.keys(uploadErrors).length > 0 && (
                        <div className="rounded-xl border border-red-200/80 bg-red-50/70 p-4 dark:border-red-800/50 dark:bg-red-950/30">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">Upload failed</p>
                                <button onClick={() => setUploadErrors({})} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
                                    <X className="size-4" />
                                </button>
                            </div>
                            <ul className="mt-2 space-y-1">
                                {Object.entries(uploadErrors).map(([key, message]) => (
                                    <li key={key} className="text-xs text-red-600/80 dark:text-red-400/80">{message}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Add Track from library */}
                    <div className="flex items-center gap-3">
                        {showAdd ? (
                            <form onSubmit={handleAddTrack} className="flex flex-wrap items-end gap-3">
                                <div className="grid min-w-48 gap-2">
                                    <Label>Select track</Label>
                                    <Select value={selectedFileId} onValueChange={setSelectedFileId}>
                                        <SelectTrigger className="w-64">
                                            <SelectValue placeholder="Choose a track..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableFiles.length > 0 ? (
                                                availableFiles.map((file) => (
                                                    <SelectItem key={file.id} value={String(file.id)}>
                                                        <span className="flex items-center gap-2">
                                                            <Music className="size-3 text-pink-500/60" />
                                                            {file.title}
                                                            {file.artist && (
                                                                <span className="text-xs text-muted-foreground">- {file.artist}</span>
                                                            )}
                                                        </span>
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="_none" disabled>
                                                    No tracks available
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button type="submit" size="sm" disabled={!selectedFileId}>
                                    Add
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                                    Cancel
                                </Button>
                            </form>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
                                <Plus className="size-4" />
                                Add Track from Library
                            </Button>
                        )}
                    </div>

                    {/* Edit Track (inline) */}
                    {editingTrack && (
                        <div className="rounded-xl border bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:bg-black/40" style={{ borderColor: playlist.color + '40' }}>
                            <h3 className="mb-3 font-medium">Edit Track</h3>
                            <form onSubmit={submitEdit} className="space-y-4">
                                <div className="flex flex-wrap items-end gap-4">
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
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-tags">Tags</Label>
                                    <div className="relative">
                                        <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring">
                                            {editForm.data.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 px-2 py-0.5 text-xs font-medium text-pink-700 dark:text-pink-300"
                                                >
                                                    {tag}
                                                    <button type="button" onClick={() => removeTag(tag)} className="rounded-full p-0.5 hover:bg-pink-500/20">
                                                        <X className="size-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            <input
                                                ref={tagInputRef}
                                                type="text"
                                                value={tagInput}
                                                onChange={(e) => {
                                                    setTagInput(e.target.value);
                                                    setShowTagSuggestions(true);
                                                }}
                                                onFocus={() => setShowTagSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                                                onKeyDown={handleTagKeyDown}
                                                placeholder={editForm.data.tags.length === 0 ? 'Type and press Enter to add...' : ''}
                                                className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                                            />
                                        </div>
                                        {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                                            <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                                                {filteredTagSuggestions.map((tag) => (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            addTag(tag);
                                                        }}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                                                    >
                                                        {suggestedTags.includes(tag) && (
                                                            <span className="rounded bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-medium text-pink-600 dark:text-pink-400">
                                                                suggested
                                                            </span>
                                                        )}
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <InputError message={editForm.errors.tags} />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={editForm.processing}>
                                        {editForm.processing && <Spinner />}
                                        Save
                                    </Button>
                                    <Button variant="ghost" type="button" onClick={() => setEditingTrack(null)}>
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Tracks / Player */}
                    {tracks.length === 0 && pendingFiles.length === 0 ? (
                        <div className="rounded-xl border bg-white/70 p-8 text-center shadow-sm backdrop-blur-sm dark:bg-black/40" style={{ borderColor: playlist.color + '40' }}>
                            <Music className="mx-auto mb-2 size-8 text-pink-400/50" />
                            <p className="text-muted-foreground">No tracks in this playlist</p>
                            <p className="text-sm text-muted-foreground/75">Upload files or add tracks from your library to start listening.</p>
                        </div>
                    ) : tracks.length > 0 ? (
                        <div className="relative">
                            <Player tracks={tracks} playlistName={playlist.name} playlistColor={playlist.color} />

                            {/* Edit/Remove track buttons - overlaid */}
                            <div className="absolute top-0 right-0 divide-y divide-transparent">
                                {tracks.map((track) => (
                                    <div key={track.id} className="flex h-[52px] items-center gap-1 pr-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditTrack(track);
                                            }}
                                            className="rounded-md p-1 text-muted-foreground/30 hover:text-foreground"
                                        >
                                            <Pencil className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveTrack(track.id);
                                            }}
                                            className="rounded-md p-1 text-muted-foreground/30 hover:text-red-500"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </AppLayout>
    );
}
