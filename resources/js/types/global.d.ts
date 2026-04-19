import type { Auth } from '@/types/auth';

export type AlertItem = {
    key: string;
    tool: string;
    message: string;
    href: string;
};

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            env: string;
            auth: Auth;
            sidebarOpen: boolean;
            background: string;
            alerts: AlertItem[];
            [key: string]: unknown;
        };
    }
}
