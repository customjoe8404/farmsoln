<?php
// config.php - Configuration file for Market Intelligence



// config.php - Configuration file for Market Intelligence


// API Configuration
// Prefer environment variables for API keys in production. Set these in your shell
// (example: `export OPENWEATHER_API_KEY=your_key_here`) or place them here for local testing.
// API keys (set directly since .env / environment variables are not used)
// Replace the placeholders below with your real API keys if you have them.
define('ALPHA_VANTAGE_API_KEY', 'YOUR_ALPHAVANTAGE_API_KEY');
// Weather API (OpenWeatherMap) - leave blank to use Open-Meteo fallback
define('OPENWEATHER_API_KEY', 'YOUR_OPENWEATHER_API_KEY');
define('OPENWEATHER_DEFAULT_UNITS', 'metric');

// Application Settings
define('APP_VERSION', '1.0.0');
define('APP_ENV', 'development'); // 'development' or 'production'
define('APP_DEBUG', true);

// Market Data Settings
define('DEFAULT_REGION', 'local');
define('CACHE_DURATION', 300); // 5 minutes in seconds
define('REQUEST_TIMEOUT', 10);

// Regional Price Multipliers
$REGIONAL_MULTIPLIERS = [
    'local' => 1.0,
    'regional' => 1.1,
    'national' => 1.2,
    'international' => 1.3
];

// Commodity Configuration
$COMMODITY_CONFIG = [
    'CORN' => [
        'name' => 'Corn',
        'category' => 'grains',
        'unit' => 'bushel',
        'base_symbol' => 'ZC=F'
    ],
    'WEAT' => [
        'name' => 'Wheat',
        'category' => 'grains',
        'unit' => 'bushel',
        'base_symbol' => 'ZW=F'
    ],
    'SOYB' => [
        'name' => 'Soybeans',
        'category' => 'grains',
        'unit' => 'bushel',
        'base_symbol' => 'ZS=F'
    ],
    'SUGAR' => [
        'name' => 'Sugar',
        'category' => 'cash',
        'unit' => 'pound',
        'base_symbol' => 'SB=F'
    ],
    'COFFEE' => [
        'name' => 'Coffee',
        'category' => 'cash',
        'unit' => 'pound',
        'base_symbol' => 'KC=F'
    ],
    'COTTON' => [
        'name' => 'Cotton',
        'category' => 'cash',
        'unit' => 'pound',
        'base_symbol' => 'CT=F'
    ]
];

// Crop Type Mapping
$CROP_CATEGORIES = [
    'all' => ['CORN', 'WEAT', 'SOYB', 'SUGAR', 'COFFEE', 'COTTON'],
    'grains' => ['CORN', 'WEAT', 'SOYB'],
    'vegetables' => ['POTATO', 'TOMATO'],
    'fruits' => ['ORANGE', 'APPLE'],
    'cash' => ['SUGAR', 'COFFEE', 'COTTON']
];

// Trading Parameters
$TRADING_PARAMS = [
    'BUY_THRESHOLD' => -2.0, // Percentage change to trigger BUY
    'SELL_THRESHOLD' => 2.0, // Percentage change to trigger SELL
    'HIGH_VOLUME' => 20000,
    'TARGET_PROFIT' => 0.08, // 8% target profit for BUY
    'STOP_LOSS' => 0.05 // 5% stop loss for SELL
];

// Error Messages
$ERROR_MESSAGES = [
    'api_failure' => 'Unable to fetch market data. Please try again later.',
    'invalid_region' => 'Invalid region specified.',
    'invalid_crop' => 'Invalid crop category specified.',
    'unauthorized' => 'Authentication required.',
    'rate_limit' => 'Rate limit exceeded. Please wait before making another request.'
];

// Logging Configuration
define('LOG_ENABLED', true);
define('LOG_FILE', __DIR__ . '/logs/market_intelligence.log');
// LOG_LEVEL is not currently used; keep logging enabled via LOG_ENABLED

// CORS Configuration
$ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'https://yourdomain.com'
];

// Session Configuration
define('SESSION_TIMEOUT', 3600); // 1 hour in seconds
define('SESSION_NAME', 'aeterna_market');

// Feature Flags
$FEATURE_FLAGS = [
    'real_time_data' => true,
    'trading_advice' => true,
    'price_alerts' => false,
    'portfolio_tracking' => false,
    'export_reports' => true
];

// Utility function to get configuration
function getConfig($key, $default = null)
{
    global $COMMODITY_CONFIG, $CROP_CATEGORIES, $REGIONAL_MULTIPLIERS, $TRADING_PARAMS, $ERROR_MESSAGES, $FEATURE_FLAGS;

    $configs = [
        'commodity_config' => $COMMODITY_CONFIG,
        'crop_categories' => $CROP_CATEGORIES,
        'regional_multipliers' => $REGIONAL_MULTIPLIERS,
        'trading_params' => $TRADING_PARAMS,
        'error_messages' => $ERROR_MESSAGES,
        'feature_flags' => $FEATURE_FLAGS
    ];

    return $configs[$key] ?? $default;
}

// Debug function
function debugLog($message, $level = 'INFO')
{
    if (APP_DEBUG && LOG_ENABLED) {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] [$level] $message" . PHP_EOL;

        if (LOG_FILE && is_writable(dirname(LOG_FILE))) {
            file_put_contents(LOG_FILE, $logMessage, FILE_APPEND | LOCK_EX);
        } else {
            error_log($logMessage);
        }
    }
}
