import { Head, Link, router, useForm } from '@inertiajs/react';
import { BookOpen, Check, Download, Pencil, Play, Plus, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { index as memoSetsIndex } from '@/routes/memo-sets';
import type { BreadcrumbItem } from '@/types';

type Card = {
    id: number;
    front: string;
    back: string;
    correct_count: number;
    incorrect_count: number;
};

type MemoSetData = {
    id: number;
    name: string;
    description: string | null;
    color: string;
};

type Props = {
    memoSet: MemoSetData;
    cards: Card[];
};

export default function MemoSetShow({ memoSet, cards }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Memo Cards', href: memoSetsIndex() },
        { title: memoSet.name, href: `/memo-sets/${memoSet.id}` },
    ];

    const [editingCard, setEditingCard] = useState<number | null>(null);
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addForm = useForm({ front: '', back: '' });
    const editForm = useForm({ front: '', back: '' });
    const importForm = useForm<{ csv_file: File | null; csv_text: string }>({ csv_file: null, csv_text: '' });

    function submitAdd(e: React.FormEvent) {
        e.preventDefault();
        addForm.post(`/memo-sets/${memoSet.id}/cards`, {
            onSuccess: () => addForm.reset(),
            preserveScroll: true,
        });
    }

    function startEdit(card: Card) {
        setEditingCard(card.id);
        editForm.setData({ front: card.front, back: card.back });
    }

    function submitEdit(e: React.FormEvent, cardId: number) {
        e.preventDefault();
        editForm.put(`/memo-cards/${cardId}`, {
            onSuccess: () => setEditingCard(null),
            preserveScroll: true,
        });
    }

    const handleDelete = useCallback((id: number) => {
        if (!confirm('Delete this card?')) return;
        router.delete(`/memo-cards/${id}`, { preserveScroll: true });
    }, []);

    function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        importForm.setData('csv_file', file);
        importForm.post(`/memo-sets/${memoSet.id}/import`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowImport(false);
                importForm.reset();
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    }

    function handleImportText(e: React.FormEvent) {
        e.preventDefault();
        importForm.setData('csv_text', importText);
    }

    function submitImportText() {
        importForm.transform(() => ({ csv_file: null, csv_text: importText }));
        importForm.post(`/memo-sets/${memoSet.id}/import`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowImport(false);
                setImportText('');
                importForm.reset();
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={memoSet.name} />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className="flex size-10 items-center justify-center rounded-lg"
                                style={{ backgroundColor: memoSet.color + '20' }}
                            >
                                <BookOpen className="size-5" style={{ color: memoSet.color }} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold">{memoSet.name}</h1>
                                {memoSet.description && (
                                    <p className="text-sm text-muted-foreground">{memoSet.description}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowImport(!showImport)}
                            >
                                <Upload className="mr-1.5 size-3.5" />
                                Import
                            </Button>
                            {cards.length > 0 && (
                                <>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={`/memo-sets/${memoSet.id}/export`}>
                                            <Download className="mr-1.5 size-3.5" />
                                            Export
                                        </a>
                                    </Button>
                                    <Button asChild>
                                        <Link href={`/memo-sets/${memoSet.id}/learn`}>
                                            <Play className="mr-2 size-4" />
                                            Learn
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Import Panel */}
                    {showImport && (
                        <div className="rounded-xl border border-amber-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-amber-800/50 dark:bg-black/40">
                            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                                <Upload className="size-4" />
                                Import Cards
                            </h2>
                            <p className="mb-3 text-xs text-muted-foreground">
                                CSV format: <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">front;back</code> per line. Header row is optional.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs">Upload CSV file</Label>
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.txt"
                                        onChange={handleImportFile}
                                        className="mt-1"
                                    />
                                    <InputError message={importForm.errors.csv_file} />
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="text-xs text-muted-foreground">or paste text</span>
                                    <div className="h-px flex-1 bg-border" />
                                </div>

                                <div>
                                    <textarea
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                        placeholder={'front;back\nHola;Hello\nGracias;Thank you'}
                                        rows={5}
                                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                    />
                                    <InputError message={importForm.errors.csv_text} />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={submitImportText}
                                        disabled={importForm.processing || !importText.trim()}
                                        size="sm"
                                    >
                                        {importForm.processing ? <Spinner /> : <Upload className="mr-1.5 size-3.5" />}
                                        Import Text
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowImport(false);
                                            setImportText('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add Card Form */}
                    <div className="rounded-xl border border-blue-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-blue-800/50 dark:bg-black/40">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <Plus className="size-4" />
                            Add Card
                        </h2>
                        <form onSubmit={submitAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <Label htmlFor="front" className="text-xs">Front</Label>
                                <Input
                                    id="front"
                                    value={addForm.data.front}
                                    onChange={(e) => addForm.setData('front', e.target.value)}
                                    placeholder="Question or term..."
                                    required
                                />
                                <InputError message={addForm.errors.front} />
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="back" className="text-xs">Back</Label>
                                <Input
                                    id="back"
                                    value={addForm.data.back}
                                    onChange={(e) => addForm.setData('back', e.target.value)}
                                    placeholder="Answer or definition..."
                                    required
                                />
                                <InputError message={addForm.errors.back} />
                            </div>
                            <Button type="submit" disabled={addForm.processing} className="shrink-0">
                                {addForm.processing ? <Spinner /> : <Plus className="mr-1 size-4" />}
                                Add
                            </Button>
                        </form>
                    </div>

                    {/* Cards List */}
                    {cards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-white/70 py-16 text-center shadow-sm backdrop-blur-sm dark:bg-black/40">
                            <BookOpen className="mb-3 size-10 text-muted-foreground/30" />
                            <p className="text-muted-foreground">No cards yet</p>
                            <p className="mt-1 text-sm text-muted-foreground/75">Add your first card above to start building this set.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {cards.map((card) => (
                                <div
                                    key={card.id}
                                    className="rounded-xl border border-border/50 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:bg-black/40"
                                >
                                    {editingCard === card.id ? (
                                        <form onSubmit={(e) => submitEdit(e, card.id)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                            <div className="flex-1">
                                                <Label className="text-xs">Front</Label>
                                                <Input
                                                    value={editForm.data.front}
                                                    onChange={(e) => editForm.setData('front', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Label className="text-xs">Back</Label>
                                                <Input
                                                    value={editForm.data.back}
                                                    onChange={(e) => editForm.setData('back', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="flex gap-1">
                                                <Button type="submit" size="icon" className="size-8" disabled={editForm.processing}>
                                                    <Check className="size-3.5" />
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setEditingCard(null)}>
                                                    <X className="size-3.5" />
                                                </Button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2 sm:gap-4">
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">Front</p>
                                                    <p className="text-sm">{card.front}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">Back</p>
                                                    <p className="text-sm">{card.back}</p>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    <span className="text-green-600">{card.correct_count}</span>
                                                    {' / '}
                                                    <span className="text-red-500">{card.incorrect_count}</span>
                                                </span>
                                                <Button variant="ghost" size="icon" className="size-8" onClick={() => startEdit(card)}>
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(card.id)}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
