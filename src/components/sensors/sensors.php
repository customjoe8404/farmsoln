<?php
// sensors-api.php - IoT Sensor Data API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$response = ['success' => false, 'data' => null, 'error' => ''];

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? $input['action'] ?? '';

    switch($action) {
        case 'get_sensors':
            $response = getSensorData();
            break;
            
        case 'start_scan':
            $response = simulateFieldScan();
            break;
            
        case 'refresh':
            $response = refreshSensorData();
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response);

function getSensorData() {
    // In a real application, this would fetch from database
    return [
        'success' => true,
        'data' => generateSensorData()
    ];
}

function simulateFieldScan() {
    // Simulate sensor data collection
    sleep(2); // Simulate scan time
    
    return [
        'success' => true,
        'data' => generateSensorData(),
        'message' => 'Field scan completed successfully'
    ];
}

function refreshSensorData() {
    return [
        'success' => true,
        'data' => generateSensorData(),
        'message' => 'Sensor data refreshed'
    ];
}

function generateSensorData() {
    $sensors = [
        [
            'type' => 'soil_moisture',
            'value' => rand(30, 70),
            'unit' => '%',
            'status' => 'optimal'
        ],
        [
            'type' => 'temperature',
            'value' => rand(18, 32),
            'unit' => '°C',
            'status' => 'optimal'
        ],
        [
            'type' => 'humidity',
            'value' => rand(50, 80),
            'unit' => '%',
            'status' => 'optimal'
        ],
        [
            'type' => 'ph',
            'value' => round(rand(55, 85) / 10, 1),
            'unit' => 'pH',
            'status' => 'good'
        ],
        [
            'type' => 'nitrogen',
            'value' => rand(30, 60),
            'unit' => 'ppm',
            'status' => 'good'
        ],
        [
            'type' => 'phosphorus',
            'value' => rand(25, 45),
            'unit' => 'ppm',
            'status' => 'optimal'
        ],
        [
            'type' => 'potassium',
            'value' => rand(35, 55),
            'unit' => 'ppm',
            'status' => 'optimal'
        ],
        [
            'type' => 'light',
            'value' => rand(70, 95),
            'unit' => '%',
            'status' => 'optimal'
        ]
    ];

    // Add some random variation to simulate real sensors
    foreach ($sensors as &$sensor) {
        $variation = rand(-5, 5);
        $sensor['value'] += $variation;
        
        // Update status based on value ranges
        $sensor['status'] = determineSensorStatus($sensor['type'], $sensor['value']);
    }

    return $sensors;
}

function determineSensorStatus($type, $value) {
    $ranges = [
        'soil_moisture' => ['optimal' => [30, 70], 'good' => [20, 80]],
        'temperature' => ['optimal' => [18, 32], 'good' => [15, 35]],
        'ph' => ['optimal' => [6.0, 7.5], 'good' => [5.5, 8.0]],
        'nitrogen' => ['optimal' => [40, 60], 'good' => [30, 70]]
    ];

    if (isset($ranges[$type])) {
        if ($value >= $ranges[$type]['optimal'][0] && $value <= $ranges[$type]['optimal'][1]) {
            return 'optimal';
        } elseif ($value >= $ranges[$type]['good'][0] && $value <= $ranges[$type]['good'][1]) {
            return 'good';
        }
    }
    
    return 'poor';
}
?>