import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';

export default function AppHeaderLayout({
    children,
    breadcrumbs,
}: AppLayoutProps) {
    return (
        <AppShell variant="header">
            <div className="sticky top-0 z-50">
                <AppHeader breadcrumbs={breadcrumbs} />
            </div>
            <AppContent variant="header">{children}</AppContent>
        </AppShell>
    );
}
