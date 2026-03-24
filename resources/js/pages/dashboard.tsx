import { Head } from '@inertiajs/react';
import { Target, Trophy, Gift, TrendingUp } from 'lucide-react';
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
                {/* Background */}
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img
                        src="/img/background.png"
                        alt=""
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                {/* Content */}
                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    {/* Stats Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-green-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/15">
                                    <Target className="size-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Active Goals</p>
                                    <p className="text-2xl font-semibold">0</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-yellow-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-yellow-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-500/15">
                                    <Trophy className="size-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                    <p className="text-2xl font-semibold">0</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-blue-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-blue-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/15">
                                    <Gift className="size-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Rewards Earned</p>
                                    <p className="text-2xl font-semibold">0</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-green-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/15">
                                    <TrendingUp className="size-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Current Streak</p>
                                    <p className="text-2xl font-semibold">0 days</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="grid flex-1 gap-4 lg:grid-cols-3">
                        {/* Goals Section */}
                        <div className="rounded-xl border border-green-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm lg:col-span-2 dark:border-green-800/50 dark:bg-black/40">
                            <h2 className="mb-4 text-lg font-semibold text-green-800 dark:text-green-300">Your Goals</h2>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Target className="mb-3 size-12 text-green-400/50 dark:text-green-600/50" />
                                <p className="text-muted-foreground">No goals yet</p>
                                <p className="mt-1 text-sm text-muted-foreground/75">
                                    Start by creating your first goal and set a reward for completing it.
                                </p>
                            </div>
                        </div>

                        {/* Rewards Section */}
                        <div className="rounded-xl border border-yellow-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-yellow-800/50 dark:bg-black/40">
                            <h2 className="mb-4 text-lg font-semibold text-yellow-700 dark:text-yellow-300">Upcoming Rewards</h2>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Gift className="mb-3 size-12 text-yellow-400/50 dark:text-yellow-600/50" />
                                <p className="text-muted-foreground">No rewards yet</p>
                                <p className="mt-1 text-sm text-muted-foreground/75">
                                    Rewards will appear here once you create goals with prizes.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
