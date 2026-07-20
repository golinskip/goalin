import { Deferred, Head, Link, usePage } from '@inertiajs/react';
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
import type { LucideIcon } from 'lucide-react';
import PageBackground from '@/components/page-background';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { edit as editExternalServices } from '@/routes/external-services';
import type { BreadcrumbItem } from '@/types';
import type { AlertItem } from '@/types/global';

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

type Tool = {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    external?: boolean;
    featured?: boolean;
    card: string;
    iconWrapper: string;
    iconColor: string;
};

const tools: Tool[] = [
    {
        title: 'Goal Tracker',
        description: 'Track activities and earn rewards',
        href: '/goal-tracker',
        icon: Target,
        featured: true,
        card: 'border-green-300 ring-1 ring-green-500/20 dark:border-green-700',
        iconWrapper: 'bg-green-500/15 group-hover:bg-green-500/25',
        iconColor: 'text-green-600 dark:text-green-400',
    },
    {
        title: 'Memo Cards',
        description: 'Flashcards to learn and memorize',
        href: '/memo-sets',
        icon: BookOpen,
        card: 'border-blue-200/80 dark:border-blue-800/50',
        iconWrapper: 'bg-blue-500/15 group-hover:bg-blue-500/25',
        iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
        title: 'Diary',
        description: 'Write and reflect on your days',
        href: '/diary',
        icon: NotebookPen,
        card: 'border-amber-200/80 dark:border-amber-800/50',
        iconWrapper: 'bg-amber-500/15 group-hover:bg-amber-500/25',
        iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
        title: 'Daily Routine',
        description: 'Track recurring tasks day-by-day',
        href: '/daily-routine',
        icon: Repeat2,
        card: 'border-emerald-200/80 dark:border-emerald-800/50',
        iconWrapper: 'bg-emerald-500/15 group-hover:bg-emerald-500/25',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        title: 'Daily Todo',
        description: 'Plan tasks and subtasks on a calendar',
        href: '/daily-todo',
        icon: ListTodo,
        card: 'border-indigo-200/80 dark:border-indigo-800/50',
        iconWrapper: 'bg-indigo-500/15 group-hover:bg-indigo-500/25',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
        title: 'Long Term Goals',
        description: 'Plan and review yearly & monthly goals',
        href: '/long-term-goals',
        icon: Compass,
        card: 'border-violet-200/80 dark:border-violet-800/50',
        iconWrapper: 'bg-violet-500/15 group-hover:bg-violet-500/25',
        iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
        title: 'Music Player',
        description: 'Upload and listen to your music',
        href: '/music',
        icon: Music,
        external: true,
        card: 'border-pink-200/80 dark:border-pink-800/50',
        iconWrapper: 'bg-pink-500/15 group-hover:bg-pink-500/25',
        iconColor: 'text-pink-600 dark:text-pink-400',
    },
    {
        title: 'RSS Feeds',
        description: 'Subscribe and read news from RSS channels',
        href: '/rss-feeds',
        icon: Rss,
        card: 'border-orange-200/80 dark:border-orange-800/50',
        iconWrapper: 'bg-orange-500/15 group-hover:bg-orange-500/25',
        iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
        title: 'Games',
        description: 'Play games and test your skills',
        href: '/games',
        icon: Gamepad2,
        card: 'border-red-200/80 dark:border-red-800/50',
        iconWrapper: 'bg-red-500/15 group-hover:bg-red-500/25',
        iconColor: 'text-red-600 dark:text-red-400',
    },
];

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

function ToolTile({ tool, alerts }: { tool: Tool; alerts: AlertItem[] }) {
    const Icon = tool.icon;
    const featured = tool.featured ?? false;
    const className = `group relative rounded-xl border bg-white/70 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:bg-black/40 ${featured ? 'p-6 shadow-md' : 'p-5'} ${tool.card}`;

    const content = (
        <>
            {alerts.length > 0 && (
                <span
                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-semibold text-white"
                    aria-hidden="true"
                >
                    {alerts.length > 9 ? '9+' : alerts.length}
                </span>
            )}
            <div className="flex items-center gap-3">
                <div
                    className={`flex items-center justify-center rounded-lg transition-colors ${featured ? 'size-14 rounded-xl' : 'size-10'} ${tool.iconWrapper}`}
                >
                    <Icon
                        className={`${featured ? 'size-7' : 'size-5'} ${tool.iconColor}`}
                    />
                </div>
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p
                            className={
                                featured
                                    ? 'text-xl font-semibold'
                                    : 'font-semibold'
                            }
                        >
                            {tool.title}
                        </p>
                        {featured && (
                            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium tracking-wide text-green-700 uppercase dark:text-green-400">
                                Main tool
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {tool.description}
                    </p>
                </div>
            </div>
            {alerts.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                    {alerts.map((alert) => (
                        <li key={alert.key} className="flex items-start gap-2">
                            <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-amber-500" />
                            <span className="text-xs leading-snug text-amber-700 dark:text-amber-400">
                                {alert.message}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );

    if (tool.external) {
        return (
            <a
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
            >
                {content}
            </a>
        );
    }

    return (
        <Link href={tool.href} className={className}>
            {content}
        </Link>
    );
}

function ListSkeleton() {
    return (
        <div className="space-y-2">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="h-12 animate-pulse rounded-md bg-muted/60"
                />
            ))}
        </div>
    );
}

export default function Dashboard({ integrations }: Props) {
    const { props } = usePage<{ alerts?: AlertItem[] }>();
    const alerts = props.alerts ?? [];
    const showIntegrations =
        integrations.todoist.connected || integrations.googleCalendar.connected;
    const featuredTools = tools.filter((tool) => tool.featured);
    const remainingTools = tools.filter((tool) => !tool.featured);
    const alertsFor = (tool: Tool) =>
        alerts.filter((alert) => alert.tool === tool.title);

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
                        <div className="grid gap-4">
                            {featuredTools.map((tool) => (
                                <ToolTile
                                    key={tool.title}
                                    tool={tool}
                                    alerts={alertsFor(tool)}
                                />
                            ))}
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {remainingTools.map((tool) => (
                                    <ToolTile
                                        key={tool.title}
                                        tool={tool}
                                        alerts={alertsFor(tool)}
                                    />
                                ))}
                            </div>
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

                                    <Deferred
                                        data="integrations.todoist.tasks"
                                        fallback={<ListSkeleton />}
                                    >
                                        <TodoistList
                                            tasks={
                                                integrations.todoist.tasks ?? []
                                            }
                                        />
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

                                    <Deferred
                                        data="integrations.googleCalendar.events"
                                        fallback={<ListSkeleton />}
                                    >
                                        <CalendarList
                                            events={
                                                integrations.googleCalendar
                                                    .events ?? []
                                            }
                                        />
                                    </Deferred>
                                </section>
                            )}
                        </div>
                    )}

                    {!showIntegrations && (
                        <p className="text-sm text-muted-foreground">
                            Connect{' '}
                            <Link
                                href={editExternalServices()}
                                className="underline"
                            >
                                Todoist or Google Calendar
                            </Link>{' '}
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
            <p className="text-sm text-muted-foreground">
                No upcoming tasks. Enjoy the calm.
            </p>
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
                            <p className="truncate text-sm font-medium">
                                {task.content}
                            </p>
                            {task.description && (
                                <p className="truncate text-xs text-muted-foreground">
                                    {task.description}
                                </p>
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
            <p className="text-sm text-muted-foreground">
                Nothing on the calendar. You're free.
            </p>
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
                            <p className="truncate text-sm font-medium">
                                {event.summary}
                            </p>
                            {event.location && (
                                <p className="truncate text-xs text-muted-foreground">
                                    {event.location}
                                </p>
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
