<?php

namespace Domain\User\Controllers;

use App\Http\Controllers\Controller;
use Domain\User\Enums\Currency;
use Domain\User\Requests\GeneralUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GeneralController extends Controller
{
    public function edit(Request $request): Response
    {
        $setting = $request->user()->setting ?? $request->user()->setting()->create([
            'currency' => Currency::Euro->value,
            'multiplier' => 1.00,
        ]);

        return Inertia::render('settings/general', [
            'setting' => [
                'currency' => $setting->currency->value,
                'multiplier' => $setting->multiplier,
            ],
            'currencies' => collect(Currency::cases())->map(fn (Currency $currency) => [
                'value' => $currency->value,
                'label' => $currency->label(),
                'symbol' => $currency->symbol(),
            ]),
        ]);
    }

    public function update(GeneralUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $setting = $user->setting ?? $user->setting()->create();

        $oldMultiplier = (float) $setting->multiplier;
        $setting->fill($request->validated());
        $setting->save();

        $newMultiplier = (float) $setting->multiplier;

        if ($oldMultiplier !== $newMultiplier) {
            $user->rewards()->each(function ($reward) use ($newMultiplier) {
                $reward->update([
                    'cost_in_points' => (int) round($newMultiplier * $reward->cost_in_money),
                ]);
            });
        }

        return to_route('general.edit');
    }
}
