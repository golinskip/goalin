import { Link, usePage } from '@inertiajs/react';
import { StickyNote } from 'lucide-react';
import { StickyNoteCard, StickyNoteComposer } from '@/components/sticky-notes/sticky-note-card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { index as stickyNotesIndex } from '@/routes/sticky-notes';

export function StickyNotesMenu() {
    const notes = usePage().props.stickyNotes ?? [];
    const count = notes.length;
    const unreviewed = notes.filter((note) => note.needs_review).length;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-10 rounded-full"
                    aria-label={`Sticky notes${count > 0 ? ` (${count})` : ''}`}
                >
                    <StickyNote className="size-5" />
                    {count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-semibold text-slate-900">
                            {count > 9 ? '9+' : count}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-11/12 gap-0 sm:max-w-md">
                <SheetHeader className="border-b border-border/60 pr-12">
                    <SheetTitle className="flex items-center gap-2">
                        <StickyNote className="size-5 text-yellow-500" />
                        Sticky notes
                    </SheetTitle>
                    <SheetDescription>
                        {unreviewed > 0
                            ? `${unreviewed} not reviewed today — apply, edit or let them stay.`
                            : 'Jot it down now, apply it later.'}{' '}
                        <Link href={stickyNotesIndex()} className="font-medium text-foreground underline underline-offset-2">
                            Open all notes
                        </Link>
                    </SheetDescription>
                </SheetHeader>
                <div className="flex flex-1 flex-col gap-5 overflow-y-auto bg-muted/40 px-5 py-5">
                    <StickyNoteComposer />
                    {count === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">No open notes.</p>
                    ) : (
                        notes.map((note) => <StickyNoteCard key={note.id} note={note} tilt />)
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
