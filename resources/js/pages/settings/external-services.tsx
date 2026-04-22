import { Form, Head, Link } from '@inertiajs/react';
import { Calendar, CheckCircle2, ListTodo } from 'lucide-react';
import GoogleCalendarConnectionController from '@/actions/Domain/ExternalServices/Controllers/GoogleCalendarConnectionController';
import TodoistConnectionController from '@/actions/Domain/ExternalServices/Controllers/TodoistConnectionController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/external-services';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'External services',
        href: edit(),
    },
];

type Props = {
    todoist: {
        connected: boolean;
        connected_at: string | null;
    };
    googleCalendar: {
        connected: boolean;
        connected_at: string | null;
        configured: boolean;
    };
};

export default function ExternalServices({ todoist, googleCalendar }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="External services" />

            <h1 className="sr-only">External services</h1>

            <SettingsLayout>
                <div className="space-y-10">
                    <section className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
                                <ListTodo className="size-5 text-red-600 dark:text-red-400" />
                            </div>
                            <Heading
                                variant="small"
                                title="Todoist"
                                description="Connect your Todoist account to see upcoming tasks on the dashboard."
                            />
                        </div>

                        {todoist.connected ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 rounded-md border border-emerald-200/60 bg-emerald-50/60 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-emerald-900 dark:text-emerald-100">
                                        Connected {todoist.connected_at && `· ${todoist.connected_at}`}
                                    </span>
                                </div>

                                <Form
                                    {...TodoistConnectionController.destroy.form()}
                                    options={{ preserveScroll: true }}
                                >
                                    {({ processing }) => (
                                        <Button type="submit" variant="outline" size="sm" disabled={processing}>
                                            Disconnect
                                        </Button>
                                    )}
                                </Form>
                            </div>
                        ) : (
                            <Form
                                {...TodoistConnectionController.store.form()}
                                options={{ preserveScroll: true }}
                                resetOnSuccess
                                className="space-y-4"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="api_token">API token</Label>
                                            <Input
                                                id="api_token"
                                                name="api_token"
                                                type="password"
                                                autoComplete="off"
                                                placeholder="Paste your Todoist API token"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Find your token in Todoist under{' '}
                                                <a
                                                    href="https://app.todoist.com/app/settings/integrations/developer"
                                                    target="_blank"
                                                    rel="noreferrer noopener"
                                                    className="underline"
                                                >
                                                    Settings → Integrations → Developer
                                                </a>
                                                .
                                            </p>
                                            <InputError message={errors.api_token} />
                                        </div>

                                        <Button type="submit" disabled={processing}>
                                            Connect Todoist
                                        </Button>
                                    </>
                                )}
                            </Form>
                        )}
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                                <Calendar className="size-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <Heading
                                variant="small"
                                title="Google Calendar"
                                description="Connect your Google account to see upcoming calendar events on the dashboard."
                            />
                        </div>

                        {!googleCalendar.configured && (
                            <p className="rounded-md border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                                Google OAuth is not configured on the server. Set{' '}
                                <code className="font-mono">GOOGLE_CLIENT_ID</code>,{' '}
                                <code className="font-mono">GOOGLE_CLIENT_SECRET</code>, and{' '}
                                <code className="font-mono">GOOGLE_REDIRECT_URI</code> in your environment.
                            </p>
                        )}

                        {googleCalendar.connected ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 rounded-md border border-emerald-200/60 bg-emerald-50/60 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-emerald-900 dark:text-emerald-100">
                                        Connected {googleCalendar.connected_at && `· ${googleCalendar.connected_at}`}
                                    </span>
                                </div>

                                <Form
                                    {...GoogleCalendarConnectionController.destroy.form()}
                                    options={{ preserveScroll: true }}
                                >
                                    {({ processing }) => (
                                        <Button type="submit" variant="outline" size="sm" disabled={processing}>
                                            Disconnect
                                        </Button>
                                    )}
                                </Form>
                            </div>
                        ) : (
                            <Button asChild disabled={!googleCalendar.configured}>
                                <Link
                                    href={GoogleCalendarConnectionController.redirect.url()}
                                    aria-disabled={!googleCalendar.configured}
                                >
                                    Connect Google Calendar
                                </Link>
                            </Button>
                        )}
                    </section>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
