import { Head, router } from '@inertiajs/react';
import { Info, Lock, LockOpen, Shield, ShieldCheck } from 'lucide-react';
import Heading from '@/components/heading';
import PageBackground from '@/components/page-background';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type AdminUser = {
    id: number;
    name: string;
    email: string;
    is_super_admin: boolean;
    is_locked: boolean;
    locked_at: string | null;
    created_at: string | null;
};

type Props = {
    users: AdminUser[];
    registrationEnabled: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Super Admin',
        href: '/admin',
    },
];

export default function AdminIndex({ users, registrationEnabled }: Props) {
    const toggleRegistration = () => {
        router.patch(
            '/admin/registration',
            { enabled: !registrationEnabled },
            { preserveScroll: true },
        );
    };

    const lockUser = (user: AdminUser) => {
        if (!confirm(`Lock account for ${user.email}? The user will be signed out immediately.`)) {
            return;
        }
        router.post(`/admin/users/${user.id}/lock`, {}, { preserveScroll: true });
    };

    const unlockUser = (user: AdminUser) => {
        router.delete(`/admin/users/${user.id}/lock`, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Super Admin" />

            <div className="relative flex h-full flex-1 flex-col">
                <PageBackground />

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <Heading
                        title="Super Admin"
                        description="Manage users and platform-wide settings"
                    />

                    <section className="rounded-xl border border-indigo-200/80 bg-indigo-50/60 p-5 dark:border-indigo-800/50 dark:bg-indigo-950/30">
                        <div className="flex items-start gap-3">
                            <Info className="mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                            <div className="space-y-2 text-sm text-indigo-900 dark:text-indigo-100">
                                <p className="font-semibold">About super admin permission</p>
                                <ul className="list-disc space-y-1 pl-5 text-indigo-900/90 dark:text-indigo-100/90">
                                    <li>Super admin is disabled for every account by default.</li>
                                    <li>
                                        Grant or revoke access only from the command line with{' '}
                                        <code className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs dark:bg-indigo-900">
                                            php artisan super-admin:assign {'{email}'}
                                        </code>{' '}
                                        or{' '}
                                        <code className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs dark:bg-indigo-900">
                                            super-admin:revoke
                                        </code>
                                        .
                                    </li>
                                    <li>
                                        When the feature was installed, the first user in the database was automatically promoted to super admin.
                                    </li>
                                    <li>Super admin accounts cannot be locked from the panel.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border/60 bg-background/70 p-5 shadow-sm backdrop-blur-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-semibold">New user registration</h2>
                                <p className="text-sm text-muted-foreground">
                                    {registrationEnabled
                                        ? 'Anyone can currently register a new account.'
                                        : 'Registration is disabled — only existing users can sign in.'}
                                </p>
                            </div>
                            <Button
                                variant={registrationEnabled ? 'destructive' : 'default'}
                                onClick={toggleRegistration}
                            >
                                {registrationEnabled ? 'Disable registration' : 'Enable registration'}
                            </Button>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border/60 bg-background/70 shadow-sm backdrop-blur-sm">
                        <div className="border-b border-border/60 px-5 py-3">
                            <h2 className="flex items-center gap-2 text-base font-semibold">
                                <Shield className="size-4" />
                                Users
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    {users.length}
                                </span>
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-5 py-3 text-left font-medium">User</th>
                                        <th className="px-5 py-3 text-left font-medium">Role</th>
                                        <th className="px-5 py-3 text-left font-medium">Status</th>
                                        <th className="px-5 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td className="px-5 py-3">
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                            </td>
                                            <td className="px-5 py-3">
                                                {user.is_super_admin ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                                        <ShieldCheck className="size-3" />
                                                        Super admin
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">User</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {user.is_locked ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                                                        <Lock className="size-3" />
                                                        Locked
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                {user.is_super_admin ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        Managed via CLI
                                                    </span>
                                                ) : user.is_locked ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => unlockUser(user)}
                                                    >
                                                        <LockOpen className="mr-1 size-3.5" />
                                                        Unlock
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => lockUser(user)}
                                                    >
                                                        <Lock className="mr-1 size-3.5" />
                                                        Lock
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
