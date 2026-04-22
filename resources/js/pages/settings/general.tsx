import { Transition } from '@headlessui/react';
import { Form, Head } from '@inertiajs/react';
import { Check, Play } from 'lucide-react';
import { useState } from 'react';
import GeneralController from '@/actions/Domain/User/Controllers/GeneralController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { playRingtone  } from '@/lib/ringtones';
import type {RingtoneId} from '@/lib/ringtones';
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

type RingtoneOption = {
    value: RingtoneId;
    label: string;
    description: string;
};

type Props = {
    setting: {
        currency: string;
        multiplier: string;
        background: string | null;
        task_ringtone: RingtoneId;
        break_ringtone: RingtoneId;
    };
    currencies: CurrencyOption[];
    backgrounds: string[];
    ringtones: RingtoneOption[];
};

export default function General({ setting, currencies, backgrounds, ringtones }: Props) {
    const [taskRingtone, setTaskRingtone] = useState<RingtoneId>(setting.task_ringtone);
    const [breakRingtone, setBreakRingtone] = useState<RingtoneId>(setting.break_ringtone);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="General settings" />

            <h1 className="sr-only">General settings</h1>

            <SettingsLayout>
                <div className="space-y-10">
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

                    <div className="space-y-6">
                        <Heading
                            variant="small"
                            title="Timer Ringtones"
                            description="Pick the sound that plays when your activity and break timers finish"
                        />

                        <Form
                            {...GeneralController.update.form()}
                            options={{ preserveScroll: true }}
                            className="space-y-6"
                        >
                            {({ processing, recentlySuccessful, errors }) => (
                                <>
                                    <input type="hidden" name="currency" value={setting.currency} />
                                    <input type="hidden" name="multiplier" value={setting.multiplier} />
                                    {setting.background !== null && (
                                        <input type="hidden" name="background" value={setting.background} />
                                    )}

                                    <RingtonePicker
                                        name="task_ringtone"
                                        label="Task timer"
                                        description="Plays when an activity timer reaches zero."
                                        value={taskRingtone}
                                        onChange={setTaskRingtone}
                                        options={ringtones}
                                        error={errors.task_ringtone}
                                    />

                                    <RingtonePicker
                                        name="break_ringtone"
                                        label="Break timer"
                                        description="Plays when a break ends on the Goal Tracker page."
                                        value={breakRingtone}
                                        onChange={setBreakRingtone}
                                        options={ringtones}
                                        error={errors.break_ringtone}
                                    />

                                    <div className="flex items-center gap-4">
                                        <Button disabled={processing}>Save ringtones</Button>

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

                    <div className="space-y-6">
                        <Heading
                            variant="small"
                            title="Background"
                            description="Choose a background image for your app"
                        />

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            {backgrounds.map((bg) => {
                                const isActive = setting.background === bg || (!setting.background && bg === backgrounds[0]);

                                return (
                                    <Form
                                        key={bg}
                                        {...GeneralController.update.form()}
                                        options={{
                                            preserveScroll: true,
                                        }}
                                    >
                                        <input type="hidden" name="currency" value={setting.currency} />
                                        <input type="hidden" name="multiplier" value={setting.multiplier} />
                                        <input type="hidden" name="background" value={bg} />
                                        <input type="hidden" name="task_ringtone" value={setting.task_ringtone} />
                                        <input type="hidden" name="break_ringtone" value={setting.break_ringtone} />
                                        <button type="submit" className="group relative w-full">
                                            <div
                                                className={`overflow-hidden rounded-lg border-2 transition-all ${
                                                    isActive
                                                        ? 'border-primary ring-2 ring-primary/20'
                                                        : 'border-transparent hover:border-muted-foreground/30'
                                                }`}
                                            >
                                                <img
                                                    src={`/img/backgrounds/${bg}.png`}
                                                    alt={bg.replace(/_/g, ' ')}
                                                    className="aspect-video w-full object-cover"
                                                />
                                            </div>
                                            {isActive && (
                                                <div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                                                    <Check className="size-4" />
                                                </div>
                                            )}
                                            <p className="mt-1.5 text-center text-sm capitalize text-muted-foreground">
                                                {bg.replace(/_/g, ' ')}
                                            </p>
                                        </button>
                                    </Form>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}

type RingtonePickerProps = {
    name: string;
    label: string;
    description: string;
    value: RingtoneId;
    onChange: (value: RingtoneId) => void;
    options: RingtoneOption[];
    error?: string;
};

function RingtonePicker({ name, label, description, value, onChange, options, error }: RingtonePickerProps) {
    const current = options.find((o) => o.value === value);

    return (
        <div className="grid gap-2">
            <Label htmlFor={name}>{label}</Label>
            <div className="flex items-center gap-2">
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value as RingtoneId)}
                    className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => playRingtone(value)}
                    className="gap-1"
                >
                    <Play className="size-3.5" />
                    Preview
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                {description}
                {current && <> · {current.description}.</>}
            </p>
            <InputError message={error} />
        </div>
    );
}
