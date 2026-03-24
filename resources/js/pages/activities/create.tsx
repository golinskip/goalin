import { Head, Link, useForm } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { index as activitiesIndex } from '@/routes/activities';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Activities', href: activitiesIndex() },
    { title: 'Create', href: '/activities/create' },
];

type GoalOption = {
    id: number;
    name: string;
    color: string;
};

type Props = {
    availableTags: string[];
    availableGoals: GoalOption[];
};

export default function ActivityCreate({ availableTags, availableGoals }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        point_cost: '',
        color: '#3a9a4e',
        needs_timer: false,
        duration_minutes: '',
        tags: [] as string[],
        goal_ids: [] as number[],
    });

    const [tagInput, setTagInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const tagInputRef = useRef<HTMLInputElement>(null);

    const filteredSuggestions = availableTags.filter(
        (tag) =>
            tag.toLowerCase().includes(tagInput.toLowerCase()) &&
            !data.tags.includes(tag),
    );

    const addTag = useCallback(
        (tag: string) => {
            const trimmed = tag.trim();
            if (trimmed && !data.tags.includes(trimmed)) {
                setData('tags', [...data.tags, trimmed]);
            }
            setTagInput('');
            setShowSuggestions(false);
            tagInputRef.current?.focus();
        },
        [data.tags, setData],
    );

    const removeTag = useCallback(
        (tag: string) => {
            setData(
                'tags',
                data.tags.filter((t) => t !== tag),
            );
        },
        [data.tags, setData],
    );

    function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (tagInput.trim()) {
                addTag(tagInput);
            }
        }
        if (e.key === 'Backspace' && !tagInput && data.tags.length > 0) {
            removeTag(data.tags[data.tags.length - 1]);
        }
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/activities');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Activity" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <h1 className="text-2xl font-semibold">Create Activity</h1>

                    <div className="rounded-xl border border-green-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Morning run"
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Details about this activity..."
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                />
                                <InputError message={errors.description} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="point_cost">Point Cost</Label>
                                    <Input
                                        id="point_cost"
                                        type="number"
                                        min="1"
                                        value={data.point_cost}
                                        onChange={(e) => setData('point_cost', e.target.value)}
                                        placeholder="10"
                                        required
                                    />
                                    <InputError message={errors.point_cost} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="color">Color</Label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="color"
                                            type="color"
                                            value={data.color}
                                            onChange={(e) => setData('color', e.target.value)}
                                            className="h-9 w-14 cursor-pointer rounded-md border border-input"
                                        />
                                        <Input
                                            value={data.color}
                                            onChange={(e) => setData('color', e.target.value)}
                                            placeholder="#3a9a4e"
                                            className="max-w-32"
                                        />
                                    </div>
                                    <InputError message={errors.color} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="tags">Tags</Label>
                                <div className="relative">
                                    <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring">
                                        {data.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(tag)}
                                                    className="rounded-full p-0.5 hover:bg-primary/20"
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            ref={tagInputRef}
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => {
                                                setTagInput(e.target.value);
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            onKeyDown={handleTagKeyDown}
                                            placeholder={data.tags.length === 0 ? 'Type and press Enter to add...' : ''}
                                            className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                                        />
                                    </div>
                                    {showSuggestions && filteredSuggestions.length > 0 && tagInput && (
                                        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                                            {filteredSuggestions.map((tag) => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        addTag(tag);
                                                    }}
                                                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Press Enter to add a tag. You can create new tags or reuse existing ones.
                                </p>
                                <InputError message={errors.tags} />
                            </div>

                            {availableGoals.length > 0 && (
                                <div className="grid gap-2">
                                    <Label>Goals this activity helps achieve</Label>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {availableGoals.map((goal) => (
                                            <label
                                                key={goal.id}
                                                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                                                    data.goal_ids.includes(goal.id)
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border/50 hover:border-border'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={data.goal_ids.includes(goal.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setData('goal_ids', [...data.goal_ids, goal.id]);
                                                        } else {
                                                            setData('goal_ids', data.goal_ids.filter((id) => id !== goal.id));
                                                        }
                                                    }}
                                                    className="size-4 rounded border-input"
                                                />
                                                <div
                                                    className="size-3 shrink-0 rounded-full"
                                                    style={{ backgroundColor: goal.color }}
                                                />
                                                <span className="text-sm font-medium">{goal.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <InputError message={errors.goal_ids} />
                                </div>
                            )}

                            <div className="space-y-4 rounded-lg border border-border/50 p-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        id="needs_timer"
                                        type="checkbox"
                                        checked={data.needs_timer}
                                        onChange={(e) => {
                                            setData('needs_timer', e.target.checked);
                                            if (!e.target.checked) {
                                                setData('duration_minutes', '');
                                            }
                                        }}
                                        className="size-4 rounded border-input"
                                    />
                                    <Label htmlFor="needs_timer" className="cursor-pointer">
                                        This activity needs a timer
                                    </Label>
                                </div>

                                {data.needs_timer && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                                        <Input
                                            id="duration_minutes"
                                            type="number"
                                            min="1"
                                            max="1440"
                                            value={data.duration_minutes}
                                            onChange={(e) => setData('duration_minutes', e.target.value)}
                                            placeholder="30"
                                            required
                                        />
                                        <InputError message={errors.duration_minutes} />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Create Activity
                                </Button>
                                <Button variant="ghost" asChild>
                                    <Link href={activitiesIndex()}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
