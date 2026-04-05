import { Head, Link } from '@inertiajs/react';
import { Gamepad2, Zap } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Games', href: '/games' }];

type BestResult = {
    best_result: number;
    plays: number;
};

type Props = {
    bestResults: Record<string, BestResult>;
};

export default function GamesIndex({ bestResults }: Props) {
    const reflexBest = bestResults.reflex;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Games" />

            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold">
                        <Gamepad2 className="size-6" />
                        Games
                    </h1>
                    <p className="text-sm text-muted-foreground">Play games and track your results.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Link
                        href="/games/reflex"
                        className="group rounded-xl border border-red-200/80 bg-white/70 p-5 shadow-sm transition-all hover:shadow-md dark:border-red-800/50 dark:bg-black/40"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/15 transition-colors group-hover:bg-red-500/25">
                                <Zap className="size-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold">Reflex Test</p>
                                <p className="text-sm text-muted-foreground">Click when green turns red — measure your reaction time</p>
                            </div>
                        </div>
                        {reflexBest && (
                            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                                <span>Best: <strong className="text-foreground">{reflexBest.best_result.toFixed(0)} ms</strong></span>
                                <span>Plays: <strong className="text-foreground">{reflexBest.plays}</strong></span>
                            </div>
                        )}
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
