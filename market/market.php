<?php
// market_api.php - Market Intelligence API Endpoint

// Load configuration
require_once 'config.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (in_array($_SERVER['HTTP_ORIGIN'] ?? '', $ALLOWED_ORIGINS) ? $_SERVER['HTTP_ORIGIN'] : $ALLOWED_ORIGINS[0]));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Initialize session
session_name(SESSION_NAME);
session_set_cookie_params(SESSION_TIMEOUT);
session_start();

// Authentication check
function authenticate() {
    if (!isset($_SESSION['user_id']) && !isset($_COOKIE['auth_token'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => getConfig('error_messages')['unauthorized']]);
        exit();
    }
}

// Rate limiting
function checkRateLimit($identifier, $limit = 100, $window = 3600) {
    $key = "rate_limit_{$identifier}";
    
    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = [
            'count' => 1,
            'reset_time' => time() + $window
        ];
    } else {
        if (time() > $_SESSION[$key]['reset_time']) {
            $_SESSION[$key] = [
                'count' => 1,
                'reset_time' => time() + $window
            ];
        } else {
            $_SESSION[$key]['count']++;
            
            if ($_SESSION[$key]['count'] > $limit) {
                http_response_code(429);
                echo json_encode(['success' => false, 'error' => getConfig('error_messages')['rate_limit']]);
                exit();
            }
        }
    }
}

class MarketAPI {
    private $apiKey;
    private $cacheDir;
    
    public function __construct() {
        $this->apiKey = ALPHA_VANTAGE_API_KEY;
        $this->cacheDir = __DIR__ . '/cache/';
        
        // Create cache directory if it doesn't exist
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0755, true);
        }
    }
    
    public function getCommodityPrices($region = null, $cropType = 'all') {
        authenticate();
        checkRateLimit('prices_' . ($_SESSION['user_id'] ?? 'anonymous'));
        
        try {
            $region = $region ?: DEFAULT_REGION;
            
            // Validate inputs
            if (!$this->isValidRegion($region)) {
                throw new Exception(getConfig('error_messages')['invalid_region']);
            }
            
            if (!$this->isValidCropType($cropType)) {
                throw new Exception(getConfig('error_messages')['invalid_crop']);
            }
            
            $commodityConfig = getConfig('commodity_config');
            $cropCategories = getConfig('crop_categories');
            
            $symbols = $cropCategories[$cropType] ?? $cropCategories['all'];
            $prices = [];
            
            foreach ($symbols as $symbol) {
                $priceData = $this->fetchCommodityPrice($symbol);
                if ($priceData) {
                    $prices[] = $priceData;
                }
            }
            
            // Apply regional adjustments
            $prices = $this->applyRegionalAdjustments($prices, $region);
            
            debugLog("Fetched prices for {$cropType} in {$region} region: " . count($prices) . " commodities");
            
            return [
                'success' => true,
                'data' => $prices,
                'region' => $region,
                'crop_type' => $cropType,
                'last_updated' => date('Y-m-d H:i:s'),
                'feature_flags' => getConfig('feature_flags')
            ];
            
        } catch (Exception $e) {
            debugLog("Error fetching commodity prices: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'feature_flags' => getConfig('feature_flags')
            ];
        }
    }
    
    private function fetchCommodityPrice($symbol) {
        $cacheKey = "price_{$symbol}_" . date('Y-m-d_H');
        $cachedData = $this->getCachedData($cacheKey);
        
        if ($cachedData && APP_ENV !== 'development') {
            debugLog("Using cached data for {$symbol}");
            return $cachedData;
        }
        
        // Try real API if feature is enabled
        if (getConfig('feature_flags')['real_time_data'] && $this->apiKey) {
            $apiData = $this->fetchFromAlphaVantage($symbol);
            if ($apiData) {
                $this->setCachedData($cacheKey, $apiData, CACHE_DURATION);
                return $apiData;
            }
        }
        
        // Fallback to mock data
        $mockData = $this->getMockCommodityData($symbol);
        $this->setCachedData($cacheKey, $mockData, CACHE_DURATION / 2); // Shorter cache for mock data
        
        return $mockData;
    }
    
    private function fetchFromAlphaVantage($symbol) {
        $commodityConfig = getConfig('commodity_config');
        $actualSymbol = $commodityConfig[$symbol]['base_symbol'] ?? $symbol;
        
        $url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={$actualSymbol}&apikey={$this->apiKey}";
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => REQUEST_TIMEOUT,
            CURLOPT_SSL_VERIFYPEER => APP_ENV === 'production'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($httpCode === 200 && $response) {
            $data = json_decode($response, true);
            
            if (isset($data['Global Quote']) && !isset($data['Note'])) { // Avoid API limit note
                $quote = $data['Global Quote'];
                
                return [
                    'commodity' => $symbol,
                    'name' => $commodityConfig[$symbol]['name'] ?? $symbol,
                    'price' => floatval($quote['05. price']),
                    'change' => floatval($quote['09. change']),
                    'change_percent' => floatval(str_replace('%', '', $quote['10. change percent'])),
                    'volume' => intval($quote['06. volume']),
                    'last_trade' => $quote['07. latest trading day'],
                    'unit' => $commodityConfig[$symbol]['unit'] ?? 'unit',
                    'source' => 'alpha_vantage'
                ];
            }
        }
        
        debugLog("Alpha Vantage API failed for {$symbol}: HTTP {$httpCode} - {$error}", 'WARNING');
        return null;
    }
    
    private function applyRegionalAdjustments($prices, $region) {
        $multipliers = getConfig('regional_multipliers');
        $multiplier = $multipliers[$region] ?? 1.0;
        
        foreach ($prices as &$price) {
            $price['regional_price'] = round($price['price'] * $multiplier, 2);
            $price['region'] = $region;
            $price['multiplier_applied'] = $multiplier;
        }
        
        return $prices;
    }
    
    private function getMockCommodityData($symbol) {
        $commodityConfig = getConfig('commodity_config');
        $basePrices = [
            'CORN' => 450.50, 'WEAT' => 620.75, 'SOYB' => 1250.25,
            'SUGAR' => 22.30, 'COFFEE' => 185.40, 'COTTON' => 85.60,
            'POTATO' => 15.75, 'TOMATO' => 28.90, 'ORANGE' => 32.45, 'APPLE' => 24.80
        ];
        
        $basePrice = $basePrices[$symbol] ?? 100.00;
        $change = (rand(-200, 200) / 100);
        $changePercent = ($change / $basePrice) * 100;
        
        return [
            'commodity' => $symbol,
            'name' => $commodityConfig[$symbol]['name'] ?? $symbol,
            'price' => $basePrice + $change,
            'change' => $change,
            'change_percent' => round($changePercent, 2),
            'volume' => rand(1000, 50000),
            'last_trade' => date('Y-m-d'),
            'unit' => $commodityConfig[$symbol]['unit'] ?? 'unit',
            'source' => 'mock_data'
        ];
    }
    
    private function isValidRegion($region) {
        $multipliers = getConfig('regional_multipliers');
        return isset($multipliers[$region]);
    }
    
    private function isValidCropType($cropType) {
        $categories = getConfig('crop_categories');
        return isset($categories[$cropType]);
    }
    
    private function getCachedData($key) {
        $cacheFile = $this->cacheDir . md5($key) . '.cache';
        
        if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_DURATION) {
            return json_decode(file_get_contents($cacheFile), true);
        }
        
        return null;
    }
    
    private function setCachedData($key, $data, $duration = null) {
        $cacheFile = $this->cacheDir . md5($key) . '.cache';
        file_put_contents($cacheFile, json_encode($data));
    }
    
    // Add other methods (getPriceTrends, getTradingAdvice) from previous implementation
    // with config integration...
    
    public function getPriceTrends($symbol = 'CORN', $period = '30days') {
        authenticate();
        checkRateLimit('trends_' . ($_SESSION['user_id'] ?? 'anonymous'));
        
        try {
            // Implementation from previous code, integrated with config
            $trends = $this->generateTrendData($symbol, $period);
            
            return [
                'success' => true,
                'symbol' => $symbol,
                'period' => $period,
                'trends' => $trends,
                'feature_flags' => getConfig('feature_flags')
            ];
            
        } catch (Exception $e) {
            debugLog("Error fetching trends for {$symbol}: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'feature_flags' => getConfig('feature_flags')
            ];
        }
    }
    
    public function getTradingAdvice($pricesData) {
        authenticate();
        checkRateLimit('advice_' . ($_SESSION['user_id'] ?? 'anonymous'));
        
        if (!getConfig('feature_flags')['trading_advice']) {
            return [
                'success' => false,
                'error' => 'Trading advice feature is disabled',
                'feature_flags' => getConfig('feature_flags')
            ];
        }
        
        try {
            $advice = [];
            $tradingParams = getConfig('trading_params');
            
            foreach ($pricesData as $commodity) {
                $recommendation = $this->analyzeCommodity($commodity, $tradingParams);
                $advice[] = [
                    'commodity' => $commodity['name'],
                    'symbol' => $commodity['commodity'],
                    'recommendation' => $recommendation['action'],
                    'confidence' => $recommendation['confidence'],
                    'reason' => $recommendation['reason'],
                    'target_price' => $recommendation['target'],
                    'current_price' => $commodity['regional_price'],
                    'analysis_params' => $tradingParams
                ];
            }
            
            return [
                'success' => true,
                'advice' => $advice,
                'generated_at' => date('Y-m-d H:i:s'),
                'feature_flags' => getConfig('feature_flags')
            ];
            
        } catch (Exception $e) {
            debugLog("Error generating trading advice: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'feature_flags' => getConfig('feature_flags')
            ];
        }
    }
    
    private function analyzeCommodity($commodity, $params) {
        $change = $commodity['change_percent'];
        $volume = $commodity['volume'];
        
        if ($change > $params['SELL_THRESHOLD']) {
            return [
                'action' => 'SELL',
                'confidence' => 'HIGH',
                'reason' => 'Strong upward momentum, consider taking profits',
                'target' => round($commodity['regional_price'] * (1 - $params['STOP_LOSS']), 2)
            ];
        } elseif ($change < $params['BUY_THRESHOLD']) {
            return [
                'action' => 'BUY',
                'confidence' => 'HIGH',
                'reason' => 'Significant price drop, potential buying opportunity',
                'target' => round($commodity['regional_price'] * (1 + $params['TARGET_PROFIT']), 2)
            ];
        } elseif ($change > 0 && $volume > $params['HIGH_VOLUME']) {
            return [
                'action' => 'HOLD',
                'confidence' => 'MEDIUM',
                'reason' => 'Moderate gains with good volume, maintain position',
                'target' => round($commodity['regional_price'] * 1.03, 2)
            ];
        } else {
            return [
                'action' => 'HOLD',
                'confidence' => 'LOW',
                'reason' => 'Market conditions neutral, wait for clearer signals',
                'target' => round($commodity['regional_price'] * 1.01, 2)
            ];
        }
    }
    
    private function generateTrendData($symbol, $period) {
        $days = (int) str_replace('days', '', $period);
        $trends = [];
        $basePrice = $this->getBasePriceForSymbol($symbol);
        
        for ($i = $days; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-$i days"));
            $variation = (rand(-100, 100) / 100);
            $price = $basePrice + $variation;
            
            $trends[] = [
                'date' => $date,
                'price' => round($price, 2),
                'volume' => rand(5000, 25000)
            ];
        }
        
        return $trends;
    }
    
    private function getBasePriceForSymbol($symbol) {
        $basePrices = [
            'CORN' => 450, 'WEAT' => 620, 'SOYB' => 1250,
            'SUGAR' => 22, 'COFFEE' => 185, 'COTTON' => 85
        ];
        
        return $basePrices[$symbol] ?? 100;
    }
}

// Handle API requests
$marketAPI = new MarketAPI();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'get_prices':
            $region = $input['region'] ?? DEFAULT_REGION;
            $cropType = $input['cropType'] ?? 'all';
            echo json_encode($marketAPI->getCommodityPrices($region, $cropType));
            break;
            
        case 'get_trends':
            $symbol = $input['symbol'] ?? 'CORN';
            $period = $input['period'] ?? '30days';
            echo json_encode($marketAPI->getPriceTrends($symbol, $period));
            break;
            
        case 'get_advice':
            $pricesData = $input['pricesData'] ?? [];
            echo json_encode($marketAPI->getTradingAdvice($pricesData));
            break;
            
        case 'get_config':
            // Allow clients to check feature flags
            echo json_encode([
                'success' => true,
                'feature_flags' => getConfig('feature_flags'),
                'app_version' => APP_VERSION,
                'app_env' => APP_ENV
            ]);
            break;
            
        default:
            echo json_encode([
                'success' => false, 
                'error' => 'Invalid action',
                'feature_flags' => getConfig('feature_flags')
            ]);
    }
} else {
    echo json_encode([
        'success' => false, 
        'error' => 'Method not allowed',
        'feature_flags' => getConfig('feature_flags')
    ]);
}
?>