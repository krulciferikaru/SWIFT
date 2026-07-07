<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriber', function (Blueprint $table) {
            $table->id('subscriber_id');
            $table->foreignId('plan_id')->nullable()->constrained('plan', 'plan_id')->nullOnDelete();
            $table->string('name');
            $table->string('address')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('email')->nullable();
            $table->string('mac_address')->nullable();
            $table->date('connection_date')->nullable();
            $table->enum('status', ['Active', 'Unpaid', 'Disconnected'])->default('Unpaid');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriber');
    }
};