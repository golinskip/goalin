<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Storage;

class PointService
{
    /**
     * @return array{
     *     totalEarned: int,
     *     totalSpent: int,
     *     availablePoints: int,
     *     achievedRewards: list<array{id: int, name: string, color: string, picture: string|null, cost_in_points: int}>,
     *     currentReward: array{id: int, name: string, color: string, picture: string|null, cost_in_points: int, pointsProgress: int, percentage: int}|null,
     *     queuedRewards: list<array{id: int, name: string, color: string, picture: string|null, cost_in_points: int}>,
     * }
     */
    public function getRewardProgression(User $user): array
    {
        $totalEarned = (int) $user->activityLogs()->sum('points_earned');

        $rewards = $user->rewards()->get(['id', 'name', 'color', 'picture', 'cost_in_points']);

        $achieved = [];
        $current = null;
        $queued = [];
        $remaining = $totalEarned;

        foreach ($rewards as $reward) {
            $rewardData = [
                'id' => $reward->id,
                'name' => $reward->name,
                'color' => $reward->color,
                'picture' => $reward->picture ? Storage::url($reward->picture) : null,
                'cost_in_points' => $reward->cost_in_points,
            ];

            if ($remaining >= $reward->cost_in_points) {
                $remaining -= $reward->cost_in_points;
                $achieved[] = $rewardData;
            } elseif ($current === null) {
                $percentage = $reward->cost_in_points > 0
                    ? (int) round(($remaining / $reward->cost_in_points) * 100)
                    : 100;

                $current = array_merge($rewardData, [
                    'pointsProgress' => $remaining,
                    'percentage' => min($percentage, 100),
                ]);

                $remaining = 0;
            } else {
                $queued[] = $rewardData;
            }
        }

        $totalSpent = collect($achieved)->sum('cost_in_points');

        return [
            'totalEarned' => $totalEarned,
            'totalSpent' => $totalSpent,
            'availablePoints' => $totalEarned - $totalSpent,
            'achievedRewards' => $achieved,
            'currentReward' => $current,
            'queuedRewards' => $queued,
        ];
    }
}
