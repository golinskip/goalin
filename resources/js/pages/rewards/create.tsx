import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { index as rewardsIndex } from '@/routes/rewards';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Rewards', href: rewardsIndex() },
    { title: 'Create', href: '/rewards/create' },
];

type Props = {
    currency: string;
    currencySymbol: string;
    multiplier: string;
};

export default function RewardCreate({ currencySymbol, multiplier }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        picture: null as File | null,
        cost_in_money: '',
        color: '#3a9a4e',
        shop_url: '',
        description: '',
    });

    const costInPoints = useMemo(() => {
        const money = parseFloat(data.cost_in_money);
        const mult = parseFloat(multiplier);
        if (isNaN(money) || isNaN(mult)) {
            return 0;
        }
        return Math.round(money * mult);
    }, [data.cost_in_money, multiplier]);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/rewards', {
            forceFormData: true,
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Reward" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    <h1 className="text-2xl font-semibold">Create Reward</h1>

                    <div className="rounded-xl border border-green-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. New headphones"
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="picture">Picture</Label>
                                <Input
                                    id="picture"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setData('picture', e.target.files?.[0] ?? null)}
                                />
                                <InputError message={errors.picture} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="cost_in_money">Cost ({currencySymbol})</Label>
                                    <Input
                                        id="cost_in_money"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={data.cost_in_money}
                                        onChange={(e) => setData('cost_in_money', e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                    <InputError message={errors.cost_in_money} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Cost in Points</Label>
                                    <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm font-medium">
                                        {costInPoints}
                                        <span className="ml-1 text-muted-foreground">pts</span>
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            x{multiplier}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="shop_url">Shop Link</Label>
                                <Input
                                    id="shop_url"
                                    type="url"
                                    value={data.shop_url}
                                    onChange={(e) => setData('shop_url', e.target.value)}
                                    placeholder="https://example.com/product"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Optional link to where you can buy this reward.
                                </p>
                                <InputError message={errors.shop_url} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Details about this prize..."
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
                                    Create Reward
                                </Button>
                                <Button variant="ghost" asChild>
                                    <Link href={rewardsIndex()}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
