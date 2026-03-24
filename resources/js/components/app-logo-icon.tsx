import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            {/* Checkmark in background */}
            <path
                d="M16 34 L26 44 L48 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.15"
            />
            {/* Flower petals */}
            <ellipse cx="32" cy="16" rx="7" ry="11" fill="currentColor" opacity="0.25" />
            <ellipse cx="32" cy="48" rx="7" ry="11" fill="currentColor" opacity="0.25" />
            <ellipse cx="16" cy="32" rx="11" ry="7" fill="currentColor" opacity="0.25" />
            <ellipse cx="48" cy="32" rx="11" ry="7" fill="currentColor" opacity="0.25" />
            <ellipse cx="20.7" cy="20.7" rx="7" ry="11" transform="rotate(45 20.7 20.7)" fill="currentColor" opacity="0.2" />
            <ellipse cx="43.3" cy="43.3" rx="7" ry="11" transform="rotate(45 43.3 43.3)" fill="currentColor" opacity="0.2" />
            <ellipse cx="43.3" cy="20.7" rx="7" ry="11" transform="rotate(-45 43.3 20.7)" fill="currentColor" opacity="0.2" />
            <ellipse cx="20.7" cy="43.3" rx="7" ry="11" transform="rotate(-45 20.7 43.3)" fill="currentColor" opacity="0.2" />
            {/* Timer circle */}
            <circle cx="32" cy="32" r="14" fill="currentColor" opacity="0.9" />
            <circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            {/* Timer tick marks */}
            <line x1="32" y1="20" x2="32" y2="23" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="32" y1="41" x2="32" y2="44" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="20" y1="32" x2="23" y2="32" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="41" y1="32" x2="44" y2="32" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            {/* Timer hands */}
            <line x1="32" y1="32" x2="32" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="32" x2="38" y2="29" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            {/* Timer center dot */}
            <circle cx="32" cy="32" r="1.5" fill="white" />
            {/* Timer button on top */}
            <rect x="30" y="15" width="4" height="3" rx="1" fill="currentColor" opacity="0.9" />
        </svg>
    );
}
