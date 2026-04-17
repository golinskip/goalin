<?php

namespace Domain\Tools\GoalTracker\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\Alerts\AlertManager;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, AlertManager $alertManager): Response
    {
        return Inertia::render('dashboard', [
            'alerts' => $alertManager->getActiveAlerts($request->user()),
        ]);
    }
}
