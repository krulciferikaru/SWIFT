<?php

namespace Tests\Unit;

use App\Support\DeviceLabel;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DeviceLabelTest extends TestCase
{
    public static function agents(): array
    {
        return [
            'chrome on windows' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Chrome on Windows'],
            'edge on windows' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0', 'Edge on Windows'],
            'firefox on linux' => ['Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0', 'Firefox on Linux'],
            'safari on iphone' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', 'Safari on iPhone'],
            'chrome on android' => ['Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', 'Chrome on Android'],
            'safari on mac' => ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', 'Safari on Mac'],
            'nothing' => ['', 'Unknown device'],
            'something odd' => ['curl/8.0', 'Unknown device'],
        ];
    }

    #[DataProvider('agents')]
    public function test_it_names_the_browser_and_system(string $agent, string $expected): void
    {
        $this->assertSame($expected, DeviceLabel::from($agent));
    }

    public function test_it_hides_the_end_of_a_network_address(): void
    {
        $this->assertSame('203.0.113.•', DeviceLabel::maskedIp('203.0.113.45'));
        $this->assertSame('2001:db8:85a3:…', DeviceLabel::maskedIp('2001:db8:85a3:8d3:1319:8a2e:370:7348'));
        $this->assertNull(DeviceLabel::maskedIp(null));
    }
}
