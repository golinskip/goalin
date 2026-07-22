<?php

namespace Domain\Tools\TaskMindmap\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\TaskMindmap\Support\MindmapTreePresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaskMindmapController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('tools/task-mindmap/index', [
            'tree' => MindmapTreePresenter::forUser($request->user()),
        ]);
    }
}
