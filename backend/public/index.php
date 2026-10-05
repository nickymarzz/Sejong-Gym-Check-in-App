<?php

define('LARAVEL_START', microtime(true));

if (file_exists(__DIR__.'/../vendor/autoload.php')) {
    require __DIR__.'/../vendor/autoload.php';
}

$app = require_once __DIR__.'/../bootstrap/app.php';

$request = Illuminate\Http\Request::capture();
$response = $app->handleRequest($request);
if ($response) {
    $response->send();
}
$app->terminate($request, $response);
