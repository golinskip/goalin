<?php

namespace Domain\Tools\Flashcards\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\Flashcards\Models\MemoFolder;
use Domain\Tools\Flashcards\Requests\MoveMemoFolderRequest;
use Domain\Tools\Flashcards\Requests\StoreMemoFolderRequest;
use Domain\Tools\Flashcards\Requests\UpdateMemoFolderRequest;
use Domain\Tools\Flashcards\Support\FolderTree;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MemoFolderController extends Controller
{
    use AuthorizesRequests;

    /**
     * Browse a folder: the same listing as the root, scoped to this folder.
     */
    public function show(Request $request, MemoFolder $memoFolder): Response
    {
        $this->authorize('view', $memoFolder);

        return Inertia::render('tools/memo-sets/index', FolderTree::listing($request->user(), $memoFolder));
    }

    public function store(StoreMemoFolderRequest $request): RedirectResponse
    {
        $folder = $request->user()->memoFolders()->create($request->validated());

        return FolderTree::redirectTo($folder->parent);
    }

    public function update(UpdateMemoFolderRequest $request, MemoFolder $memoFolder): RedirectResponse
    {
        $this->authorize('update', $memoFolder);

        $memoFolder->update($request->validated());

        return back();
    }

    public function move(MoveMemoFolderRequest $request, MemoFolder $memoFolder): RedirectResponse
    {
        $this->authorize('update', $memoFolder);

        $memoFolder->update(['parent_id' => $request->validated('parent_id')]);

        return back();
    }

    public function destroy(MemoFolder $memoFolder): RedirectResponse
    {
        $this->authorize('delete', $memoFolder);

        $parent = $memoFolder->parent;

        $memoFolder->delete();

        return FolderTree::redirectTo($parent);
    }
}
