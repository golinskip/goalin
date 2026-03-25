import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Check, Eye, RotateCcw, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { index as memoSetsIndex } from '@/routes/memo-sets';
import type { BreadcrumbItem } from '@/types';

type Card = {
    id: number;
    front: string;
    back: string;
    correct_count: number;
    incorrect_count: number;
    weight: number;
};

type MemoSetData = {
    id: number;
    name: string;
    color: string;
};

type Props = {
    memoSet: MemoSetData;
    cards: Card[];
};

function weightedRandomPick(cards: Card[], excludeId?: number): Card | null {
    const available = cards.filter((c) => c.id !== excludeId);
    if (available.length === 0) return cards[0] ?? null;

    const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;

    for (const card of available) {
        random -= card.weight;
        if (random <= 0) return card;
    }

    return available[available.length - 1];
}

export default function MemoSetLearn({ memoSet, cards: initialCards }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Memo Cards', href: memoSetsIndex() },
        { title: memoSet.name, href: `/memo-sets/${memoSet.id}` },
        { title: 'Learn', href: `/memo-sets/${memoSet.id}/learn` },
    ];

    const [cards, setCards] = useState(initialCards);
    const [currentCard, setCurrentCard] = useState<Card | null>(() => weightedRandomPick(initialCards));
    const [revealed, setRevealed] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);
    const [sessionIncorrect, setSessionIncorrect] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    const totalReviewed = sessionCorrect + sessionIncorrect;

    const handleReveal = useCallback(() => {
        setRevealed(true);
    }, []);

    const handleAnswer = useCallback(
        (correct: boolean) => {
            if (!currentCard) return;

            router.post(
                `/memo-cards/${currentCard.id}/review`,
                { correct },
                { preserveState: true, preserveScroll: true },
            );

            const updatedCards = cards.map((c) => {
                if (c.id !== currentCard.id) return c;
                const newCorrect = c.correct_count + (correct ? 1 : 0);
                const newIncorrect = c.incorrect_count + (correct ? 0 : 1);
                return {
                    ...c,
                    correct_count: newCorrect,
                    incorrect_count: newIncorrect,
                    weight: Math.max(1, (newIncorrect + 1) - (newCorrect * 0.5)),
                };
            });

            setCards(updatedCards);

            if (correct) {
                setSessionCorrect((prev) => prev + 1);
            } else {
                setSessionIncorrect((prev) => prev + 1);
            }

            setRevealed(false);
            const nextCard = weightedRandomPick(updatedCards, currentCard.id);
            setCurrentCard(nextCard);
        },
        [currentCard, cards],
    );

    const handleFinish = useCallback(() => {
        setIsFinished(true);
    }, []);

    const handleRestart = useCallback(() => {
        setSessionCorrect(0);
        setSessionIncorrect(0);
        setIsFinished(false);
        setRevealed(false);
        setCurrentCard(weightedRandomPick(cards));
    }, [cards]);

    const accuracy = totalReviewed > 0 ? Math.round((sessionCorrect / totalReviewed) * 100) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Learn - ${memoSet.name}`} />

            <div className="relative flex h-full flex-1 flex-col">
                <div className="pointer-events-none fixed inset-0 z-0">
                    <img src="/img/background.png" alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/65" />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 lg:p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="size-8" asChild>
                                <Link href={`/memo-sets/${memoSet.id}`}>
                                    <ArrowLeft className="size-4" />
                                </Link>
                            </Button>
                            <h1 className="text-lg font-semibold">{memoSet.name}</h1>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="text-green-600">{sessionCorrect}</span>
                            <span>/</span>
                            <span className="text-red-500">{sessionIncorrect}</span>
                            {totalReviewed > 0 && !isFinished && (
                                <Button variant="outline" size="sm" onClick={handleFinish}>
                                    Finish
                                </Button>
                            )}
                        </div>
                    </div>

                    {isFinished ? (
                        /* Summary */
                        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-green-200/80 bg-white/70 p-8 shadow-sm backdrop-blur-sm dark:border-green-800/50 dark:bg-black/40">
                            <h2 className="mb-6 text-2xl font-semibold">Session Complete</h2>
                            <div className="mb-6 grid grid-cols-3 gap-8 text-center">
                                <div>
                                    <p className="text-3xl font-bold">{totalReviewed}</p>
                                    <p className="text-sm text-muted-foreground">Reviewed</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-green-600">{sessionCorrect}</p>
                                    <p className="text-sm text-muted-foreground">Correct</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-red-500">{sessionIncorrect}</p>
                                    <p className="text-sm text-muted-foreground">Incorrect</p>
                                </div>
                            </div>
                            <div className="mb-8">
                                <p className="text-lg">
                                    Accuracy: <span className="font-semibold">{accuracy}%</span>
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button onClick={handleRestart}>
                                    <RotateCcw className="mr-2 size-4" />
                                    Learn Again
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={`/memo-sets/${memoSet.id}`}>Back to Set</Link>
                                </Button>
                            </div>
                        </div>
                    ) : currentCard ? (
                        /* Card */
                        <div className="flex flex-1 flex-col items-center justify-center">
                            <div
                                className="w-full rounded-2xl border-2 bg-white/80 p-8 shadow-lg backdrop-blur-sm dark:bg-black/50"
                                style={{ borderColor: memoSet.color + '40' }}
                            >
                                {/* Front */}
                                <div className="mb-6 text-center">
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Front</p>
                                    <p className="text-2xl font-medium">{currentCard.front}</p>
                                </div>

                                {/* Divider / Reveal */}
                                {revealed ? (
                                    <>
                                        <div className="my-6 border-t border-border/50" />
                                        <div className="mb-6 text-center">
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Back</p>
                                            <p className="text-2xl font-medium" style={{ color: memoSet.color }}>
                                                {currentCard.back}
                                            </p>
                                        </div>

                                        <div className="flex justify-center gap-4">
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-900/20"
                                                onClick={() => handleAnswer(false)}
                                            >
                                                <X className="size-5" />
                                                Incorrect
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                className="gap-2 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-800 dark:hover:bg-green-900/20"
                                                onClick={() => handleAnswer(true)}
                                            >
                                                <Check className="size-5" />
                                                Correct
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-center">
                                        <Button size="lg" className="gap-2" onClick={handleReveal}>
                                            <Eye className="size-5" />
                                            Show Answer
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <p className="mt-4 text-xs text-muted-foreground">
                                Card stats: <span className="text-green-600">{currentCard.correct_count}</span> correct,{' '}
                                <span className="text-red-500">{currentCard.incorrect_count}</span> incorrect
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-1 items-center justify-center text-muted-foreground">
                            No cards to learn
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
