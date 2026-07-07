<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan', function (Blueprint $table) {
            $table->id('plan_id');
            $table->string('plan_name');
            $table->decimal('monthly_rate', 8, 2);
            $table->text('description')->nullable();
            $table->unsignedInteger('speed_mbps')->nullable();
            $table->enum('status', ['Active', 'Inactive'])->default('Active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan');
    }
};