<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row, edited by an admin: how subscribers can reach the company.
        Schema::create('company_info', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 60)->nullable();
            $table->string('mobile', 60)->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('office_hours')->nullable();
            $table->text('how_to_pay')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_info');
    }
};
