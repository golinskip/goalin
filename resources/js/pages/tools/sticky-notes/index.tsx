import { Head, usePage } from '@inertiajs/react';
import { CheckCheck, StickyNote } from 'lucide-react';
import PageBackground from '@/components/page-background';
import { StickyNoteCard, StickyNoteComposer } from '@/components/sticky-notes/sticky-note-card';
import AppLayout from '@/layouts/app-layout';
import { index as stickyNotesIndex } from '@/routes/sticky-notes';
import type { BreadcrumbItem } from '@/types';
import type { StickyNoteItem } from '@/types/global';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sticky Notes', href: stickyNotesIndex() }];

const gridStyles = 'grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

export default function StickyNotesIndex({ appliedNotes }: { appliedNotes: StickyNoteItem[] }) {
    const openNotes = usePage().props.stickyNotes ?? [];
    const unreviewed = openNotes.filter((note) => note.needs_review).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sticky Notes" />

            <div className="relative flex h-full flex-1 flex-col">
                <PageBackground />

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 p-4 lg:p-6">
                    <section>
                        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
                            <StickyNote className="size-5 text-yellow-500" />
                            Open notes
                            <span className="text-sm font-normal text-muted-foreground">· {openNotes.length}</span>
                        </h2>
                        <p className="mb-4 text-sm text-muted-foreground">
                            {unreviewed > 0
                                ? `${unreviewed} not reviewed today — apply, edit or let them stay.`
                                : 'Everything here has been looked at today.'}
                        </p>
                        <div className={gridStyles}>
                            <StickyNoteComposer />
                            {openNotes.map((note) => (
                                <StickyNoteCard key={note.id} note={note} tilt />
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <CheckCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                            Applied
                            <span className="text-sm font-normal text-muted-foreground">· {appliedNotes.length}</span>
                        </h2>
                        {appliedNotes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Notes you mark as applied are kept here.</p>
                        ) : (
                            <div className={gridStyles}>
                                {appliedNotes.map((note) => (
                                    <StickyNoteCard key={note.id} note={note} />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
