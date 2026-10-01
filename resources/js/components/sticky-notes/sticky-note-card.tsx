import { router, useForm } from '@inertiajs/react';
import { Check, CornerDownLeft, History, Pencil, Pin, Plus, RotateCcw, Star, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { KeyboardEvent, ReactNode, Ref } from 'react';
import {
    apply as applyNote,
    destroy as destroyNote,
    stay as stayNote,
    store as storeNote,
    update as updateNote,
} from '@/actions/Domain/Tools/StickyNotes/Controllers/StickyNoteController';
import { cn } from '@/lib/utils';
import type { StickyNoteColor, StickyNoteItem } from '@/types/global';

const NOTE_COLORS: Record<StickyNoteColor, { label: string; paper: string }> = {
    yellow: { label: 'Yellow', paper: 'bg-yellow-200' },
    pink: { label: 'Pink', paper: 'bg-pink-200' },
    blue: { label: 'Blue', paper: 'bg-sky-200' },
    green: { label: 'Green', paper: 'bg-lime-200' },
    orange: { label: 'Orange', paper: 'bg-orange-200' },
    purple: { label: 'Purple', paper: 'bg-violet-200' },
};

const paperStyles =
    'relative text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.2),0_14px_16px_-10px_rgba(0,0,0,0.5)] transition-transform';

const textareaStyles =
    'w-full resize-none rounded-sm border border-black/15 bg-white/40 p-2 text-sm text-slate-900 placeholder:text-slate-600/70 focus:border-black/40 focus:outline-none';

const actionStyles =
    'inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-black/10 hover:text-slate-950';

const visitOptions = { preserveScroll: true, preserveState: true };

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/**
 * Splits note text on URLs; with a single capture group the URLs land on odd indexes.
 */
function linkify(text: string): ReactNode[] {
    return text.split(URL_PATTERN).map((part, index) =>
        index % 2 === 1 ? (
            <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-800 underline underline-offset-2 hover:text-blue-950"
            >
                {part}
            </a>
        ) : (
            part
        ),
    );
}

function ColorSwatches({ value, onChange }: { value: StickyNoteColor; onChange: (color: StickyNoteColor) => void }) {
    return (
        <div className="flex items-center gap-1.5">
            {(Object.keys(NOTE_COLORS) as StickyNoteColor[]).map((color) => (
                <button
                    key={color}
                    type="button"
                    onClick={() => onChange(color)}
                    className={cn(
                        'size-5 rounded-full border border-black/25 transition-transform hover:scale-110',
                        NOTE_COLORS[color].paper,
                        value === color && 'ring-2 ring-slate-900 ring-offset-1 ring-offset-transparent',
                    )}
                    title={NOTE_COLORS[color].label}
                    aria-label={`${NOTE_COLORS[color].label} note`}
                    aria-pressed={value === color}
                />
            ))}
        </div>
    );
}

function submitOnModEnter(event: KeyboardEvent<HTMLTextAreaElement>, submit: () => void): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        submit();
    }
}

const ENTER_ADDS_STORAGE_KEY = 'sticky-notes.enter-adds';

function readEnterAdds(): boolean {
    try {
        return localStorage.getItem(ENTER_ADDS_STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

export function StickyNoteComposer({ className, textareaRef }: { className?: string; textareaRef?: Ref<HTMLTextAreaElement> }) {
    const [enterAdds, setEnterAdds] = useState(readEnterAdds);
    const form = useForm<{ content: string; color: StickyNoteColor; is_important: boolean }>({
        content: '',
        color: 'yellow',
        is_important: false,
    });

    const submit = () => {
        if (form.data.content.trim() === '' || form.processing) {
            return;
        }

        form.post(storeNote.url(), { ...visitOptions, onSuccess: () => form.reset() });
    };

    const toggleEnterAdds = () => {
        const next = !enterAdds;

        setEnterAdds(next);

        try {
            localStorage.setItem(ENTER_ADDS_STORAGE_KEY, String(next));
        } catch {
            return;
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
            return;
        }

        if (event.metaKey || event.ctrlKey || (enterAdds && !event.shiftKey)) {
            event.preventDefault();
            submit();
        }
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
            className={cn(paperStyles, NOTE_COLORS[form.data.color].paper, 'space-y-2 p-3', className)}
        >
            <textarea
                ref={textareaRef}
                value={form.data.content}
                onChange={(event) => form.setData('content', event.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                maxLength={2000}
                placeholder="Quick note…"
                aria-label="New sticky note"
                className={textareaStyles}
            />
            {form.errors.content && <p className="text-xs font-medium text-red-700">{form.errors.content}</p>}
            <div className="flex items-center justify-between gap-2">
                <ColorSwatches value={form.data.color} onChange={(color) => form.setData('color', color)} />
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => form.setData('is_important', !form.data.is_important)}
                        className={actionStyles}
                        aria-pressed={form.data.is_important}
                        title="Mark as important"
                    >
                        <Star className={cn('size-4', form.data.is_important && 'fill-red-500 text-red-600')} />
                    </button>
                    <button
                        type="button"
                        onClick={toggleEnterAdds}
                        className={cn(actionStyles, enterAdds && 'bg-black/15 text-slate-950')}
                        aria-pressed={enterAdds}
                        aria-label="Enter adds the note"
                        title={
                            enterAdds
                                ? 'Enter adds the note, Shift+Enter starts a new line. Click to make Enter start a new line.'
                                : 'Enter starts a new line, Ctrl+Enter adds the note. Click to make Enter add the note.'
                        }
                    >
                        <CornerDownLeft className="size-4" />
                    </button>
                    <button
                        type="submit"
                        disabled={form.processing || form.data.content.trim() === ''}
                        className="inline-flex items-center gap-1 rounded-sm bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white transition-opacity hover:bg-slate-800 disabled:opacity-40"
                    >
                        <Plus className="size-3.5" />
                        Add
                    </button>
                </div>
            </div>
        </form>
    );
}

export function StickyNoteCard({ note, tilt = false }: { note: StickyNoteItem; tilt?: boolean }) {
    const [editing, setEditing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [content, setContent] = useState(note.content);
    const [color, setColor] = useState<StickyNoteColor>(note.color);
    const [error, setError] = useState<string | null>(null);

    const startEditing = () => {
        setContent(note.content);
        setColor(note.color);
        setError(null);
        setEditing(true);
    };

    const save = () => {
        router.put(
            updateNote.url(note.id),
            { content, color },
            {
                ...visitOptions,
                onSuccess: () => setEditing(false),
                onError: (errors) => setError(errors.content ?? errors.color ?? null),
            },
        );
    };

    const remove = () => {
        if (!confirm('Remove this sticky note?')) {
            return;
        }

        router.delete(destroyNote.url(note.id), visitOptions);
    };

    return (
        <article
            className={cn(
                paperStyles,
                NOTE_COLORS[editing ? color : note.color].paper,
                'flex flex-col gap-2 p-3 pt-4',
                tilt && !editing && 'odd:-rotate-1 even:rotate-1 hover:rotate-0',
                note.is_applied && 'opacity-75',
            )}
        >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-2.5 bg-black/5" />

            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-700">
                    <span>{formatDate(note.created_at)}</span>
                    {note.is_applied && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-700 px-1.5 py-0.5 text-white">
                            <Check className="size-3" />
                            Applied
                        </span>
                    )}
                    {note.needs_review && (
                        <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-white">Not reviewed today</span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => router.put(updateNote.url(note.id), { is_important: !note.is_important }, visitOptions)}
                    className="-m-1 shrink-0 rounded-sm p-1 text-slate-600 hover:bg-black/10"
                    aria-pressed={note.is_important}
                    title={note.is_important ? 'Unmark as important' : 'Mark as important'}
                >
                    <Star className={cn('size-4', note.is_important && 'fill-red-500 text-red-600')} />
                </button>
            </div>

            {editing ? (
                <div className="space-y-2">
                    <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        onKeyDown={(event) => submitOnModEnter(event, save)}
                        rows={4}
                        maxLength={2000}
                        autoFocus
                        aria-label="Sticky note text"
                        className={textareaStyles}
                    />
                    {error && <p className="text-xs font-medium text-red-700">{error}</p>}
                    <div className="flex items-center justify-between gap-2">
                        <ColorSwatches value={color} onChange={setColor} />
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setEditing(false)} className={actionStyles}>
                                <X className="size-3.5" />
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={save}
                                disabled={content.trim() === ''}
                                className="inline-flex items-center gap-1 rounded-sm bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <p className={cn('text-sm leading-snug break-words whitespace-pre-wrap', note.is_applied && 'line-through decoration-slate-500/60')}>
                    {linkify(note.content)}
                </p>
            )}

            {!editing && (
                <div className="-mx-1.5 -mb-1 flex flex-wrap items-center gap-x-0.5 border-t border-black/10 pt-1.5">
                    <button type="button" onClick={() => router.post(applyNote.url(note.id), {}, visitOptions)} className={actionStyles}>
                        {note.is_applied ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
                        {note.is_applied ? 'Reopen' : 'Applied'}
                    </button>
                    {note.needs_review && (
                        <button
                            type="button"
                            onClick={() => router.post(stayNote.url(note.id), {}, visitOptions)}
                            className={actionStyles}
                            title="Keep this note as it is for today"
                        >
                            <Pin className="size-3.5" />
                            Stay
                        </button>
                    )}
                    <button type="button" onClick={startEditing} className={actionStyles}>
                        <Pencil className="size-3.5" />
                        Edit
                    </button>
                    {note.revisions.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowHistory((shown) => !shown)}
                            className={actionStyles}
                            aria-expanded={showHistory}
                        >
                            <History className="size-3.5" />
                            History ({note.revisions.length})
                        </button>
                    )}
                    <button type="button" onClick={remove} className={cn(actionStyles, 'ml-auto hover:text-red-700')} aria-label="Remove note">
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            )}

            {!editing && showHistory && note.revisions.length > 0 && (
                <ol className="space-y-1.5 border-t border-dashed border-black/20 pt-2">
                    {note.revisions.map((revision) => (
                        <li key={revision.id} className="text-xs">
                            <p className="font-medium text-slate-600">Until {formatDate(revision.created_at)}</p>
                            <p className="break-words whitespace-pre-wrap text-slate-800">{linkify(revision.content)}</p>
                        </li>
                    ))}
                </ol>
            )}
        </article>
    );
}
