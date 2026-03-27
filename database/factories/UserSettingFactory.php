<?php

namespace Database\Factories;

use Domain\User\Enums\Currency;
use Domain\User\Models\User;
use Domain\User\Models\UserSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserSetting>
 */
class UserSettingFactory extends Factory
{
    protected $model = UserSetting::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'currency' => Currency::Euro->value,
            'multiplier' => 1.00,
        ];
    }
}
