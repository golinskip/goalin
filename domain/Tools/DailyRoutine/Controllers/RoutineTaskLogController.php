<?php

namespace Domain\Tools\DailyRoutine\Controllers;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Domain\Tools\DailyRoutine\Enums\RoutineTaskStatus;
use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\Tools\DailyRoutine\Requests\LogRoutineTaskRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class RoutineTaskLogController extends Controller
{
    use AuthorizesRequests;

    public function store(LogRoutineTaskRequest $request, RoutineTask $routineTask): RedirectResponse
    {
        $this->authorize('update', $routineTask);

        /** @var array<string, mixed> $data */
        $data = $request->validated();
        $logDate = CarbonImmutable::parse($data['log_date'])->startOfDay();
        $status = $data['status'] ?? null;

        if ($status === null) {
            $routineTask->logs()->whereDate('log_date', $logDate)->delete();

            return back();
        }

        $log = $routineTask->logs()->whereDate('log_date', $logDate)->first();

        if ($log) {
            $log->status = RoutineTaskStatus::from($status);
            $log->save();
        } else {
            $routineTask->logs()->create([
                'log_date' => $logDate,
                'status' => RoutineTaskStatus::from($status),
            ]);
        }

        return back();
    }
}
