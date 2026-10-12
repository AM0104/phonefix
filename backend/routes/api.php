<?php

use App\Http\Controllers\Api\Admin\AdminAppointmentController;
use App\Http\Controllers\Api\Admin\AdminArticleController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminLeadController;
use App\Http\Controllers\Api\Admin\AdminReviewController;
use App\Http\Controllers\Api\Admin\AdminScheduleController;
use App\Http\Controllers\Api\Admin\AdminServiceController;
use App\Http\Controllers\Api\Admin\AdminSettingController;
use App\Http\Controllers\Api\Admin\AdminTechnicianController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\TechnicianController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
*/

// --- Публичные данные сайта ---------------------------------------------
Route::prefix('public')->group(function () {
    Route::get('site', [PublicController::class, 'site']);
    Route::get('home', [PublicController::class, 'home']);
    Route::get('services', [ServiceController::class, 'index']);
    Route::get('services/{service:slug}', [ServiceController::class, 'show']);
    Route::get('technicians', [TechnicianController::class, 'index']);
    Route::get('technicians/{technician}', [TechnicianController::class, 'show']);
    Route::get('technicians/{technician}/slots', [TechnicianController::class, 'slots']);
    Route::get('reviews', [ReviewController::class, 'index']);
    Route::get('articles', [ArticleController::class, 'index']);
    Route::get('articles/{article:slug}', [ArticleController::class, 'show']);
    Route::post('leads', [LeadController::class, 'store']);
});

// --- Регистрация и вход --------------------------------------------------
Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/login', [AuthController::class, 'login']);

// --- Личный кабинет клиента ---------------------------------------------
Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::patch('auth/profile', [AuthController::class, 'updateProfile']);

    Route::get('appointments', [AppointmentController::class, 'index']);
    Route::post('appointments', [AppointmentController::class, 'store']);
    Route::get('appointments/{appointment}', [AppointmentController::class, 'show']);
    Route::patch('appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('appointments/{appointment}/review', [ReviewController::class, 'store']);
});

// --- Админ-панель --------------------------------------------------------
Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('dashboard', [AdminDashboardController::class, 'index']);

    Route::get('appointments', [AdminAppointmentController::class, 'index']);
    Route::get('appointments/{appointment}', [AdminAppointmentController::class, 'show']);
    Route::patch('appointments/{appointment}', [AdminAppointmentController::class, 'update']);
    Route::delete('appointments/{appointment}', [AdminAppointmentController::class, 'destroy']);

    Route::apiResource('services', AdminServiceController::class)->except(['create', 'edit']);
    Route::apiResource('technicians', AdminTechnicianController::class)->except(['create', 'edit']);
    Route::apiResource('reviews', AdminReviewController::class)->only(['index', 'update', 'destroy']);
    Route::apiResource('leads', AdminLeadController::class)->only(['index', 'update', 'destroy']);
    Route::apiResource('articles', AdminArticleController::class)->except(['create', 'edit']);
    Route::apiResource('users', AdminUserController::class)->only(['index', 'store', 'update', 'destroy']);

    Route::get('schedule', [AdminScheduleController::class, 'index']);
    Route::post('schedule', [AdminScheduleController::class, 'store']);
    Route::delete('schedule/{schedule}', [AdminScheduleController::class, 'destroy']);

    Route::get('settings', [AdminSettingController::class, 'index']);
    Route::put('settings', [AdminSettingController::class, 'update']);
});