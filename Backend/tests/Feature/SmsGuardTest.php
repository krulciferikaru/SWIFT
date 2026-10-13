<?php

namespace Tests\Feature;

use App\Services\PhilSmsService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Texts must never leave a developer's machine by accident. */
class SmsGuardTest extends TestCase
{
    public function test_nothing_is_sent_when_texts_are_turned_off(): void
    {
        Http::fake();
        config(['services.philsms.enabled' => false, 'services.philsms.token' => 'a-real-looking-token']);

        $result = app(PhilSmsService::class)->send('639171112222', 'Hello');

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('turned off', $result['message']);
        Http::assertNothingSent();
    }

    public function test_texts_go_out_when_they_are_turned_on(): void
    {
        Http::fake(['*' => Http::response(['status' => 'success'])]);
        config(['services.philsms.enabled' => true, 'services.philsms.token' => 'a-real-looking-token']);

        $this->assertTrue(app(PhilSmsService::class)->send('639171112222', 'Hello')['success']);
        Http::assertSentCount(1);
    }
}
