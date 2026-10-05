<?php

namespace App\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;

class RouteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Laravel 11 routes are configured in bootstrap/app.php via `api:` option.
        // This provider is kept for IDE compatibility and custom route binding.
    }
}
