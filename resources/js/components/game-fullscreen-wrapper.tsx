import { Maximize, Minimize } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
    children: (isFullscreen: boolean) => ReactNode;
};

export function GameFullscreenWrapper({ children }: Props) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!wrapperRef.current) return;
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void wrapperRef.current.requestFullscreen();
        }
    };

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    return (
        <div
            ref={wrapperRef}
            className={`relative ${isFullscreen ? 'flex h-screen w-screen items-center justify-center bg-black' : ''}`}
        >
            <button
                type="button"
                onClick={toggleFullscreen}
                className="absolute right-2 top-2 z-10 rounded-md bg-black/50 p-1.5 text-white hover:bg-black/70"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
                {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </button>
            {children(isFullscreen)}
        </div>
    );
}
