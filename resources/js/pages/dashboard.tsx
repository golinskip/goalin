import { Deferred, Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    Calendar,
    Compass,
    ExternalLink,
    Gamepad2,
    Layers,
    ListTodo,
    Music,
    NotebookPen,
    Repeat2,
    Rss,
    Target,
} from 'lucide-react';
import PageBackground from '@/components/page-background';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { edit as editExternalServices } from '@/routes/external-services';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    },
];

type TodoistTask = {
    id: string;
    content: string;
    description: string | null;
    url: string;
    due: string | null;
    priority: number;
    project_id: string | null;
};

type CalendarEvent = {
    id: string;
    summary: string;
    location: string | null;
    html_link: string;
    start: string;
    end: string | null;
    all_day: boolean;
};

type Props = {
    integrations: {
        todoist: {
            connected: boolean;
            tasks?: TodoistTask[];
        };
        googleCalendar: {
            connected: boolean;
            events?: CalendarEvent[];
        };
    };
};

function formatDueDate(dateStr: string | null): string {
    if (!dateStr) {
        return '';
    }

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
        return dateStr;
    }

    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function formatEventTime(event: CalendarEvent): string {
    const start = new Date(event.start);

    if (Number.isNaN(start.getTime())) {
        return event.start;
    }

    if (event.all_day) {
        return start.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    }

    return start.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function ListSkeleton() {
    return (
        <div className="space-y-2">
            {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-muted/60" />
            ))}
        </div>
    );
}

export default function Dashboard({ integrations }: Props) {
    const showIntegrations = integrations.todoist.connected || integrations.googleCalendar.connected;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="relative flex h-full flex-1 flex-col">
                <PageBackground />

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    {/* Tools */}
                    <div>
                        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                            <Layers className="size-5" />
                            Tools
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <Link
                                href="/goal-tracker"
                                className="group rounded-xl border border-green-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-green-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/15 transition-colors group-hover:bg-green-500/25">
                                        <Target className="size-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Goal Tracker</p>
                                        <p className="text-sm text-muted-foreground">Track activities and earn rewards</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                href="/memo-sets"
                                className="group rounded-xl border border-blue-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-blue-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/15 transition-colors group-hover:bg-blue-500/25">
                                        <BookOpen className="size-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Memo Cards</p>
                                        <p className="text-sm text-muted-foreground">Flashcards to learn and memorize</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                href="/diary"
                                className="group rounded-xl border border-amber-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-amber-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/15 transition-colors group-hover:bg-amber-500/25">
                                        <NotebookPen className="size-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Diary</p>
                                        <p className="text-sm text-muted-foreground">Write and reflect on your days</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                href="/daily-routine"
                                className="group rounded-xl border border-emerald-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-emerald-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/15 transition-colors group-hover:bg-emerald-500/25">
                                        <Repeat2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Daily Routine</p>
                                        <p className="text-sm text-muted-foreground">Track recurring tasks day-by-day</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                href="/long-term-goals"
                                className="group rounded-xl border border-violet-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-violet-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/15 transition-colors group-hover:bg-violet-500/25">
                                        <Compass className="size-5 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Long Term Goals</p>
                                        <p className="text-sm text-muted-foreground">Plan and review yearly & monthly goals</p>
                                    </div>
                                </div>
                            </Link>
                            <a
                                href="/music"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group rounded-xl border border-pink-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-pink-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-pink-500/15 transition-colors group-hover:bg-pink-500/25">
                                        <Music className="size-5 text-pink-600 dark:text-pink-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Music Player</p>
                                        <p className="text-sm text-muted-foreground">Upload and listen to your music</p>
                                    </div>
                                </div>
                            </a>
                            <Link
                                href="/rss-feeds"
                                className="group rounded-xl border border-orange-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-orange-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/15 transition-colors group-hover:bg-orange-500/25">
                                        <Rss className="size-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">RSS Feeds</p>
                                        <p className="text-sm text-muted-foreground">Subscribe and read news from RSS channels</p>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                href="/games"
                                className="group rounded-xl border border-red-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-red-800/50 dark:bg-black/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/15 transition-colors group-hover:bg-red-500/25">
                                        <Gamepad2 className="size-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Games</p>
                                        <p className="text-sm text-muted-foreground">Play games and test your skills</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {showIntegrations && (
                        <div className="grid gap-4 md:grid-cols-2">
                            {integrations.todoist.connected && (
                                <section className="rounded-xl border border-red-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-red-800/50 dark:bg-black/40">
                                    <div className="mb-4 flex items-center justify-between gap-2">
                                        <h3 className="flex items-center gap-2 text-base font-semibold">
                                            <ListTodo className="size-5 text-red-600 dark:text-red-400" />
                                            Todoist
                                        </h3>
                                        <a
                                            href="https://app.todoist.com/app/today"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            Open Todoist
                                            <ExternalLink className="size-3" />
                                        </a>
                                    </div>

                                    <Deferred data="integrations.todoist.tasks" fallback={<ListSkeleton />}>
                                        <TodoistList tasks={integrations.todoist.tasks ?? []} />
                                    </Deferred>
                                </section>
                            )}

                            {integrations.googleCalendar.connected && (
                                <section className="rounded-xl border border-blue-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-blue-800/50 dark:bg-black/40">
                                    <div className="mb-4 flex items-center justify-between gap-2">
                                        <h3 className="flex items-center gap-2 text-base font-semibold">
                                            <Calendar className="size-5 text-blue-600 dark:text-blue-400" />
                                            Google Calendar
                                        </h3>
                                        <a
                                            href="https://calendar.google.com/calendar/r"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            Open Calendar
                                            <ExternalLink className="size-3" />
                                        </a>
                                    </div>

                                    <Deferred data="integrations.googleCalendar.events" fallback={<ListSkeleton />}>
                                        <CalendarList events={integrations.googleCalendar.events ?? []} />
                                    </Deferred>
                                </section>
                            )}
                        </div>
                    )}

                    {!showIntegrations && (
                        <p className="text-sm text-muted-foreground">
                            Connect <Link href={editExternalServices()} className="underline">Todoist or Google Calendar</Link>{' '}
                            to see upcoming todos and events here.
                        </p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function TodoistList({ tasks }: { tasks: TodoistTask[] }) {
    if (tasks.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">No upcoming tasks. Enjoy the calm.</p>
        );
    }

    return (
        <ul className="space-y-2">
            {tasks.map((task) => (
                <li key={task.id}>
                    <a
                        href={task.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start justify-between gap-3 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/40"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{task.content}</p>
                            {task.description && (
                                <p className="truncate text-xs text-muted-foreground">{task.description}</p>
                            )}
                        </div>
                        {task.due && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {formatDueDate(task.due)}
                            </span>
                        )}
                    </a>
                </li>
            ))}
        </ul>
    );
}

function CalendarList({ events }: { events: CalendarEvent[] }) {
    if (events.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">Nothing on the calendar. You're free.</p>
        );
    }

    return (
        <ul className="space-y-2">
            {events.map((event) => (
                <li key={event.id}>
                    <a
                        href={event.html_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start justify-between gap-3 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/40"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{event.summary}</p>
                            {event.location && (
                                <p className="truncate text-xs text-muted-foreground">{event.location}</p>
                            )}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                            {formatEventTime(event)}
                        </span>
                    </a>
                </li>
            ))}
        </ul>
    );
}
