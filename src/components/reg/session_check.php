<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

$response = ['success' => false, 'user' => null];

if (isset($_SESSION['user_id'])) {
    $response['success'] = true;
    $response['user'] = [
        'id' => $_SESSION['user_id'] ?? null,
        'email' => $_SESSION['user_email'] ?? null,
        'full_name' => $_SESSION['user_name'] ?? null,
        'username' => $_SESSION['username'] ?? null,
        'profile_image' => $_SESSION['profile_image'] ?? null
    ];
} else {
    $response['success'] = false;
}

echo json_encode($response);
