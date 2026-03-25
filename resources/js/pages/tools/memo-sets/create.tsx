import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { randomColor } from '@/lib/utils';
import { index as memoSetsIndex } from '@/routes/memo-sets';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Memo Cards', href: memoSetsIndex() },
    { title: 'Create', href: '/memo-sets/create' },
];

export default function MemoSetCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        color: randomColor(),
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/memo-sets');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Memo Set" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <h1 className="text-2xl font-semibold">Create Memo Set</h1>

                    <div className="rounded-xl border border-blue-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-blue-800/50 dark:bg-black/40">
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder='e.g. "Spanish Vocabulary" or "Biology Terms"'
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
                                    placeholder="What are you learning?"
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                />
                                <InputError message={errors.description} />
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

                            <div className="flex items-center gap-3 pt-2">
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Create Set
                                </Button>
                                <Button variant="ghost" asChild>
                                    <Link href={memoSetsIndex()}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
