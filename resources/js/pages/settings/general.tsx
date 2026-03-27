import { Transition } from '@headlessui/react';
import { Form, Head } from '@inertiajs/react';
import GeneralController from '@/actions/Domain/User/Controllers/GeneralController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/general';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'General settings',
        href: edit(),
    },
];

type CurrencyOption = {
    value: string;
    label: string;
    symbol: string;
};

type Props = {
    setting: {
        currency: string;
        multiplier: string;
    };
    currencies: CurrencyOption[];
};

export default function General({ setting, currencies }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="General settings" />

            <h1 className="sr-only">General settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Currency & Points"
                        description="Configure your currency and the multiplier used to convert money to points"
                    />

                    <Form
                        {...GeneralController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        className="space-y-6"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <select
                                        id="currency"
                                        name="currency"
                                        defaultValue={setting.currency}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                    >
                                        {currencies.map((c) => (
                                            <option key={c.value} value={c.value}>
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.currency} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="multiplier">Points Multiplier</Label>
                                    <Input
                                        id="multiplier"
                                        name="multiplier"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        defaultValue={setting.multiplier}
                                        placeholder="1.00"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Points = Cost in money x Multiplier. Changing this will recalculate all reward points.
                                    </p>
                                    <InputError message={errors.multiplier} />
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button disabled={processing}>Save</Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-neutral-600">Saved</p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
