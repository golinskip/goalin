import { Head, Link } from '@inertiajs/react';
import { BookOpen, Compass, Gamepad2, Layers, Music, NotebookPen, Target } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    {/* Tools */}
                    <div>
                        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                            <Layers className="size-5" />
                            Tools
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <Link
                                href="/goal-tracker"
                                className="group rounded-xl border border-green-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-green-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/15 transition-colors group-hover:bg-green-500/25">
                                        <Target className="size-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Goal Tracker</p>
                                        <p className="text-sm text-muted-foreground">Track activities and earn rewards</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                href="/memo-sets"
                                className="group rounded-xl border border-blue-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-blue-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/15 transition-colors group-hover:bg-blue-500/25">
                                        <BookOpen className="size-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Memo Cards</p>
                                        <p className="text-sm text-muted-foreground">Flashcards to learn and memorize</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                href="/diary"
                                className="group rounded-xl border border-amber-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-amber-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/15 transition-colors group-hover:bg-amber-500/25">
                                        <NotebookPen className="size-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Diary</p>
                                        <p className="text-sm text-muted-foreground">Write and reflect on your days</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                href="/long-term-goals"
                                className="group rounded-xl border border-violet-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-violet-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/15 transition-colors group-hover:bg-violet-500/25">
                                        <Compass className="size-5 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Long Term Goals</p>
                                        <p className="text-sm text-muted-foreground">Plan and review yearly & monthly goals</p>
                                    </div>
                                </div>
                            </Link>
                            <a
                                href="/music"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group rounded-xl border border-pink-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-pink-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-pink-500/15 transition-colors group-hover:bg-pink-500/25">
                                        <Music className="size-5 text-pink-600 dark:text-pink-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Music Player</p>
                                        <p className="text-sm text-muted-foreground">Upload and listen to your music</p>
                                    </div>
                                </div>
                            </a>
                            <Link
                                href="/games"
                                className="group rounded-xl border border-red-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-red-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/15 transition-colors group-hover:bg-red-500/25">
                                        <Gamepad2 className="size-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Games</p>
                                        <p className="text-sm text-muted-foreground">Play games and test your skills</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
