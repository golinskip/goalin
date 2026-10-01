<?php

namespace Domain\Tools\StickyNotes\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\StickyNotes\Support\StickyNotePresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StickyNotesController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('tools/sticky-notes/index', [
            'appliedNotes' => StickyNotePresenter::appliedForUser($request->user()),
        ]);
    }
}
