import { Head, router, useForm } from '@inertiajs/react';
import { CalendarDays, ChevronLeft, ChevronRight, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { index as diaryIndex } from '@/routes/diary';
import { store, update, destroy } from '@/actions/Domain/Tools/Diary/Controllers/DiaryController';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Diary', href: diaryIndex() }];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DiaryEntry = {
    id: number;
    entry_date: string;
    content: string;
    updated_at: string;
};

type Props = {
    month: string;
    selectedDate: string | null;
    entryDates: string[];
    selectedEntry: DiaryEntry | null;
    totalEntries: number;
};

function getMonthLabel(month: string): string {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getCalendarGrid(month: string): (string | null)[][] {
    const [year, m] = month.split('-');
    const firstDay = new Date(parseInt(year), parseInt(m) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(m), 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const weeks: (string | null)[][] = [];
    let currentWeek: (string | null)[] = Array(startDow).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${m}-${String(day).padStart(2, '0')}`;
        currentWeek.push(dateStr);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
            currentWeek.push(null);
        }
        weeks.push(currentWeek);
    }

    return weeks;
}

function shiftMonth(month: string, delta: number): string {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function Diary({ month, selectedDate, entryDates, selectedEntry, totalEntries }: Props) {
    const today = new Date().toISOString().split('T')[0];
    const weeks = getCalendarGrid(month);
    const entryDateSet = new Set(entryDates);

    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const createForm = useForm({ entry_date: '', content: '' });
    const editForm = useForm({ content: selectedEntry?.content ?? '' });

    const navigateMonth = useCallback(
        (delta: number) => {
            const newMonth = shiftMonth(month, delta);
            router.get(
                diaryIndex.url({ query: { month: newMonth } }),
                {},
                { preserveState: true, preserveScroll: true },
            );
        },
        [month],
    );

    const selectDate = useCallback(
        (date: string) => {
            setIsEditing(false);
            setIsCreating(false);
            router.get(
                diaryIndex.url({ query: { month, date: date === selectedDate ? undefined : date } }),
                {},
                { preserveState: true, preserveScroll: true },
            );
        },
        [month, selectedDate],
    );

    const handleCreate = (date: string) => {
        setIsCreating(true);
        createForm.setData({ entry_date: date, content: '' });
    };

    const submitCreate = () => {
        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => setIsCreating(false),
        });
    };

    const handleEdit = () => {
        if (selectedEntry) {
            editForm.setData('content', selectedEntry.content);
            setIsEditing(true);
        }
    };

    const submitEdit = () => {
        if (!selectedEntry) return;
        editForm.put(update.url(selectedEntry.id), {
            preserveScroll: true,
            onSuccess: () => setIsEditing(false),
        });
    };

    const handleDelete = () => {
        if (!selectedEntry) return;
        if (!confirm('Are you sure you want to delete this diary entry?')) return;
        router.delete(destroy.url(selectedEntry.id), {
            preserveScroll: true,
        });
    };

    const selectedDateLabel = selectedDate
        ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
          })
        : null;

    const isFutureDate = selectedDate ? selectedDate > today : false;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Diary" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Calendar */}
                        <div className="rounded-xl border border-amber-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm lg:col-span-1 dark:border-amber-800/50 dark:bg-black/40">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-lg font-semibold">
                                    <CalendarDays className="size-5" />
                                    {getMonthLabel(month)}
                                </h2>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => navigateMonth(-1)}>
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => navigateMonth(1)}>
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {WEEKDAY_LABELS.map((label) => (
                                    <div key={label} className="py-1 text-center text-xs font-medium text-muted-foreground">
                                        {label}
                                    </div>
                                ))}

                                {weeks.flat().map((dateStr, i) => {
                                    if (!dateStr) {
                                        return <div key={`empty-${i}`} className="aspect-square" />;
                                    }

                                    const dayNum = parseInt(dateStr.split('-')[2]);
                                    const hasEntry = entryDateSet.has(dateStr);
                                    const isToday = dateStr === today;
                                    const isSelected = dateStr === selectedDate;

                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => selectDate(dateStr)}
                                            className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-all ${
                                                isSelected
                                                    ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                                                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                                            } ${isToday ? 'font-bold' : ''}`}
                                        >
                                            <span className={isToday ? 'text-primary' : ''}>{dayNum}</span>
                                            {hasEntry ? (
                                                <div className="mt-0.5 size-2 rounded-full bg-amber-500" />
                                            ) : dateStr <= today ? (
                                                <div className="mt-0.5 size-2 rounded-full bg-muted-foreground/20" />
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{totalEntries} entries total</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <div className="size-2.5 rounded-full bg-amber-500" />
                                        <span>Written</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="size-2.5 rounded-full bg-muted-foreground/20" />
                                        <span>Empty</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Entry Panel */}
                        <div className="rounded-xl border border-amber-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm lg:col-span-2 dark:border-amber-800/50 dark:bg-black/40">
                            {!selectedDate ? (
                                <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                                    <NotebookPen className="mb-3 size-12 text-muted-foreground/30" />
                                    <p className="text-lg font-medium text-muted-foreground">Select a day</p>
                                    <p className="mt-1 text-sm text-muted-foreground/70">
                                        Click on a date in the calendar to view or write a diary entry
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-lg font-semibold">{selectedDateLabel}</h2>
                                        {selectedEntry && !isEditing && (
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={handleEdit}>
                                                    <Pencil className="mr-1.5 size-3.5" />
                                                    Edit
                                                </Button>
                                                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                                                    <Trash2 className="mr-1.5 size-3.5" />
                                                    Delete
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {isFutureDate ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <CalendarDays className="mb-3 size-10 text-muted-foreground/30" />
                                            <p className="text-sm text-muted-foreground">
                                                This date is in the future. You can write about it when the day comes.
                                            </p>
                                        </div>
                                    ) : isCreating ? (
                                        <div className="space-y-3">
                                            <textarea
                                                className="min-h-[200px] w-full rounded-lg border border-border bg-white/50 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-black/20"
                                                placeholder="What happened today?"
                                                value={createForm.data.content}
                                                onChange={(e) => createForm.setData('content', e.target.value)}
                                            />
                                            {createForm.errors.content && (
                                                <p className="text-sm text-destructive">{createForm.errors.content}</p>
                                            )}
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={submitCreate} disabled={createForm.processing}>
                                                    Save
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : isEditing && selectedEntry ? (
                                        <div className="space-y-3">
                                            <textarea
                                                className="min-h-[200px] w-full rounded-lg border border-border bg-white/50 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-black/20"
                                                value={editForm.data.content}
                                                onChange={(e) => editForm.setData('content', e.target.value)}
                                            />
                                            {editForm.errors.content && (
                                                <p className="text-sm text-destructive">{editForm.errors.content}</p>
                                            )}
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={submitEdit} disabled={editForm.processing}>
                                                    Save
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : selectedEntry ? (
                                        <div>
                                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{selectedEntry.content}</div>
                                            <p className="mt-4 text-xs text-muted-foreground">
                                                Last updated: {new Date(selectedEntry.updated_at).toLocaleString()}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <NotebookPen className="mb-3 size-10 text-muted-foreground/30" />
                                            <p className="mb-3 text-sm text-muted-foreground">No entry for this day</p>
                                            <Button size="sm" onClick={() => handleCreate(selectedDate)}>
                                                <Plus className="mr-1.5 size-3.5" />
                                                Write Entry
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
