import { Head, router, useForm } from '@inertiajs/react';
import { CalendarDays, ChevronLeft, ChevronRight, NotebookPen, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { index as diaryIndex } from '@/routes/diary';
import { store, update, destroy } from '@/actions/Domain/Tools/Diary/Controllers/DiaryController';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Diary', href: diaryIndex() }];

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type DiaryField = {
    label: string;
    value: string;
};

type DiaryEntry = {
    id: number;
    entry_date: string;
    content: string;
    fields: DiaryField[];
    updated_at: string;
};

type Props = {
    month: string;
    selectedDate: string | null;
    entryDates: string[];
    selectedEntry: DiaryEntry | null;
    totalEntries: number;
    fieldSuggestions: Record<string, string[]>;
};

function AutocompleteInput({
    value,
    onChange,
    suggestions,
    placeholder,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    suggestions: string[];
    placeholder?: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        if (!value) return suggestions;
        const lower = value.toLowerCase();
        return suggestions.filter((s) => s.toLowerCase().includes(lower) && s.toLowerCase() !== lower);
    }, [value, suggestions]);

    useEffect(() => {
        setActiveIndex(-1);
    }, [filtered]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || filtered.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            onChange(filtered[activeIndex]);
            setOpen(false);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={className}
            />
            {open && filtered.length > 0 && (
                <ul className="absolute top-full left-0 z-20 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-md">
                    {filtered.map((item, i) => (
                        <li
                            key={item}
                            className={`cursor-pointer rounded-md px-2.5 py-1.5 text-sm ${i === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
                            onMouseDown={() => {
                                onChange(item);
                                setOpen(false);
                            }}
                        >
                            {item}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function FieldsEditor({
    fields,
    onChange,
    fieldSuggestions,
}: {
    fields: DiaryField[];
    onChange: (fields: DiaryField[]) => void;
    fieldSuggestions: Record<string, string[]>;
}) {
    const labelSuggestions = useMemo(() => Object.keys(fieldSuggestions), [fieldSuggestions]);

    const updateField = (index: number, key: keyof DiaryField, value: string) => {
        const updated = fields.map((f, i) => (i === index ? { ...f, [key]: value } : f));
        onChange(updated);
    };

    const removeField = (index: number) => {
        onChange(fields.filter((_, i) => i !== index));
    };

    const addField = () => {
        onChange([...fields, { label: '', value: '' }]);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Additional fields</span>
                <button type="button" onClick={addField} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus className="size-3" />
                    Add field
                </button>
            </div>
            {fields.map((field, i) => (
                <div key={i} className="flex items-start gap-2">
                    <AutocompleteInput
                        value={field.label}
                        onChange={(v) => updateField(i, 'label', v)}
                        suggestions={labelSuggestions}
                        placeholder="Field name"
                        className="w-1/3 rounded-lg border border-border bg-white/50 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-black/20"
                    />
                    <AutocompleteInput
                        value={field.value}
                        onChange={(v) => updateField(i, 'value', v)}
                        suggestions={fieldSuggestions[field.label] ?? []}
                        placeholder="Value"
                        className="min-w-0 flex-1 rounded-lg border border-border bg-white/50 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-black/20"
                    />
                    <button type="button" onClick={() => removeField(i)} className="mt-1.5 text-muted-foreground hover:text-destructive">
                        <X className="size-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}

function getCalendarGrid(month: string): (string | null)[][] {
    const [year, m] = month.split('-');
    const firstDay = new Date(parseInt(year), parseInt(m) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(m), 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
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

export default function Diary({ month, selectedDate, entryDates, selectedEntry, totalEntries, fieldSuggestions }: Props) {
    const today = new Date().toISOString().split('T')[0];
    const weeks = getCalendarGrid(month);
    const entryDateSet = new Set(entryDates);

    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const createForm = useForm<{ entry_date: string; content: string; fields: DiaryField[] }>({ entry_date: '', content: '', fields: [] });
    const editForm = useForm<{ content: string; fields: DiaryField[] }>({ content: selectedEntry?.content ?? '', fields: selectedEntry?.fields ?? [] });

    const [currentYear, currentMonthNum] = useMemo(() => month.split('-').map(Number), [month]);
    const todayYear = new Date().getFullYear();
    const yearOptions = useMemo(() => {
        const years: number[] = [];
        for (let y = todayYear - 10; y <= todayYear + 1; y++) {
            years.push(y);
        }
        return years;
    }, [todayYear]);

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

    const navigateTo = useCallback(
        (newMonth: string) => {
            router.get(
                diaryIndex.url({ query: { month: newMonth } }),
                {},
                { preserveState: true, preserveScroll: true },
            );
        },
        [],
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
        createForm.setData({ entry_date: date, content: '', fields: [] });
    };

    const submitCreate = () => {
        createForm.transform((data) => ({
            ...data,
            fields: data.fields.filter((f) => f.label.trim() && f.value.trim()),
        }));
        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => setIsCreating(false),
        });
    };

    const handleEdit = () => {
        if (selectedEntry) {
            editForm.setData({ content: selectedEntry.content, fields: selectedEntry.fields ?? [] });
            setIsEditing(true);
        }
    };

    const submitEdit = () => {
        if (!selectedEntry) return;
        editForm.transform((data) => ({
            ...data,
            fields: data.fields.filter((f) => f.label.trim() && f.value.trim()),
        }));
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
                                <div className="flex items-center gap-1.5">
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => navigateMonth(-1)}>
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <Select
                                        value={String(currentMonthNum)}
                                        onValueChange={(v) => navigateTo(`${currentYear}-${v.padStart(2, '0')}`)}
                                    >
                                        <SelectTrigger className="h-8 w-[120px] text-sm font-semibold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MONTH_NAMES.map((name, i) => (
                                                <SelectItem key={i + 1} value={String(i + 1)}>
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={String(currentYear)}
                                        onValueChange={(v) => navigateTo(`${v}-${String(currentMonthNum).padStart(2, '0')}`)}
                                    >
                                        <SelectTrigger className="h-8 w-[80px] text-sm font-semibold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {yearOptions.map((y) => (
                                                <SelectItem key={y} value={String(y)}>
                                                    {y}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => navigateMonth(1)}>
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {
                                        const todayMonth = new Date().toISOString().slice(0, 7).replace('-0', '-').replace('-', '-');
                                        const m = String(new Date().getMonth() + 1).padStart(2, '0');
                                        navigateTo(`${new Date().getFullYear()}-${m}`);
                                    }}
                                >
                                    Today
                                </Button>
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {WEEKDAY_LABELS.map((label, i) => (
                                    <div key={label} className={`py-1 text-center text-xs font-medium ${i >= 5 ? 'text-red-400 dark:text-red-400/80' : 'text-muted-foreground'}`}>
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
                                    const dayOfWeek = new Date(parseInt(dateStr.split('-')[0]), parseInt(dateStr.split('-')[1]) - 1, dayNum).getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

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
                                            <span className={isToday ? 'text-primary' : isWeekend ? 'text-red-400 dark:text-red-400/80' : ''}>{dayNum}</span>
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
                                            <FieldsEditor
                                                fields={createForm.data.fields}
                                                onChange={(fields) => createForm.setData('fields', fields)}
                                                fieldSuggestions={fieldSuggestions}
                                            />
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
                                            <FieldsEditor
                                                fields={editForm.data.fields}
                                                onChange={(fields) => editForm.setData('fields', fields)}
                                                fieldSuggestions={fieldSuggestions}
                                            />
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
                                            {selectedEntry.fields && selectedEntry.fields.length > 0 && (
                                                <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                                                    {selectedEntry.fields.map((field, i) => (
                                                        <div key={i} className="flex gap-2 text-sm">
                                                            <span className="font-medium text-muted-foreground">{field.label}:</span>
                                                            <span>{field.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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
