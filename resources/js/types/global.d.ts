import type { RingtoneId } from '@/lib/ringtones';
import type { Auth } from '@/types/auth';

export type AlertItem = {
    key: string;
    tool: string;
    message: string;
    href: string;
};

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'orange' | 'purple';

export type StickyNoteItem = {
    id: number;
    content: string;
    color: StickyNoteColor;
    is_important: boolean;
    is_applied: boolean;
    needs_review: boolean;
    reviewed_on: string;
    applied_at: string | null;
    created_at: string;
    revisions: { id: number; content: string; created_at: string }[];
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
            stickyNotes: StickyNoteItem[];
            [key: string]: unknown;
        };
    }
}
