import { usePage } from '@inertiajs/react';
import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';

export default function AppHeaderLayout({
    children,
    breadcrumbs,
}: AppLayoutProps) {
    const { env } = usePage().props;

    return (
        <AppShell variant="header">
            <div className="sticky top-0 z-50">
                {env === 'local' && (
                    <div className="bg-red-600 py-0.5 text-center text-xs font-medium text-white">
                        Local Environment
                    </div>
                )}
                <AppHeader breadcrumbs={breadcrumbs} />
            </div>
            <AppContent variant="header">{children}</AppContent>
        </AppShell>
    );
}
