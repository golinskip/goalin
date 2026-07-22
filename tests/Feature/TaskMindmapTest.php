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
