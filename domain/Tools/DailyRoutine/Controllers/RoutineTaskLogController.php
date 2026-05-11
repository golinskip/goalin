<?php

namespace Domain\Tools\DailyRoutine\Controllers;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Domain\Tools\DailyRoutine\Enums\RoutineTaskStatus;
use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\Tools\DailyRoutine\Requests\CommentRoutineTaskRequest;
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

        $log = $routineTask->logs()->whereDate('log_date', $logDate)->first();

        if ($status === null) {
            if ($log === null) {
                return back();
            }

            if ($log->comment !== null && $log->comment !== '') {
                $log->status = null;
                $log->save();
            } else {
                $log->delete();
            }

            return back();
        }

        $statusEnum = RoutineTaskStatus::from($status);

        if ($log) {
            $log->status = $statusEnum;
            $log->save();
        } else {
            $routineTask->logs()->create([
                'log_date' => $logDate,
                'status' => $statusEnum,
            ]);
        }

        return back();
    }

    public function comment(CommentRoutineTaskRequest $request, RoutineTask $routineTask): RedirectResponse
    {
        $this->authorize('update', $routineTask);

        /** @var array<string, mixed> $data */
        $data = $request->validated();
        $logDate = CarbonImmutable::parse($data['log_date'])->startOfDay();
        $comment = isset($data['comment']) && $data['comment'] !== '' ? $data['comment'] : null;

        $log = $routineTask->logs()->whereDate('log_date', $logDate)->first();

        if ($log === null) {
            if ($comment === null) {
                return back();
            }

            $routineTask->logs()->create([
                'log_date' => $logDate,
                'status' => null,
                'comment' => $comment,
            ]);

            return back();
        }

        if ($comment === null && $log->status === null) {
            $log->delete();

            return back();
        }

        $log->comment = $comment;
        $log->save();

        return back();
    }
}
