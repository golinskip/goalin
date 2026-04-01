import { useState } from 'react';
import { Label } from '@/components/ui/label';

const PRESET_COLORS = {
    regular: [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
        '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#78716c',
    ],
    material: [
        '#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#009688',
        '#2196f3', '#3f51b5', '#9c27b0', '#e91e63', '#795548',
    ],
    pastel: [
        '#fca5a5', '#fdba74', '#fde047', '#86efac', '#5eead4',
        '#93c5fd', '#a5b4fc', '#c4b5fd', '#f9a8d4', '#d6d3d1',
    ],
};

type ColorPickerProps = {
    id: string;
    value: string;
    onChange: (color: string) => void;
    label?: string;
};

export function ColorPicker({ id, value, onChange, label }: ColorPickerProps) {
    const [variant, setVariant] = useState<'regular' | 'material' | 'pastel'>('regular');

    return (
        <div className="grid gap-2">
            {label && <Label htmlFor={id}>{label}</Label>}
            <div className="flex items-center gap-2">
                <input
                    id={id}
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded-md border border-input"
                />
                <div className="flex gap-0.5 rounded-md border border-input bg-background p-0.5 text-[10px] font-medium">
                    {(['regular', 'material', 'pastel'] as const).map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setVariant(v)}
                            className={`rounded px-1.5 py-0.5 capitalize transition-colors ${variant === v ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex flex-wrap gap-1">
                {PRESET_COLORS[variant].map((color) => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onChange(color)}
                        className={`size-6 rounded-md border-2 transition-transform hover:scale-110 ${value === color ? 'border-foreground ring-1 ring-foreground/20' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        title={color}
                    />
                ))}
            </div>
        </div>
    );
}
