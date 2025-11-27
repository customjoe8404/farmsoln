<?php
// crop-api.php - AI Crop Recommendation API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$response = ['success' => false, 'data' => null, 'error' => ''];

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    if ($action === 'get_recommendations') {
        $city = $input['city'] ?? 'Nairobi';
        $soilType = $input['soil_type'] ?? 'loam';
        $temperature = $input['temperature'] ?? 25;
        $rainfall = $input['rainfall'] ?? 80;
        $humidity = $input['humidity'] ?? 65;
        $farmSize = $input['farm_size'] ?? 5;
        
        // AI-based recommendation algorithm
        $recommendations = generateAIRecommendations($city, $soilType, $temperature, $rainfall, $humidity, $farmSize);
        
        $response['success'] = true;
        $response['data'] = $recommendations;
    } else {
        throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response);

function generateAIRecommendations($city, $soilType, $temperature, $rainfall, $humidity, $farmSize) {
    $crops = [
        'Maize' => ['optimal_temp' => [18, 32], 'optimal_rainfall' => [50, 120], 'soil_preference' => ['loam', 'clay_loam']],
        'Beans' => ['optimal_temp' => [15, 28], 'optimal_rainfall' => [40, 80], 'soil_preference' => ['loam', 'silt']],
        'Tomato' => ['optimal_temp' => [20, 30], 'optimal_rainfall' => [60, 100], 'soil_preference' => ['loam', 'sandy']],
        'Wheat' => ['optimal_temp' => [10, 25], 'optimal_rainfall' => [30, 70], 'soil_preference' => ['loam', 'clay']],
        'Rice' => ['optimal_temp' => [20, 35], 'optimal_rainfall' => [100, 200], 'soil_preference' => ['clay', 'clay_loam']],
        'Potato' => ['optimal_temp' => [15, 25], 'optimal_rainfall' => [50, 90], 'soil_preference' => ['sandy', 'loam']],
        'Sorghum' => ['optimal_temp' => [20, 35], 'optimal_rainfall' => [30, 60], 'soil_preference' => ['sandy', 'loam']],
        'Millet' => ['optimal_temp' => [22, 35], 'optimal_rainfall' => [20, 50], 'soil_preference' => ['sandy', 'silt']]
    ];
    
    $recommendations = [];
    
    foreach ($crops as $cropName => $requirements) {
        $suitability = calculateSuitability($cropName, $requirements, $temperature, $rainfall, $soilType);
        
        if ($suitability > 30) { // Only recommend if suitability > 30%
            $recommendations[] = [
                'name' => $cropName,
                'suitability' => $suitability,
                'profitability' => calculateProfitability($cropName, $suitability, $farmSize),
                'growing_days' => rand(60, 150),
                'risk_level' => $suitability > 70 ? 'low' : ($suitability > 50 ? 'medium' : 'high'),
                'water_requirement' => getWaterRequirement($cropName),
                'market_price' => getMarketPrice($cropName),
                'optimal_temp' => [
                    'min' => $requirements['optimal_temp'][0],
                    'max' => $requirements['optimal_temp'][1]
                ],
                'ai_insights' => generateAIInsight($cropName, $suitability, $city)
            ];
        }
    }
    
    // Sort by suitability (highest first)
    usort($recommendations, function($a, $b) {
        return $b['suitability'] - $a['suitability'];
    });
    
    return array_slice($recommendations, 0, 6); // Return top 6 recommendations
}

function calculateSuitability($cropName, $requirements, $temp, $rainfall, $soilType) {
    $score = 0;
    
    // Temperature suitability (40% weight)
    $tempScore = 0;
    if ($temp >= $requirements['optimal_temp'][0] && $temp <= $requirements['optimal_temp'][1]) {
        $tempScore = 100;
    } else {
        $tempDiff = min(
            abs($temp - $requirements['optimal_temp'][0]),
            abs($temp - $requirements['optimal_temp'][1])
        );
        $tempScore = max(0, 100 - ($tempDiff * 10));
    }
    $score += $tempScore * 0.4;
    
    // Rainfall suitability (30% weight)
    $rainScore = 0;
    if ($rainfall >= $requirements['optimal_rainfall'][0] && $rainfall <= $requirements['optimal_rainfall'][1]) {
        $rainScore = 100;
    } else {
        $rainDiff = min(
            abs($rainfall - $requirements['optimal_rainfall'][0]),
            abs($rainfall - $requirements['optimal_rainfall'][1])
        );
        $rainScore = max(0, 100 - ($rainDiff * 2));
    }
    $score += $rainScore * 0.3;
    
    // Soil suitability (30% weight)
    $soilScore = in_array($soilType, $requirements['soil_preference']) ? 100 : 50;
    $score += $soilScore * 0.3;
    
    return min(100, max(0, round($score)));
}

function calculateProfitability($cropName, $suitability, $farmSize) {
    $baseProfit = [
        'Maize' => 60, 'Beans' => 65, 'Tomato' => 80, 'Wheat' => 55,
        'Rice' => 70, 'Potato' => 75, 'Sorghum' => 50, 'Millet' => 45
    ];
    
    $profit = $baseProfit[$cropName] ?? 50;
    $profit = $profit * ($suitability / 100);
    $profit = $profit * (1 + ($farmSize / 100)); // Scale with farm size
    
    return min(95, max(20, round($profit)));
}

function getWaterRequirement($cropName) {
    $requirements = [
        'Maize' => 'Medium', 'Beans' => 'Medium', 'Tomato' => 'High', 'Wheat' => 'Low',
        'Rice' => 'Very High', 'Potato' => 'Medium', 'Sorghum' => 'Low', 'Millet' => 'Very Low'
    ];
    return $requirements[$cropName] ?? 'Medium';
}

function getMarketPrice($cropName) {
    $prices = [
        'Maize' => '0.35', 'Beans' => '1.20', 'Tomato' => '0.80', 'Wheat' => '0.45',
        'Rice' => '0.95', 'Potato' => '0.60', 'Sorghum' => '0.30', 'Millet' => '0.25'
    ];
    return $prices[$cropName] ?? '0.50';
}

function generateAIInsight($cropName, $suitability, $city) {
    $insights = [
        "Excellent choice for {$city} conditions with {$suitability}% suitability score",
        "Good match for current weather patterns in your region",
        "Consider this crop for optimal yield in {$city} climate",
        "Well-suited for local market demand and growing conditions",
        "Strong performer in similar soil and weather conditions"
    ];
    
    return $insights[array_rand($insights)];
}
?>