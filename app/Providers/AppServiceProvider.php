<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Domain\Tools\Diary\Models\DiaryEntry;
use Domain\Tools\Diary\Policies\DiaryEntryPolicy;
use Domain\Tools\Flashcards\Models\MemoSet;
use Domain\Tools\Flashcards\Policies\MemoSetPolicy;
use Domain\Tools\GoalTracker\Models\Activity;
use Domain\Tools\GoalTracker\Models\Goal;
use Domain\Tools\GoalTracker\Models\Reward;
use Domain\Tools\GoalTracker\Policies\ActivityPolicy;
use Domain\Tools\GoalTracker\Policies\GoalPolicy;
use Domain\Tools\GoalTracker\Policies\RewardPolicy;
use Domain\Tools\MusicPlayer\Models\MusicFile;
use Domain\Tools\MusicPlayer\Models\Playlist;
use Domain\Tools\MusicPlayer\Policies\MusicFilePolicy;
use Domain\Tools\MusicPlayer\Policies\PlaylistPolicy;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configurePolicies();
        $this->configureFactories();
    }

    /**
     * Configure factory resolution for domain models.
     */
    protected function configureFactories(): void
    {
        Factory::guessFactoryNamesUsing(function (string $modelName): string {
            $modelBaseName = class_basename($modelName);

            return 'Database\\Factories\\'.$modelBaseName.'Factory';
        });
    }

    /**
     * Register model policies for domain classes.
     */
    protected function configurePolicies(): void
    {
        Gate::policy(Activity::class, ActivityPolicy::class);
        Gate::policy(Goal::class, GoalPolicy::class);
        Gate::policy(Reward::class, RewardPolicy::class);
        Gate::policy(MemoSet::class, MemoSetPolicy::class);
        Gate::policy(DiaryEntry::class, DiaryEntryPolicy::class);
        Gate::policy(MusicFile::class, MusicFilePolicy::class);
        Gate::policy(Playlist::class, PlaylistPolicy::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
