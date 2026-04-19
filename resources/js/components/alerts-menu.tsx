import { Link, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AlertItem } from '@/types/global';

export function AlertsMenu() {
    const { props } = usePage<{ alerts?: AlertItem[] }>();
    const alerts = props.alerts ?? [];
    const count = alerts.length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-10 rounded-full"
                    aria-label={`Alerts${count > 0 ? ` (${count})` : ''}`}
                >
                    <Bell className="size-5" />
                    {count > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-semibold text-white">
                            {count > 9 ? '9+' : count}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                    <p className="text-sm font-semibold">Alerts</p>
                    {count > 0 && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                            {count}
                        </span>
                    )}
                </div>
                {count === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        You're all caught up.
                    </div>
                ) : (
                    <div className="max-h-96 divide-y divide-border/50 overflow-y-auto">
                        {alerts.map((alert) => (
                            <Link
                                key={alert.key}
                                href={alert.href}
                                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                            >
                                <span className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-amber-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm leading-snug">{alert.message}</p>
                                    <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                        {alert.tool}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
