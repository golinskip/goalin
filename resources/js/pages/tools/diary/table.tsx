import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { index as diaryIndex } from '@/routes/diary';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Diary', href: diaryIndex() },
    { title: 'Table View', href: '/diary/table' },
];

type DiaryField = {
    label: string;
    value: string;
};

type DiaryEntry = {
    id: number;
    entry_date: string;
    content: string;
    fields: DiaryField[];
};

type Props = {
    year: number;
    entries: DiaryEntry[];
};

function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    return `${weekday}, ${month} ${day}`;
}

export default function DiaryTable({ year, entries }: Props) {
    const navigateYear = (delta: number) => {
        router.get('/diary/table', { year: year + delta }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Diary ${year} — Table`} />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:p-6">
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
                        <span className="text-sm text-muted-foreground">{entries.length} entries</span>
                    </div>

                    {/* Table */}
                    {entries.length === 0 ? (
                        <div className="rounded-xl border border-amber-200/80 bg-white/70 p-12 text-center shadow-sm backdrop-blur-sm dark:border-amber-800/50 dark:bg-black/40">
                            <p className="text-muted-foreground">No diary entries for {year}</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-amber-200/80 bg-white/70 shadow-sm backdrop-blur-sm dark:border-amber-800/50 dark:bg-black/40">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/50 bg-muted/30">
                                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Date</th>
                                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">What happened</th>
                                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Additional</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {entries.map((entry) => (
                                        <tr
                                            key={entry.id}
                                            className="transition-colors hover:bg-black/[.02] dark:hover:bg-white/[.02]"
                                        >
                                            <td className="px-4 py-2.5 align-top whitespace-nowrap">
                                                <Link
                                                    href={diaryIndex.url({ query: { month: entry.entry_date.slice(0, 7), date: entry.entry_date } })}
                                                    className="font-medium text-amber-700 hover:underline dark:text-amber-400"
                                                >
                                                    {formatDate(entry.entry_date)}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2.5 align-top">
                                                <p className="whitespace-pre-line">{entry.content}</p>
                                            </td>
                                            <td className="px-4 py-2.5 align-top">
                                                {entry.fields.length > 0 ? (
                                                    <div className="space-y-0.5">
                                                        {entry.fields.map((field, i) => (
                                                            <div key={i} className="text-xs">
                                                                <span className="font-medium text-muted-foreground">{field.label}:</span>{' '}
                                                                <span>{field.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground/40">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
