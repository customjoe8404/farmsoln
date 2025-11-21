<?php
// alerts-api.php - Farm Alerts API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$response = ['success' => false, 'data' => null, 'error' => ''];

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? $input['action'] ?? '';

    switch($action) {
        case 'get_alerts':
            $response = getAlerts();
            break;
            
        case 'check_alerts':
            $response = checkNewAlerts();
            break;
            
        case 'mark_read':
            $response = markAlertAsRead($input['alert_id']);
            break;
            
        case 'resolve_alert':
            $response = resolveAlert($input['alert_id']);
            break;
            
        case 'mark_all_read':
            $response = markAllAlertsRead();
            break;
            
        case 'clear_resolved':
            $response = clearResolvedAlerts();
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response);

function getAlerts() {
    // In a real application, this would fetch from database
    return [
        'success' => true,
        'data' => []
    ];
}

function checkNewAlerts() {
    // Simulate checking for new alerts
    $newAlerts = [];
    
    // 20% chance of having new alerts
    if (rand(1, 5) === 1) {
        $alertTypes = [
            [
                'title' => 'Weather Alert - Frost Warning',
                'message' => 'Frost expected overnight. Protect sensitive crops with covers or irrigation.',
                'severity' => 'warning',
                'source' => 'Weather Service'
            ],
            [
                'title' => 'Market Opportunity',
                'message' => 'Bean prices have increased by 12% this week. Consider harvesting and selling.',
                'severity' => 'info',
                'source' => 'Market Intelligence'
            ]
        ];
        
        $randomAlert = $alertTypes[array_rand($alertTypes)];
        $newAlerts[] = [
            'id' => time(),
            ...$randomAlert,
            'timestamp' => date('c'),
            'read' => false,
            'resolved' => false
        ];
    }
    
    return [
        'success' => true,
        'data' => $newAlerts
    ];
}

function markAlertAsRead($alertId) {
    return ['success' => true, 'message' => 'Alert marked as read'];
}

function resolveAlert($alertId) {
    return ['success' => true, 'message' => 'Alert resolved'];
}

function markAllAlertsRead() {
    return ['success' => true, 'message' => 'All alerts marked as read'];
}

function clearResolvedAlerts() {
    return ['success' => true, 'message' => 'Resolved alerts cleared'];
}
?>