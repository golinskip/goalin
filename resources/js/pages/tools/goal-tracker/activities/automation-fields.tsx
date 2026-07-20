import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type EventParameterOption = { value: string; label: string };

export type RoutineTaskOption = { id: number; name: string };

export type EventParameterDef = {
    name: string;
    label: string;
    type: 'integer' | 'choice' | 'routine_task';
    default: string | number;
    min: number | null;
    max: number | null;
    options: EventParameterOption[] | null;
    help: string | null;
};

export type AutomationEventDef = {
    key: string;
    tool: string;
    label: string;
    description: string;
    repeatable_within_day: boolean;
    parameters: EventParameterDef[];
};

export type ActivityType = 'manual' | 'automated';

export type EventParameterValues = Record<string, string | number>;

function defaultsFor(
    event: AutomationEventDef,
    availableRoutineTasks: RoutineTaskOption[],
): EventParameterValues {
    return Object.fromEntries(
        event.parameters.map((parameter) => [
            parameter.name,
            parameter.type === 'routine_task'
                ? (availableRoutineTasks[0]?.id ?? 0)
                : parameter.default,
        ]),
    );
}

type Props = {
    events: AutomationEventDef[];
    availableRoutineTasks: RoutineTaskOption[];
    type: ActivityType;
    eventKey: string;
    parameters: EventParameterValues;
    errors: Record<string, string | undefined>;
    onTypeChange: (type: ActivityType) => void;
    onEventChange: (eventKey: string, parameters: EventParameterValues) => void;
    onParameterChange: (parameters: EventParameterValues) => void;
};

export default function AutomationFields({
    events,
    availableRoutineTasks,
    type,
    eventKey,
    parameters,
    errors,
    onTypeChange,
    onEventChange,
    onParameterChange,
}: Props) {
    const selectedEvent =
        events.find((event) => event.key === eventKey) ?? null;

    const setType = (next: ActivityType) => {
        if (next === 'automated' && !eventKey && events.length > 0) {
            const first = events[0];
            onEventChange(first.key, defaultsFor(first, availableRoutineTasks));
        }

        onTypeChange(next);
    };

    const setEvent = (nextKey: string) => {
        const next = events.find((event) => event.key === nextKey);
        onEventChange(
            nextKey,
            next ? defaultsFor(next, availableRoutineTasks) : {},
        );
    };

    const setParameter = (name: string, value: string | number) => {
        onParameterChange({ ...parameters, [name]: value });
    };

    return (
        <div className="space-y-4 rounded-lg border border-border/50 p-4">
            <div className="grid gap-2">
                <Label>Activity type</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                    {[
                        {
                            value: 'manual' as const,
                            title: 'Manual',
                            description: 'You log this activity yourself.',
                        },
                        {
                            value: 'automated' as const,
                            title: 'Automated activity',
                            description:
                                'Points are earned automatically when an event happens.',
                        },
                    ].map((option) => (
                        <label
                            key={option.value}
                            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${
                                type === option.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border/50 hover:border-border'
                            } ${option.value === 'automated' && events.length === 0 ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="activity_type"
                                    checked={type === option.value}
                                    onChange={() => setType(option.value)}
                                    disabled={
                                        option.value === 'automated' &&
                                        events.length === 0
                                    }
                                    className="size-4 border-input"
                                />
                                <span className="text-sm font-medium">
                                    {option.title}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {option.description}
                            </span>
                        </label>
                    ))}
                </div>
                <InputError message={errors.type} />
            </div>

            {type === 'automated' && (
                <div className="space-y-4 border-t border-border/50 pt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="event_key">Triggering event</Label>
                        <select
                            id="event_key"
                            value={eventKey}
                            onChange={(e) => setEvent(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            {events.map((event) => (
                                <option key={event.key} value={event.key}>
                                    {event.tool} — {event.label}
                                </option>
                            ))}
                        </select>
                        {selectedEvent && (
                            <p className="text-xs text-muted-foreground">
                                {selectedEvent.description}
                            </p>
                        )}
                        <InputError message={errors.event_key} />
                    </div>

                    {selectedEvent?.parameters.map((parameter) => {
                        const value =
                            parameters[parameter.name] ?? parameter.default;
                        const fieldError =
                            errors[`event_parameters.${parameter.name}`];

                        return (
                            <div key={parameter.name} className="grid gap-2">
                                <Label htmlFor={`param_${parameter.name}`}>
                                    {parameter.label}
                                </Label>

                                {parameter.type === 'choice' ? (
                                    <select
                                        id={`param_${parameter.name}`}
                                        value={String(value)}
                                        onChange={(e) =>
                                            setParameter(
                                                parameter.name,
                                                e.target.value,
                                            )
                                        }
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                    >
                                        {(parameter.options ?? []).map(
                                            (option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                ) : parameter.type === 'routine_task' ? (
                                    availableRoutineTasks.length > 0 ? (
                                        <select
                                            id={`param_${parameter.name}`}
                                            value={String(value)}
                                            onChange={(e) =>
                                                setParameter(
                                                    parameter.name,
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                        >
                                            {availableRoutineTasks.map(
                                                (task) => (
                                                    <option
                                                        key={task.id}
                                                        value={task.id}
                                                    >
                                                        {task.name}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            Create a routine task first to use
                                            this event.
                                        </p>
                                    )
                                ) : (
                                    <Input
                                        id={`param_${parameter.name}`}
                                        type="number"
                                        min={parameter.min ?? undefined}
                                        max={parameter.max ?? undefined}
                                        value={String(value)}
                                        onChange={(e) =>
                                            setParameter(
                                                parameter.name,
                                                e.target.value,
                                            )
                                        }
                                    />
                                )}

                                {parameter.help && (
                                    <p className="text-xs text-muted-foreground">
                                        {parameter.help}
                                    </p>
                                )}
                                <InputError message={fieldError} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
