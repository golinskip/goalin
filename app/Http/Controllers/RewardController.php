<?php

namespace App\Http\Controllers;

use App\Enums\Currency;
use App\Http\Requests\Reward\StoreRewardRequest;
use App\Http\Requests\Reward\UpdateRewardRequest;
use App\Models\Reward;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class RewardController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $user = $request->user();
        $setting = $user->setting;

        return Inertia::render('rewards/index', [
            'rewards' => $user->rewards()->get()->map(fn (Reward $reward) => [
                'id' => $reward->id,
                'name' => $reward->name,
                'picture' => $reward->picture ? Storage::url($reward->picture) : null,
                'cost_in_money' => $reward->cost_in_money,
                'cost_in_points' => $reward->cost_in_points,
                'color' => $reward->color,
                'shop_url' => $reward->shop_url,
                'description' => $reward->description,
                'sort_order' => $reward->sort_order,
                'updated_at' => $reward->updated_at->toISOString(),
            ]),
            'currency' => $setting?->currency?->value ?? Currency::Euro->value,
            'currencySymbol' => $setting?->currency?->symbol() ?? Currency::Euro->symbol(),
        ]);
    }

    public function create(Request $request): Response
    {
        $setting = $request->user()->setting;

        return Inertia::render('rewards/create', [
            'currency' => $setting?->currency?->value ?? Currency::Euro->value,
            'currencySymbol' => $setting?->currency?->symbol() ?? Currency::Euro->symbol(),
            'multiplier' => $setting?->multiplier ?? '1.00',
        ]);
    }

    public function store(StoreRewardRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->safe()->except(['picture']);

        if ($request->hasFile('picture')) {
            $data['picture'] = $request->file('picture')->store('rewards', 'public');
        }

        $setting = $user->setting;
        $multiplier = $setting ? (float) $setting->multiplier : 1.0;
        $data['cost_in_points'] = (int) round($multiplier * $data['cost_in_money']);
        $data['sort_order'] = ($user->rewards()->max('sort_order') ?? 0) + 1;

        $user->rewards()->create($data);

        return to_route('rewards.index');
    }

    public function edit(Request $request, Reward $reward): Response
    {
        $this->authorize('update', $reward);

        $setting = $request->user()->setting;

        return Inertia::render('rewards/edit', [
            'reward' => [
                'id' => $reward->id,
                'name' => $reward->name,
                'picture' => $reward->picture ? Storage::url($reward->picture) : null,
                'cost_in_money' => $reward->cost_in_money,
                'cost_in_points' => $reward->cost_in_points,
                'color' => $reward->color,
                'shop_url' => $reward->shop_url,
                'description' => $reward->description,
            ],
            'currency' => $setting?->currency?->value ?? Currency::Euro->value,
            'currencySymbol' => $setting?->currency?->symbol() ?? Currency::Euro->symbol(),
            'multiplier' => $setting?->multiplier ?? '1.00',
        ]);
    }

    public function update(UpdateRewardRequest $request, Reward $reward): RedirectResponse
    {
        $this->authorize('update', $reward);

        $data = $request->safe()->except(['picture']);

        if ($request->hasFile('picture')) {
            if ($reward->picture) {
                Storage::disk('public')->delete($reward->picture);
            }
            $data['picture'] = $request->file('picture')->store('rewards', 'public');
        }

        $setting = $request->user()->setting;
        $multiplier = $setting ? (float) $setting->multiplier : 1.0;
        $data['cost_in_points'] = (int) round($multiplier * $data['cost_in_money']);

        $reward->update($data);

        return to_route('rewards.index');
    }

    public function destroy(Reward $reward): RedirectResponse
    {
        $this->authorize('delete', $reward);

        if ($reward->picture) {
            Storage::disk('public')->delete($reward->picture);
        }

        $reward->delete();

        return to_route('rewards.index');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'order' => ['required', 'array'],
            'order.*.id' => ['required', 'integer'],
            'order.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        $user = $request->user();

        foreach ($data['order'] as $item) {
            $user->rewards()
                ->where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return to_route('rewards.index');
    }
}
