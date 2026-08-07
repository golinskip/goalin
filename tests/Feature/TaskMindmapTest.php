<?php

use Domain\Tools\TaskMindmap\Enums\TaskStatus;
use Domain\Tools\TaskMindmap\Models\MindmapTask;
use Domain\User\Models\User;

test('guests are redirected to login', function () {
    $this->get(route('task-mindmap.index'))->assertRedirect(route('login'));
});

test('authenticated users can visit the task mindmap', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get(route('task-mindmap.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('tools/task-mindmap/index')->has('tree'));
});

test('a user can create a top-level task', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->post(route('mindmap-tasks.store'), ['title' => 'Launch product'])->assertRedirect();

    $task = MindmapTask::query()->sole();

    expect($task->user_id)->toBe($user->id)
        ->and($task->parent_id)->toBeNull()
        ->and($task->status)->toBe(TaskStatus::Todo);
});

test('a user can nest a task under a parent', function () {
    $user = User::factory()->create();
    $parent = MindmapTask::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('mindmap-tasks.store'), ['title' => 'Sub goal', 'parent_id' => $parent->id])->assertRedirect();

    $this->assertDatabaseHas('mindmap_tasks', ['title' => 'Sub goal', 'parent_id' => $parent->id]);
});

test('a task can only nest under the user own task', function () {
    $user = User::factory()->create();
    $foreign = MindmapTask::factory()->create();
    $this->actingAs($user);

    $this->post(route('mindmap-tasks.store'), ['title' => 'Sneaky', 'parent_id' => $foreign->id])
        ->assertSessionHasErrors('parent_id');
});

test('a user can edit task details', function () {
    $user = User::factory()->create();
    $task = MindmapTask::factory()->for($user)->create();
    $this->actingAs($user);

    $this->put(route('mindmap-tasks.update', $task), [
        'title' => 'Detailed',
        'description' => 'Some plan',
        'deadline' => '2026-09-01',
        'color' => '#22c55e',
        'icon' => 'rocket',
        'priority' => 'high',
        'tags' => ['work', 'work', 'q3'],
        'links' => [['label' => 'Spec', 'url' => 'https://example.com/spec']],
    ])->assertRedirect()->assertSessionHasNoErrors();

    $task->refresh();

    expect($task->description)->toBe('Some plan')
        ->and($task->deadline->toDateString())->toBe('2026-09-01')
        ->and($task->color)->toBe('#22c55e')
        ->and($task->icon)->toBe('rocket')
        ->and($task->priority->value)->toBe('high')
        ->and($task->tags)->toBe(['work', 'q3'])
        ->and($task->links)->toBe([['label' => 'Spec', 'url' => 'https://example.com/spec']]);
});

test('an invalid link url is rejected', function () {
    $user = User::factory()->create();
    $task = MindmapTask::factory()->for($user)->create();
    $this->actingAs($user);

    $this->put(route('mindmap-tasks.update', $task), [
        'title' => 'Bad',
        'links' => [['url' => 'nope']],
    ])->assertSessionHasErrors('links.0.url');
});

test('a user can change a task status', function () {
    $user = User::factory()->create();
    $task = MindmapTask::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('mindmap-tasks.status', $task), ['status' => 'done'])->assertRedirect();
    expect($task->fresh()->status)->toBe(TaskStatus::Done);

    $this->post(route('mindmap-tasks.status', $task), ['status' => 'rejected'])->assertRedirect();
    expect($task->fresh()->status)->toBe(TaskStatus::Rejected);

    $this->post(route('mindmap-tasks.status', $task), ['status' => 'todo'])->assertRedirect();
    expect($task->fresh()->status)->toBe(TaskStatus::Todo);
});

test('a user can mark a task as in progress with a percentage', function () {
    $user = User::factory()->create();
    $task = MindmapTask::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('mindmap-tasks.status', $task), ['status' => 'in_progress', 'progress' => 40])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($task->fresh()->status)->toBe(TaskStatus::InProgress)
        ->and($task->fresh()->progress)->toBe(40);
});

test('the progress stays consistent with the status', function (string $status, ?int $progress, int $expected) {
    $user = User::factory()->create();
    $task = MindmapTask::factory()->for($user)->inProgress(60)->create();
    $this->actingAs($user);

    $this->post(route('mindmap-tasks.status', $task), array_filter([
        'status' => $status,
        'progress' => $progress,
    ], fn ($value): bool => $value !== null))->assertRedirect();

    expect($task->fresh()->progress)->toBe($expected);
})->with([
    'done is always complete' => ['done', null, 100],
    'todo is always empty' => ['todo', null, 0],
    'in progress never reaches 100' => ['in_progress', 100, 99],
    'in progress keeps its percentage' => ['in_progress', 25, 25],
    'rejected keeps its percentage' => ['rejected', null, 60],
]);

test('a progress above 100 is rejected', function () {
    $user = User::factory()->create();
    $task = MindmapTask::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('mindmap-tasks.status', $task), ['status' => 'in_progress', 'progress' => 140])
        ->assertSessionHasErrors('progress');
});

test('a user can set the status and progress from the details form', function () {
    $user = User::factory()->create();
    $task = MindmapTask::factory()->for($user)->create();
    $this->actingAs($user);

    $this->put(route('mindmap-tasks.update', $task), [
        'title' => 'Half way',
        'status' => 'in_progress',
        'progress' => 50,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $task->refresh();

    expect($task->status)->toBe(TaskStatus::InProgress)
        ->and($task->progress)->toBe(50);
});

test('editing details without a status keeps the current status and progress', function () {
    $user = User::factory()->create();
    $task = MindmapTask::factory()->for($user)->inProgress(35)->create();
    $this->actingAs($user);

    $this->put(route('mindmap-tasks.update', $task), ['title' => 'Renamed'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $task->refresh();

    expect($task->status)->toBe(TaskStatus::InProgress)
        ->and($task->progress)->toBe(35);
});

test('an invalid status is rejected', function () {
    $user = User::factory()->create();
    $task = MindmapTask::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('mindmap-tasks.status', $task), ['status' => 'maybe'])->assertSessionHasErrors('status');
});

test('the tree exposes branch progress with rejected excluded from the total', function () {
    $user = User::factory()->create();
    $parent = MindmapTask::factory()->for($user)->create();
    MindmapTask::factory()->childOf($parent)->done()->create();
    MindmapTask::factory()->childOf($parent)->rejected()->create();
    MindmapTask::factory()->childOf($parent)->create();
    $this->actingAs($user);

    $this->get(route('task-mindmap.index'))->assertInertia(fn ($page) => $page
        ->where('tree.0.done_count', 1)
        ->where('tree.0.total_count', 2)
        ->has('tree.0.children', 3)
    );
});

test('the tree exposes the fractional progress of in-progress descendants', function () {
    $user = User::factory()->create();
    $parent = MindmapTask::factory()->for($user)->create();
    MindmapTask::factory()->childOf($parent)->done()->create();
    MindmapTask::factory()->childOf($parent)->inProgress(50)->create();
    $this->actingAs($user);

    $this->get(route('task-mindmap.index'))->assertInertia(fn ($page) => $page
        ->where('tree.0.progress', 0)
        ->where('tree.0.done_count', 1)
        ->where('tree.0.total_count', 2)
        ->where('tree.0.progress_sum', 1.5)
        ->etc()
    );
});

test('a user can reorder sibling tasks', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $a = MindmapTask::factory()->for($user)->create(['position' => 0]);
    $b = MindmapTask::factory()->for($user)->create(['position' => 1]);

    $this->patch(route('mindmap-tasks.reorder'), [
        'order' => [
            ['id' => $b->id, 'position' => 0],
            ['id' => $a->id, 'position' => 1],
        ],
    ])->assertRedirect();

    expect($b->fresh()->position)->toBe(0)->and($a->fresh()->position)->toBe(1);
});

test('deleting a task removes its whole subtree', function () {
    $user = User::factory()->create();
    $parent = MindmapTask::factory()->for($user)->create();
    $child = MindmapTask::factory()->childOf($parent)->create();
    $grandchild = MindmapTask::factory()->childOf($child)->create();
    $this->actingAs($user);

    $this->delete(route('mindmap-tasks.destroy', $parent))->assertRedirect();

    $this->assertDatabaseMissing('mindmap_tasks', ['id' => $parent->id]);
    $this->assertDatabaseMissing('mindmap_tasks', ['id' => $child->id]);
    $this->assertDatabaseMissing('mindmap_tasks', ['id' => $grandchild->id]);
});

test('a user cannot touch another user task', function () {
    $user = User::factory()->create();
    $task = MindmapTask::factory()->create();
    $this->actingAs($user);

    $this->post(route('mindmap-tasks.status', $task), ['status' => 'done'])->assertForbidden();
    $this->put(route('mindmap-tasks.update', $task), ['title' => 'Hijack'])->assertForbidden();
    $this->delete(route('mindmap-tasks.destroy', $task))->assertForbidden();
});
