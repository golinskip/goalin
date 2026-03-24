import { Head, Link } from '@inertiajs/react';
import { Trophy, Gift, Target } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { dashboard, login, register } from '@/routes';

type Props = {
    auth: { user: { name: string } | null };
    canRegister: boolean;
};

export default function Welcome({ auth, canRegister }: Props) {
    return (
        <>
            <Head title="Welcome" />

            <div className="relative flex min-h-svh flex-col">
                {/* Background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/img/background.png"
                        alt=""
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                </div>

                {/* Header */}
                <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-10">
                    <div className="flex items-center gap-2">
                        <AppLogoIcon className="size-8 text-white" />
                        <span className="text-xl font-semibold text-white">Goalin</span>
                    </div>
                    <nav className="flex items-center gap-3">
                        {auth.user ? (
                            <Button asChild variant="secondary">
                                <Link href={dashboard()} prefetch>
                                    Dashboard
                                </Link>
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                                    <Link href={login()}>Log in</Link>
                                </Button>
                                {canRegister && (
                                    <Button asChild variant="secondary">
                                        <Link href={register()}>Sign up</Link>
                                    </Button>
                                )}
                            </>
                        )}
                    </nav>
                </header>

                {/* Hero */}
                <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
                    <div className="max-w-2xl space-y-6">
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                            Track Your Goals.
                            <br />
                            Reward Yourself.
                        </h1>
                        <p className="mx-auto max-w-lg text-lg text-white/85 sm:text-xl">
                            A goal tracker with a self-prize system. Set meaningful goals,
                            crush them, and unlock rewards you choose for yourself.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                            {auth.user ? (
                                <Button asChild size="lg" variant="secondary">
                                    <Link href={dashboard()} prefetch>
                                        Go to Dashboard
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button asChild size="lg" variant="secondary">
                                        <Link href={register()}>Get Started</Link>
                                    </Button>
                                    <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </main>

                {/* Feature Cards */}
                <section className="relative z-10 px-6 pb-12 lg:px-10">
                    <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
                        <div className="rounded-xl bg-white/15 p-6 text-white backdrop-blur-md">
                            <Target className="mb-3 size-8" />
                            <h3 className="mb-1 font-semibold">Set Goals</h3>
                            <p className="text-sm text-white/75">
                                Define clear, achievable goals and track your progress step by step.
                            </p>
                        </div>
                        <div className="rounded-xl bg-white/15 p-6 text-white backdrop-blur-md">
                            <Trophy className="mb-3 size-8" />
                            <h3 className="mb-1 font-semibold">Achieve Milestones</h3>
                            <p className="text-sm text-white/75">
                                Break goals into milestones and celebrate each win along the way.
                            </p>
                        </div>
                        <div className="rounded-xl bg-white/15 p-6 text-white backdrop-blur-md">
                            <Gift className="mb-3 size-8" />
                            <h3 className="mb-1 font-semibold">Earn Rewards</h3>
                            <p className="text-sm text-white/75">
                                Choose your own prizes and unlock them when you hit your targets.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
