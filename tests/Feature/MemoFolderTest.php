<?php

use Domain\Tools\Flashcards\Models\MemoFolder;
use Domain\Tools\Flashcards\Models\MemoSet;
use Domain\User\Models\User;

test('guests cannot browse a folder', function () {
    $folder = MemoFolder::factory()->create();

    $this->get(route('memo-folders.show', $folder))->assertRedirect(route('login'));
});

test('the index lists only root level folders and sets', function () {
    $user = User::factory()->create();

    $root = MemoFolder::factory()->for($user)->create(['name' => 'Languages']);
    MemoFolder::factory()->for($user)->create(['name' => 'Nested', 'parent_id' => $root->id]);

    $rootSet = MemoSet::factory()->for($user)->create(['name' => 'Loose set']);
    MemoSet::factory()->for($user)->create(['name' => 'Filed set', 'memo_folder_id' => $root->id]);

    $this->actingAs($user);

    $this->get(route('memo-sets.index'))->assertInertia(fn ($page) => $page
        ->component('tools/memo-sets/index')
        ->where('currentFolder', null)
        ->count('breadcrumb', 0)
        ->count('folders', 1)
        ->where('folders.0.id', $root->id)
        ->where('folders.0.folders_count', 1)
        ->where('folders.0.sets_count', 1)
        ->count('memoSets', 1)
        ->where('memoSets.0.id', $rootSet->id)
    );
});

test('browsing a folder lists its own children', function () {
    $user = User::factory()->create();

    $parent = MemoFolder::factory()->for($user)->create(['name' => 'Languages']);
    $child = MemoFolder::factory()->for($user)->create(['name' => 'Spanish', 'parent_id' => $parent->id]);
    $set = MemoSet::factory()->for($user)->create(['name' => 'Verbs', 'memo_folder_id' => $parent->id]);

    MemoSet::factory()->for($user)->create(['name' => 'Elsewhere']);

    $this->actingAs($user);

    $this->get(route('memo-folders.show', $parent))->assertInertia(fn ($page) => $page
        ->component('tools/memo-sets/index')
        ->where('currentFolder.id', $parent->id)
        ->count('folders', 1)
        ->where('folders.0.id', $child->id)
        ->count('memoSets', 1)
        ->where('memoSets.0.id', $set->id)
    );
});

test('a nested folder reports its full breadcrumb path', function () {
    $user = User::factory()->create();

    $top = MemoFolder::factory()->for($user)->create(['name' => 'Languages']);
    $middle = MemoFolder::factory()->for($user)->create(['name' => 'Spanish', 'parent_id' => $top->id]);
    $bottom = MemoFolder::factory()->for($user)->create(['name' => 'Verbs', 'parent_id' => $middle->id]);

    $this->actingAs($user);

    $this->get(route('memo-folders.show', $bottom))->assertInertia(fn ($page) => $page
        ->count('breadcrumb', 3)
        ->where('breadcrumb.0.name', 'Languages')
        ->where('breadcrumb.1.name', 'Spanish')
        ->where('breadcrumb.2.name', 'Verbs')
    );
});

test('a memo set reports the breadcrumb of the folder holding it', function () {
    $user = User::factory()->create();

    $top = MemoFolder::factory()->for($user)->create(['name' => 'Languages']);
    $child = MemoFolder::factory()->for($user)->create(['name' => 'Spanish', 'parent_id' => $top->id]);
    $set = MemoSet::factory()->for($user)->create(['memo_folder_id' => $child->id]);

    $this->actingAs($user);

    $this->get(route('memo-sets.show', $set))->assertInertia(fn ($page) => $page
        ->count('breadcrumb', 2)
        ->where('breadcrumb.0.name', 'Languages')
        ->where('breadcrumb.1.name', 'Spanish')
    );
});

test('users cannot browse folders belonging to someone else', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $folder = MemoFolder::factory()->for($owner)->create();

    $this->actingAs($other);

    $this->get(route('memo-folders.show', $folder))->assertForbidden();
});

test('users can create a folder at the root', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->post(route('memo-folders.store'), [
        'name' => 'Languages',
        'color' => '#3a9a4e',
    ])->assertRedirect(route('memo-sets.index'));

    $this->assertDatabaseHas('memo_folders', [
        'user_id' => $user->id,
        'name' => 'Languages',
        'parent_id' => null,
    ]);
});

test('users can create a folder inside another folder', function () {
    $user = User::factory()->create();
    $parent = MemoFolder::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('memo-folders.store'), [
        'name' => 'Spanish',
        'color' => '#3a9a4e',
        'parent_id' => $parent->id,
    ])->assertRedirect(route('memo-folders.show', $parent));

    $this->assertDatabaseHas('memo_folders', [
        'name' => 'Spanish',
        'parent_id' => $parent->id,
    ]);
});

test('a folder cannot be created inside someone elses folder', function () {
    $user = User::factory()->create();
    $foreign = MemoFolder::factory()->create();
    $this->actingAs($user);

    $this->from(route('memo-sets.index'))
        ->post(route('memo-folders.store'), [
            'name' => 'Sneaky',
            'color' => '#3a9a4e',
            'parent_id' => $foreign->id,
        ])
        ->assertSessionHasErrors('parent_id');
});

test('users can rename and recolor a folder', function () {
    $user = User::factory()->create();
    $folder = MemoFolder::factory()->for($user)->create(['name' => 'Old', 'color' => '#111111']);
    $this->actingAs($user);

    $this->put(route('memo-folders.update', $folder), [
        'name' => 'New',
        'color' => '#abcdef',
    ])->assertRedirect();

    expect($folder->fresh()->name)->toBe('New');
    expect($folder->fresh()->color)->toBe('#abcdef');
});

test('users cannot edit a folder belonging to someone else', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $folder = MemoFolder::factory()->for($owner)->create();

    $this->actingAs($other);

    $this->put(route('memo-folders.update', $folder), [
        'name' => 'Hijacked',
        'color' => '#abcdef',
    ])->assertForbidden();
});

test('a folder colour must be a hex value', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->from(route('memo-sets.index'))
        ->post(route('memo-folders.store'), ['name' => 'Languages', 'color' => 'red'])
        ->assertSessionHasErrors('color');
});

test('users can move a folder into another folder', function () {
    $user = User::factory()->create();
    $folder = MemoFolder::factory()->for($user)->create();
    $target = MemoFolder::factory()->for($user)->create();
    $this->actingAs($user);

    $this->put(route('memo-folders.move', $folder), ['parent_id' => $target->id])->assertRedirect();

    expect($folder->fresh()->parent_id)->toBe($target->id);
});

test('users can move a folder back to the root', function () {
    $user = User::factory()->create();
    $parent = MemoFolder::factory()->for($user)->create();
    $folder = MemoFolder::factory()->for($user)->create(['parent_id' => $parent->id]);
    $this->actingAs($user);

    $this->put(route('memo-folders.move', $folder), ['parent_id' => null])->assertRedirect();

    expect($folder->fresh()->parent_id)->toBeNull();
});

test('a folder cannot be moved into itself', function () {
    $user = User::factory()->create();
    $folder = MemoFolder::factory()->for($user)->create();
    $this->actingAs($user);

    $this->from(route('memo-sets.index'))
        ->put(route('memo-folders.move', $folder), ['parent_id' => $folder->id])
        ->assertSessionHasErrors('parent_id');

    expect($folder->fresh()->parent_id)->toBeNull();
});

test('a folder cannot be moved into its own descendant', function () {
    $user = User::factory()->create();
    $top = MemoFolder::factory()->for($user)->create();
    $middle = MemoFolder::factory()->for($user)->create(['parent_id' => $top->id]);
    $bottom = MemoFolder::factory()->for($user)->create(['parent_id' => $middle->id]);
    $this->actingAs($user);

    $this->from(route('memo-sets.index'))
        ->put(route('memo-folders.move', $top), ['parent_id' => $bottom->id])
        ->assertSessionHasErrors('parent_id');

    expect($top->fresh()->parent_id)->toBeNull();
});

test('a folder cannot be moved into someone elses folder', function () {
    $user = User::factory()->create();
    $folder = MemoFolder::factory()->for($user)->create();
    $foreign = MemoFolder::factory()->create();
    $this->actingAs($user);

    $this->from(route('memo-sets.index'))
        ->put(route('memo-folders.move', $folder), ['parent_id' => $foreign->id])
        ->assertSessionHasErrors('parent_id');
});

test('users can move a memo set into a folder and back out', function () {
    $user = User::factory()->create();
    $set = MemoSet::factory()->for($user)->create();
    $folder = MemoFolder::factory()->for($user)->create();
    $this->actingAs($user);

    $this->put(route('memo-sets.move', $set), ['memo_folder_id' => $folder->id])->assertRedirect();
    expect($set->fresh()->memo_folder_id)->toBe($folder->id);

    $this->put(route('memo-sets.move', $set), ['memo_folder_id' => null])->assertRedirect();
    expect($set->fresh()->memo_folder_id)->toBeNull();
});

test('a memo set cannot be moved into someone elses folder', function () {
    $user = User::factory()->create();
    $set = MemoSet::factory()->for($user)->create();
    $foreign = MemoFolder::factory()->create();
    $this->actingAs($user);

    $this->from(route('memo-sets.index'))
        ->put(route('memo-sets.move', $set), ['memo_folder_id' => $foreign->id])
        ->assertSessionHasErrors('memo_folder_id');

    expect($set->fresh()->memo_folder_id)->toBeNull();
});

test('users cannot move a memo set belonging to someone else', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $set = MemoSet::factory()->for($owner)->create();
    $folder = MemoFolder::factory()->for($other)->create();

    $this->actingAs($other);

    $this->put(route('memo-sets.move', $set), ['memo_folder_id' => $folder->id])->assertForbidden();
});

test('a set created while browsing a folder lands in that folder', function () {
    $user = User::factory()->create();
    $folder = MemoFolder::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('memo-sets.store'), [
        'name' => 'Verbs',
        'description' => null,
        'color' => '#3a9a4e',
        'memo_folder_id' => $folder->id,
    ])->assertRedirect(route('memo-folders.show', $folder));

    $this->assertDatabaseHas('memo_sets', [
        'name' => 'Verbs',
        'memo_folder_id' => $folder->id,
    ]);
});

test('an empty folder can be deleted', function () {
    $user = User::factory()->create();
    $folder = MemoFolder::factory()->for($user)->create();
    $this->actingAs($user);

    $this->delete(route('memo-folders.destroy', $folder))->assertRedirect(route('memo-sets.index'));

    $this->assertDatabaseMissing('memo_folders', ['id' => $folder->id]);
});

test('a folder holding sets cannot be deleted', function () {
    $user = User::factory()->create();
    $folder = MemoFolder::factory()->for($user)->create();
    MemoSet::factory()->for($user)->create(['memo_folder_id' => $folder->id]);
    $this->actingAs($user);

    $this->delete(route('memo-folders.destroy', $folder))->assertForbidden();

    $this->assertDatabaseHas('memo_folders', ['id' => $folder->id]);
});

test('a folder holding subfolders cannot be deleted', function () {
    $user = User::factory()->create();
    $folder = MemoFolder::factory()->for($user)->create();
    MemoFolder::factory()->for($user)->create(['parent_id' => $folder->id]);
    $this->actingAs($user);

    $this->delete(route('memo-folders.destroy', $folder))->assertForbidden();

    $this->assertDatabaseHas('memo_folders', ['id' => $folder->id]);
});

test('deleting a subfolder returns to the parent folder', function () {
    $user = User::factory()->create();
    $parent = MemoFolder::factory()->for($user)->create();
    $child = MemoFolder::factory()->for($user)->create(['parent_id' => $parent->id]);
    $this->actingAs($user);

    $this->delete(route('memo-folders.destroy', $child))->assertRedirect(route('memo-folders.show', $parent));
});

test('folder options are labelled with their full path', function () {
    $user = User::factory()->create();
    $top = MemoFolder::factory()->for($user)->create(['name' => 'Languages']);
    MemoFolder::factory()->for($user)->create(['name' => 'Spanish', 'parent_id' => $top->id]);

    $this->actingAs($user);

    $this->get(route('memo-sets.index'))->assertInertia(fn ($page) => $page
        ->count('folderOptions', 2)
        ->where('folderOptions.0.path', 'Languages')
        ->where('folderOptions.1.path', 'Languages / Spanish')
    );
});

test('folder options never include folders owned by others', function () {
    $user = User::factory()->create();
    MemoFolder::factory()->for($user)->create(['name' => 'Mine']);
    MemoFolder::factory()->create(['name' => 'Theirs']);

    $this->actingAs($user);

    $this->get(route('memo-sets.index'))->assertInertia(fn ($page) => $page
        ->count('folderOptions', 1)
        ->where('folderOptions.0.name', 'Mine')
    );
});
