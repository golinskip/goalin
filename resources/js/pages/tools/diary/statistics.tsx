import { Head, router } from '@inertiajs/react';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import PageBackground from '@/components/page-background';
import AppLayout from '@/layouts/app-layout';
import { index as diaryIndex } from '@/routes/diary';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Diary', href: diaryIndex() },
    { title: 'Statistics', href: '/diary/statistics' },
];

type FieldValue = {
    value: string;
    count: number;
};

type FieldStat = {
    label: string;
    total: number;
    values: FieldValue[];
};

type Props = {
    year: number;
    fieldStats: FieldStat[];
};

export default function DiaryStatistics({ year, fieldStats }: Props) {
    const navigateYear = (delta: number) => {
        router.get('/diary/statistics', { year: year + delta }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Diary ${year} — Statistics`} />

            <div className="relative flex h-full flex-1 flex-col">
                <PageBackground />

                <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 lg:p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigateYear(-1)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                                <ChevronLeft className="size-5" />
                            </button>
                            <h2 className="text-2xl font-bold">{year}</h2>
                            <button onClick={() => navigateYear(1)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                                <ChevronRight className="size-5" />
                            </button>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {fieldStats.length} {fieldStats.length === 1 ? 'field' : 'fields'}
                        </span>
                    </div>

                    {fieldStats.length === 0 ? (
                        <div className="rounded-xl border border-amber-200/80 bg-white/70 p-12 text-center shadow-sm backdrop-blur-sm dark:border-amber-800/50 dark:bg-black/40">
                            <p className="text-muted-foreground">No additional fields recorded for {year}</p>
                            <p className="mt-1 text-xs text-muted-foreground/70">
                                Add additional fields to your diary entries to see how often each value comes up.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {fieldStats.map((field) => {
                                const maxCount = field.values.reduce((max, v) => Math.max(max, v.count), 0);

                                return (
                                    <div
                                        key={field.label}
                                        className="rounded-xl border border-amber-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-amber-800/50 dark:bg-black/40"
                                    >
                                        <h2 className="mb-4 flex items-center justify-between gap-2 text-lg font-semibold">
                                            <span className="flex items-center gap-2">
                                                <BarChart3 className="size-5 text-amber-600 dark:text-amber-400" />
                                                {field.label}
                                            </span>
                                            <span className="text-sm font-normal text-muted-foreground">
                                                {field.total} {field.total === 1 ? 'occurrence' : 'occurrences'}
                                            </span>
                                        </h2>

                                        <div className="space-y-3">
                                            {field.values.map((item) => {
                                                const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                                                return (
                                                    <div key={item.value}>
                                                        <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                                                            <span className="font-medium break-all">{item.value}</span>
                                                            <span className="tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                                                                {item.count}
                                                            </span>
                                                        </div>
                                                        <div className="h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-300"
                                                                style={{ width: `${Math.max(percentage, 3)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
