import { usePage } from '@inertiajs/react';

export default function PageBackground() {
    const { background } = usePage().props;

    return (
        <div className="pointer-events-none fixed inset-0 z-0">
            <img src={background} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
        </div>
    );
}
