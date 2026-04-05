import { Head, Link } from '@inertiajs/react';
import { Brain, Crosshair, Gamepad2, Plus, Send, Volleyball as VolleyballIcon, Zap } from 'lucide-react';
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
    const additionBest = bestResults.addition;
    const volleyballBest = bestResults.volleyball;
    const serveBest = bestResults.serve;
    const aimBest = bestResults.aim_trainer;
    const memoryBest = bestResults.memory;

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

                    <Link
                        href="/games/addition"
                        className="group rounded-xl border border-indigo-200/80 bg-white/70 p-5 shadow-sm transition-all hover:shadow-md dark:border-indigo-800/50 dark:bg-black/40"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-500/15 transition-colors group-hover:bg-indigo-500/25">
                                <Plus className="size-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold">Addition Speed</p>
                                <p className="text-sm text-muted-foreground">Add two numbers as fast as you can</p>
                            </div>
                        </div>
                        {additionBest && (
                            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                                <span>Best: <strong className="text-foreground">{(additionBest.best_result / 1000).toFixed(2)}s</strong></span>
                                <span>Plays: <strong className="text-foreground">{additionBest.plays}</strong></span>
                            </div>
                        )}
                    </Link>

                    <Link
                        href="/games/volleyball"
                        className="group rounded-xl border border-orange-200/80 bg-white/70 p-5 shadow-sm transition-all hover:shadow-md dark:border-orange-800/50 dark:bg-black/40"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/15 transition-colors group-hover:bg-orange-500/25">
                                <VolleyballIcon className="size-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold">Volleyball Spike</p>
                                <p className="text-sm text-muted-foreground">Spike the ball close to the net on the other side</p>
                            </div>
                        </div>
                        {volleyballBest && (
                            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                                <span>Closest: <strong className="text-foreground">{volleyballBest.best_result.toFixed(0)}</strong></span>
                                <span>Plays: <strong className="text-foreground">{volleyballBest.plays}</strong></span>
                            </div>
                        )}
                    </Link>

                    <Link
                        href="/games/serve"
                        className="group rounded-xl border border-yellow-200/80 bg-white/70 p-5 shadow-sm transition-all hover:shadow-md dark:border-yellow-800/50 dark:bg-black/40"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-500/15 transition-colors group-hover:bg-yellow-500/25">
                                <Send className="size-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold">Volleyball Serve</p>
                                <p className="text-sm text-muted-foreground">Toss, run, jump, serve — four-step timing chain</p>
                            </div>
                        </div>
                        {serveBest && (
                            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                                <span>Longest: <strong className="text-foreground">{serveBest.best_result.toFixed(0)}</strong></span>
                                <span>Plays: <strong className="text-foreground">{serveBest.plays}</strong></span>
                            </div>
                        )}
                    </Link>

                    <Link
                        href="/games/aim-trainer"
                        className="group rounded-xl border border-rose-200/80 bg-white/70 p-5 shadow-sm transition-all hover:shadow-md dark:border-rose-800/50 dark:bg-black/40"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-rose-500/15 transition-colors group-hover:bg-rose-500/25">
                                <Crosshair className="size-5 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold">Aim Trainer</p>
                                <p className="text-sm text-muted-foreground">Click as many targets as you can in 30s</p>
                            </div>
                        </div>
                        {aimBest && (
                            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                                <span>Best: <strong className="text-foreground">{aimBest.best_result.toFixed(0)} hits</strong></span>
                                <span>Plays: <strong className="text-foreground">{aimBest.plays}</strong></span>
                            </div>
                        )}
                    </Link>

                    <Link
                        href="/games/memory"
                        className="group rounded-xl border border-purple-200/80 bg-white/70 p-5 shadow-sm transition-all hover:shadow-md dark:border-purple-800/50 dark:bg-black/40"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/15 transition-colors group-hover:bg-purple-500/25">
                                <Brain className="size-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold">Memory Sequence</p>
                                <p className="text-sm text-muted-foreground">Memorize 5 symbols, pick them from a 4×4 grid in order</p>
                            </div>
                        </div>
                        {memoryBest && (
                            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                                <span>Best: <strong className="text-foreground">{memoryBest.best_result.toFixed(0)} / 5</strong></span>
                                <span>Plays: <strong className="text-foreground">{memoryBest.plays}</strong></span>
                            </div>
                        )}
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
