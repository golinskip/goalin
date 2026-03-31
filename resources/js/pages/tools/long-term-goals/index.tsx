import { Head, router, useForm } from '@inertiajs/react';
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Compass, FolderOpen, MessageSquare, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Long Term Goals', href: '/long-term-goals' }];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type CategoryType = {
    id: number;
    name: string;
    color: string;
    sort_order: number;
};

type GoalType = {
    id: number;
    title: string;
    description: string | null;
    status: string;
    review_note: string | null;
    sort_order: number;
    goal_category_id: number | null;
    category: { id: number; name: string; color: string } | null;
};

type PeriodType = {
    id: number;
    type: string;
    year: number;
    month: number | null;
    review_comment: string | null;
    reviewed_at: string | null;
    goals: GoalType[];
};

type StatusOption = {
    value: string;
    label: string;
};

type Props = {
    year: number;
    month: number;
    categories: CategoryType[];
    yearlyPeriod: PeriodType | null;
    monthlyPeriod: PeriodType | null;
    statuses: StatusOption[];
};

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    done: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    partially_done: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    not_done: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

export default function LongTermGoalsIndex({ year, month, categories, yearlyPeriod, monthlyPeriod, statuses }: Props) {
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryType | null>(null);
    const [addingGoalFor, setAddingGoalFor] = useState<'yearly' | 'monthly' | null>(null);
    const [editingGoal, setEditingGoal] = useState<GoalType | null>(null);
    const [reviewingPeriod, setReviewingPeriod] = useState<'yearly' | 'monthly' | null>(null);

    const categoryForm = useForm({ name: '', color: '#6366f1' });
    const editCategoryForm = useForm({ name: '', color: '' });
    const goalForm = useForm({ title: '', description: '', goal_category_id: '' as string | number, period_type: '', year: year, month: month });
    const editGoalForm = useForm({ title: '', description: '', goal_category_id: '' as string | number, status: '', review_note: '' });

    const navigateYear = useCallback((delta: number) => {
        router.get('/long-term-goals', { year: year + delta, month }, { preserveState: true });
    }, [year, month]);

    const navigateMonth = useCallback((newMonth: number) => {
        let newYear = year;
        if (newMonth < 1) { newMonth = 12; newYear--; }
        if (newMonth > 12) { newMonth = 1; newYear++; }
        router.get('/long-term-goals', { year: newYear, month: newMonth }, { preserveState: true });
    }, [year]);

    const handleCreateCategory = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        categoryForm.post('/long-term-goals/categories', {
            onSuccess: () => { setShowCategoryForm(false); categoryForm.reset(); },
        });
    }, [categoryForm]);

    const handleEditCategory = useCallback((cat: CategoryType) => {
        setEditingCategory(cat);
        editCategoryForm.setData({ name: cat.name, color: cat.color });
    }, [editCategoryForm]);

    const handleUpdateCategory = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;
        editCategoryForm.put(`/long-term-goals/categories/${editingCategory.id}`, {
            onSuccess: () => setEditingCategory(null),
        });
    }, [editCategoryForm, editingCategory]);

    const handleDeleteCategory = useCallback((id: number) => {
        if (!confirm('Delete this category? Goals in this category will become uncategorized.')) return;
        router.delete(`/long-term-goals/categories/${id}`, { preserveScroll: true });
    }, []);

    const openAddGoal = useCallback((periodType: 'yearly' | 'monthly') => {
        setAddingGoalFor(periodType);
        goalForm.setData({
            title: '', description: '', goal_category_id: '',
            period_type: periodType, year, month,
        });
    }, [goalForm, year, month]);

    const handleCreateGoal = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        goalForm.post('/long-term-goals/goals', {
            onSuccess: () => { setAddingGoalFor(null); goalForm.reset(); },
        });
    }, [goalForm]);

    const openEditGoal = useCallback((goal: GoalType) => {
        setEditingGoal(goal);
        editGoalForm.setData({
            title: goal.title,
            description: goal.description ?? '',
            goal_category_id: goal.goal_category_id ?? '',
            status: goal.status,
            review_note: goal.review_note ?? '',
        });
    }, [editGoalForm]);

    const handleUpdateGoal = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGoal) return;
        editGoalForm.put(`/long-term-goals/goals/${editingGoal.id}`, {
            onSuccess: () => setEditingGoal(null),
        });
    }, [editGoalForm, editingGoal]);

    const handleDeleteGoal = useCallback((id: number) => {
        if (!confirm('Delete this goal?')) return;
        router.delete(`/long-term-goals/goals/${id}`, { preserveScroll: true });
    }, []);

    // Review
    const [reviewComment, setReviewComment] = useState('');
    const [reviewGoals, setReviewGoals] = useState<{ id: number; status: string; review_note: string }[]>([]);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    const openReview = useCallback((periodType: 'yearly' | 'monthly') => {
        const period = periodType === 'yearly' ? yearlyPeriod : monthlyPeriod;
        if (!period) return;
        setReviewingPeriod(periodType);
        setReviewComment(period.review_comment ?? '');
        setReviewGoals(period.goals.map(g => ({
            id: g.id,
            status: g.status,
            review_note: g.review_note ?? '',
        })));
    }, [yearlyPeriod, monthlyPeriod]);

    const updateReviewGoal = useCallback((goalId: number, field: 'status' | 'review_note', value: string) => {
        setReviewGoals(prev => prev.map(g => g.id === goalId ? { ...g, [field]: value } : g));
    }, []);

    const handleSubmitReview = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const period = reviewingPeriod === 'yearly' ? yearlyPeriod : monthlyPeriod;
        if (!period) return;
        setReviewSubmitting(true);
        router.put(`/long-term-goals/periods/${period.id}/review`, {
            review_comment: reviewComment,
            goals: reviewGoals,
        }, {
            onSuccess: () => setReviewingPeriod(null),
            onFinish: () => setReviewSubmitting(false),
        });
    }, [reviewingPeriod, yearlyPeriod, monthlyPeriod, reviewComment, reviewGoals]);

    const groupGoalsByCategory = (goals: GoalType[]) => {
        const groups: { category: CategoryType | null; goals: GoalType[] }[] = [];
        const categoryMap = new Map<number | 'uncategorized', GoalType[]>();

        for (const goal of goals) {
            const key = goal.goal_category_id ?? 'uncategorized';
            if (!categoryMap.has(key)) categoryMap.set(key, []);
            categoryMap.get(key)!.push(goal);
        }

        for (const cat of categories) {
            const catGoals = categoryMap.get(cat.id);
            if (catGoals) groups.push({ category: cat, goals: catGoals });
        }

        const uncategorized = categoryMap.get('uncategorized');
        if (uncategorized) groups.push({ category: null, goals: uncategorized });

        return groups;
    };

    const renderPeriodSection = (title: string, periodType: 'yearly' | 'monthly', period: PeriodType | null) => {
        const goals = period?.goals ?? [];
        const grouped = groupGoalsByCategory(goals);

        return (
            <div className="rounded-xl border border-violet-200/80 bg-white/70 shadow-sm backdrop-blur-sm dark:border-violet-800/50 dark:bg-black/40">
                <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
                    <h3 className="font-semibold">{title}</h3>
                    <div className="flex items-center gap-2">
                        {period && goals.length > 0 && (
                            <Button size="sm" variant="outline" onClick={() => openReview(periodType)}>
                                <ClipboardCheck className="size-4" />
                                {period.reviewed_at ? 'Edit Review' : 'Review'}
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openAddGoal(periodType)}>
                            <Plus className="size-4" />
                            Add Goal
                        </Button>
                    </div>
                </div>

                {period?.reviewed_at && period.review_comment && (
                    <div className="border-b border-border/50 bg-violet-50/50 px-5 py-3 dark:bg-violet-950/20">
                        <div className="flex items-start gap-2">
                            <MessageSquare className="mt-0.5 size-4 shrink-0 text-violet-500" />
                            <div>
                                <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Review Comment</p>
                                <p className="mt-0.5 text-sm whitespace-pre-line">{period.review_comment}</p>
                            </div>
                        </div>
                    </div>
                )}

                {goals.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                        <Compass className="mx-auto mb-2 size-6 text-violet-400/40" />
                        <p className="text-sm text-muted-foreground">No goals for this period yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {grouped.map((group, gi) => (
                            <div key={group.category?.id ?? 'uncategorized'}>
                                <div className="flex items-center gap-2 px-5 py-2 bg-muted/30">
                                    {group.category ? (
                                        <>
                                            <div className="size-2.5 rounded-full" style={{ backgroundColor: group.category.color }} />
                                            <span className="text-xs font-medium">{group.category.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <FolderOpen className="size-3.5 text-muted-foreground/50" />
                                            <span className="text-xs font-medium text-muted-foreground">Uncategorized</span>
                                        </>
                                    )}
                                </div>
                                {group.goals.map((goal) => (
                                    <div key={goal.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-black/[.02] dark:hover:bg-white/[.02]">
                                        <span className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[goal.status]}`}>
                                            {statuses.find(s => s.value === goal.status)?.label}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium">{goal.title}</p>
                                            {goal.description && (
                                                <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-line">{goal.description}</p>
                                            )}
                                            {goal.review_note && (
                                                <p className="mt-1 text-xs text-violet-600 dark:text-violet-400 italic">
                                                    Review: {goal.review_note}
                                                </p>
                                            )}
                                        </div>
                                        <button onClick={() => openEditGoal(goal)} className="rounded-md p-1 text-muted-foreground/50 hover:text-foreground">
                                            <Pencil className="size-3.5" />
                                        </button>
                                        <button onClick={() => handleDeleteGoal(goal.id)} className="rounded-md p-1 text-muted-foreground/50 hover:text-red-500">
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Long Term Goals" />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    {/* Categories Section */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-lg font-semibold">
                                <FolderOpen className="size-5" />
                                Categories
                            </h2>
                            <Button size="sm" variant="outline" onClick={() => setShowCategoryForm(!showCategoryForm)}>
                                {showCategoryForm ? <X className="size-4" /> : <Plus className="size-4" />}
                                {showCategoryForm ? 'Cancel' : 'New Category'}
                            </Button>
                        </div>

                        {showCategoryForm && (
                            <div className="mb-4 rounded-xl border border-violet-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-violet-800/50 dark:bg-black/40">
                                <form onSubmit={handleCreateCategory} className="flex flex-wrap items-end gap-4">
                                    <div className="grid min-w-48 flex-1 gap-2">
                                        <Label htmlFor="cat-name">Name</Label>
                                        <Input
                                            id="cat-name"
                                            value={categoryForm.data.name}
                                            onChange={(e) => categoryForm.setData('name', e.target.value)}
                                            placeholder="Category name"
                                            required
                                        />
                                        <InputError message={categoryForm.errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="cat-color">Color</Label>
                                        <input
                                            id="cat-color"
                                            type="color"
                                            value={categoryForm.data.color}
                                            onChange={(e) => categoryForm.setData('color', e.target.value)}
                                            className="h-9 w-14 cursor-pointer rounded-md border border-input"
                                        />
                                    </div>
                                    <Button type="submit" disabled={categoryForm.processing}>
                                        {categoryForm.processing && <Spinner />}
                                        Create
                                    </Button>
                                </form>
                            </div>
                        )}

                        {editingCategory && (
                            <div className="mb-4 rounded-xl border border-violet-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-violet-800/50 dark:bg-black/40">
                                <h3 className="mb-3 font-medium">Edit Category</h3>
                                <form onSubmit={handleUpdateCategory} className="flex flex-wrap items-end gap-4">
                                    <div className="grid min-w-48 flex-1 gap-2">
                                        <Label htmlFor="edit-cat-name">Name</Label>
                                        <Input
                                            id="edit-cat-name"
                                            value={editCategoryForm.data.name}
                                            onChange={(e) => editCategoryForm.setData('name', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-cat-color">Color</Label>
                                        <input
                                            id="edit-cat-color"
                                            type="color"
                                            value={editCategoryForm.data.color}
                                            onChange={(e) => editCategoryForm.setData('color', e.target.value)}
                                            className="h-9 w-14 cursor-pointer rounded-md border border-input"
                                        />
                                    </div>
                                    <Button type="submit" disabled={editCategoryForm.processing}>
                                        {editCategoryForm.processing && <Spinner />}
                                        Save
                                    </Button>
                                    <Button variant="ghost" type="button" onClick={() => setEditingCategory(null)}>Cancel</Button>
                                </form>
                            </div>
                        )}

                        {categories.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {categories.map((cat) => (
                                    <div
                                        key={cat.id}
                                        className="group flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1.5 text-sm shadow-sm backdrop-blur-sm dark:bg-black/40"
                                        style={{ borderColor: cat.color + '60' }}
                                    >
                                        <div className="size-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span className="font-medium">{cat.name}</span>
                                        <button onClick={() => handleEditCategory(cat)} className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
                                            <Pencil className="size-3" />
                                        </button>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100">
                                            <Trash2 className="size-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Year Navigation */}
                    <div className="flex items-center justify-center gap-4">
                        <button onClick={() => navigateYear(-1)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                            <ChevronLeft className="size-5" />
                        </button>
                        <h2 className="text-2xl font-bold">{year}</h2>
                        <button onClick={() => navigateYear(1)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                            <ChevronRight className="size-5" />
                        </button>
                    </div>

                    {/* Add Goal Form */}
                    {addingGoalFor && (
                        <div className="rounded-xl border border-violet-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-violet-800/50 dark:bg-black/40">
                            <h3 className="mb-3 font-medium">
                                Add {addingGoalFor === 'yearly' ? 'Yearly' : `${MONTH_NAMES[month - 1]}`} Goal
                            </h3>
                            <form onSubmit={handleCreateGoal} className="space-y-4">
                                <div className="flex flex-wrap items-end gap-4">
                                    <div className="grid min-w-48 flex-1 gap-2">
                                        <Label htmlFor="goal-title">Title</Label>
                                        <Input
                                            id="goal-title"
                                            value={goalForm.data.title}
                                            onChange={(e) => goalForm.setData('title', e.target.value)}
                                            placeholder="What do you want to achieve?"
                                            required
                                        />
                                        <InputError message={goalForm.errors.title} />
                                    </div>
                                    <div className="grid min-w-40 gap-2">
                                        <Label htmlFor="goal-category">Category</Label>
                                        <select
                                            id="goal-category"
                                            value={goalForm.data.goal_category_id}
                                            onChange={(e) => goalForm.setData('goal_category_id', e.target.value ? Number(e.target.value) : '')}
                                            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                        >
                                            <option value="">Uncategorized</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="goal-desc">Description (optional)</Label>
                                    <textarea
                                        id="goal-desc"
                                        value={goalForm.data.description}
                                        onChange={(e) => goalForm.setData('description', e.target.value)}
                                        placeholder="More details about this goal..."
                                        rows={2}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                    <InputError message={goalForm.errors.description} />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={goalForm.processing}>
                                        {goalForm.processing && <Spinner />}
                                        Add Goal
                                    </Button>
                                    <Button variant="ghost" type="button" onClick={() => setAddingGoalFor(null)}>Cancel</Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Edit Goal Form */}
                    {editingGoal && (
                        <div className="rounded-xl border border-violet-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-violet-800/50 dark:bg-black/40">
                            <h3 className="mb-3 font-medium">Edit Goal</h3>
                            <form onSubmit={handleUpdateGoal} className="space-y-4">
                                <div className="flex flex-wrap items-end gap-4">
                                    <div className="grid min-w-48 flex-1 gap-2">
                                        <Label htmlFor="edit-goal-title">Title</Label>
                                        <Input
                                            id="edit-goal-title"
                                            value={editGoalForm.data.title}
                                            onChange={(e) => editGoalForm.setData('title', e.target.value)}
                                            required
                                        />
                                        <InputError message={editGoalForm.errors.title} />
                                    </div>
                                    <div className="grid min-w-40 gap-2">
                                        <Label htmlFor="edit-goal-category">Category</Label>
                                        <select
                                            id="edit-goal-category"
                                            value={editGoalForm.data.goal_category_id}
                                            onChange={(e) => editGoalForm.setData('goal_category_id', e.target.value ? Number(e.target.value) : '')}
                                            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                        >
                                            <option value="">Uncategorized</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid min-w-32 gap-2">
                                        <Label htmlFor="edit-goal-status">Status</Label>
                                        <select
                                            id="edit-goal-status"
                                            value={editGoalForm.data.status}
                                            onChange={(e) => editGoalForm.setData('status', e.target.value)}
                                            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                        >
                                            {statuses.map((s) => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-goal-desc">Description</Label>
                                    <textarea
                                        id="edit-goal-desc"
                                        value={editGoalForm.data.description}
                                        onChange={(e) => editGoalForm.setData('description', e.target.value)}
                                        rows={2}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={editGoalForm.processing}>
                                        {editGoalForm.processing && <Spinner />}
                                        Save
                                    </Button>
                                    <Button variant="ghost" type="button" onClick={() => setEditingGoal(null)}>Cancel</Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Review Form */}
                    {reviewingPeriod && (
                        <div className="rounded-xl border-2 border-violet-300/80 bg-white/80 p-5 shadow-md backdrop-blur-sm dark:border-violet-700/50 dark:bg-black/50">
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                <ClipboardCheck className="size-5 text-violet-600 dark:text-violet-400" />
                                Review: {reviewingPeriod === 'yearly' ? `${year} Yearly Goals` : `${MONTH_NAMES[month - 1]} ${year}`}
                            </h3>
                            <form onSubmit={handleSubmitReview} className="space-y-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="review-comment">Overall Comment</Label>
                                    <textarea
                                        id="review-comment"
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        placeholder="Reflect on this period..."
                                        rows={3}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label>Goals</Label>
                                    {reviewGoals.map((rg) => {
                                        const period = reviewingPeriod === 'yearly' ? yearlyPeriod : monthlyPeriod;
                                        const originalGoal = period?.goals.find(g => g.id === rg.id);
                                        if (!originalGoal) return null;
                                        return (
                                            <div key={rg.id} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                                                <div className="mb-2 flex items-center gap-3">
                                                    <p className="flex-1 text-sm font-medium">{originalGoal.title}</p>
                                                    <select
                                                        value={rg.status}
                                                        onChange={(e) => updateReviewGoal(rg.id, 'status', e.target.value)}
                                                        className="h-8 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                    >
                                                        {statuses.map((s) => (
                                                            <option key={s.value} value={s.value}>{s.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={rg.review_note}
                                                    onChange={(e) => updateReviewGoal(rg.id, 'review_note', e.target.value)}
                                                    placeholder="Note about this goal..."
                                                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={reviewSubmitting}>
                                        {reviewSubmitting && <Spinner />}
                                        <Check className="size-4" />
                                        Save Review
                                    </Button>
                                    <Button variant="ghost" type="button" onClick={() => setReviewingPeriod(null)}>Cancel</Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Yearly Goals */}
                    {renderPeriodSection(`${year} — Yearly Goals`, 'yearly', yearlyPeriod)}

                    {/* Month Navigation */}
                    <div className="flex items-center justify-center gap-4">
                        <button onClick={() => navigateMonth(month - 1)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                            <ChevronLeft className="size-5" />
                        </button>
                        <h3 className="min-w-32 text-center text-lg font-semibold">{MONTH_NAMES[month - 1]}</h3>
                        <button onClick={() => navigateMonth(month + 1)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                            <ChevronRight className="size-5" />
                        </button>
                    </div>

                    {/* Monthly Goals */}
                    {renderPeriodSection(`${MONTH_NAMES[month - 1]} ${year} — Monthly Goals`, 'monthly', monthlyPeriod)}
                </div>
            </div>
        </AppLayout>
    );
}
