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

type FieldTotal = {
    label: string;
    total: number;
    entries: number;
};

type Props = {
    year: number;
    fieldTotals: FieldTotal[];
};

function formatNumber(value: number): string {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export default function DiaryStatistics({ year, fieldTotals }: Props) {
    const navigateYear = (delta: number) => {
        router.get('/diary/statistics', { year: year + delta }, { preserveState: true });
    };

    const maxTotal = fieldTotals.reduce((max, field) => Math.max(max, field.total), 0);

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
                            {fieldTotals.length} numeric {fieldTotals.length === 1 ? 'field' : 'fields'}
                        </span>
                    </div>

                    {/* Chart */}
                    <div className="rounded-xl border border-amber-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-amber-800/50 dark:bg-black/40">
                        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
                            <BarChart3 className="size-5 text-amber-600 dark:text-amber-400" />
                            Field totals
                        </h2>
                        <p className="mb-5 text-sm text-muted-foreground">
                            Sum of every numeric additional field recorded across {year}.
                        </p>

                        {fieldTotals.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-muted-foreground">No numeric field values recorded for {year}</p>
                                <p className="mt-1 text-xs text-muted-foreground/70">
                                    Add additional fields with number values to your diary entries to see statistics here.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {fieldTotals.map((field) => {
                                    const percentage = maxTotal > 0 ? (field.total / maxTotal) * 100 : 0;

                                    return (
                                        <div key={field.label}>
                                            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                                                <span className="font-medium">{field.label}</span>
                                                <span className="tabular-nums">
                                                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                                                        {formatNumber(field.total)}
                                                    </span>
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        {field.entries} {field.entries === 1 ? 'entry' : 'entries'}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-300"
                                                    style={{ width: `${Math.max(percentage, 2)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
