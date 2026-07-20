<?php

namespace Domain\Automation;

class EventParameter
{
    /**
     * @param  list<array{value: string, label: string}>|null  $options
     */
    private function __construct(
        public readonly string $name,
        public readonly string $label,
        public readonly string $type,
        public readonly mixed $default,
        public readonly ?int $min = null,
        public readonly ?int $max = null,
        public readonly ?array $options = null,
        public readonly ?string $help = null,
    ) {}

    public static function integer(string $name, string $label, int $default, int $min, int $max, ?string $help = null): self
    {
        return new self($name, $label, 'integer', $default, $min, $max, null, $help);
    }

    /**
     * @param  list<array{value: string, label: string}>  $options
     */
    public static function choice(string $name, string $label, array $options, string $default, ?string $help = null): self
    {
        return new self($name, $label, 'choice', $default, null, null, $options, $help);
    }

    /**
     * A reference to one of the user's own routine tasks. Options are populated
     * per user by the activity form rather than declared statically here.
     */
    public static function routineTask(string $name, string $label, ?string $help = null): self
    {
        return new self($name, $label, 'routine_task', 0, null, null, null, $help);
    }

    /**
     * @return list<mixed>
     */
    public function rules(): array
    {
        return match ($this->type) {
            'integer' => ['required', 'integer', 'min:'.$this->min, 'max:'.$this->max],
            'choice' => ['required', 'string', 'in:'.implode(',', array_column($this->options ?? [], 'value'))],
            'routine_task' => ['required', 'integer', 'min:1'],
            default => ['required'],
        };
    }

    public function cast(mixed $value): mixed
    {
        return match ($this->type) {
            'integer', 'routine_task' => (int) $value,
            'choice' => (string) $value,
            default => $value,
        };
    }

    /**
     * @return array{name: string, label: string, type: string, default: mixed, min: int|null, max: int|null, options: list<array{value: string, label: string}>|null, help: string|null}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label,
            'type' => $this->type,
            'default' => $this->default,
            'min' => $this->min,
            'max' => $this->max,
            'options' => $this->options,
            'help' => $this->help,
        ];
    }
}
