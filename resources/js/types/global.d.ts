import type { RingtoneId } from '@/lib/ringtones';
import type { Auth } from '@/types/auth';

export type AlertItem = {
    key: string;
    tool: string;
    message: string;
    href: string;
};

export type RingtoneSelection = {
    task: RingtoneId;
    break: RingtoneId;
};

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            env: string;
            auth: Auth;
            sidebarOpen: boolean;
            background: string;
            ringtones: RingtoneSelection;
            alerts: AlertItem[];
            [key: string]: unknown;
        };
    }
}
