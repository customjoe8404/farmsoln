<?php
// planner-api.php - Crop Planning API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$response = ['success' => false, 'data' => null, 'error' => ''];

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? $input['action'] ?? '';

    switch($action) {
        case 'get_plans':
            $response = getCropPlans();
            break;
            
        case 'save_plan':
            $response = saveCropPlan($input['plan']);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response);

function getCropPlans() {
    // In a real application, this would fetch from database
    return [
        'success' => true,
        'data' => []
    ];
}

function saveCropPlan($plan) {
    // In a real application, this would save to database
    return [
        'success' => true,
        'message' => 'Crop plan saved successfully',
        'data' => $plan
    ];
}
?>