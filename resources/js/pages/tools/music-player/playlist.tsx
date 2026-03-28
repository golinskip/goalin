import { Head, router, useForm } from '@inertiajs/react';
import {
    ChevronLeft,
    ListMusic,
    Music,
    Pause,
    Play,
    Plus,
    SkipBack,
    SkipForward,
    Trash2,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
                                <p className="truncate text-xs text-muted-foreground">{track.artist ?? 'Unknown artist'}</p>
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

export default function PlaylistShow({ playlist, tracks, availableFiles }: Props) {
    const [showAdd, setShowAdd] = useState(false);
    const [selectedFileId, setSelectedFileId] = useState('');
    const addForm = useForm({ music_file_id: '' });

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={playlist.name} />

            <div className="relative flex h-full flex-1 flex-col">
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

                    {/* Add Track */}
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
                                Add Track
                            </Button>
                        )}
                    </div>

                    {/* Tracks / Player */}
                    {tracks.length === 0 ? (
                        <div className="rounded-xl border bg-white/70 p-8 text-center shadow-sm backdrop-blur-sm dark:bg-black/40" style={{ borderColor: playlist.color + '40' }}>
                            <Music className="mx-auto mb-2 size-8 text-pink-400/50" />
                            <p className="text-muted-foreground">No tracks in this playlist</p>
                            <p className="text-sm text-muted-foreground/75">Add tracks from your library to start listening.</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <Player tracks={tracks} playlistName={playlist.name} playlistColor={playlist.color} />

                            {/* Remove track buttons - overlaid */}
                            <div className="absolute top-0 right-0 divide-y divide-transparent">
                                {tracks.map((track) => (
                                    <div key={track.id} className="flex h-[52px] items-center pr-3">
                                        <button
                                            onClick={() => handleRemoveTrack(track.id)}
                                            className="rounded-md p-1 text-muted-foreground/30 hover:text-red-500"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
