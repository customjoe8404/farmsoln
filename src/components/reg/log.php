<?php
// login.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$response = array('success' => false, 'message' => '');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    if (empty($email) || empty($password)) {
        throw new Exception('Please fill in all fields');
    }
    $database = new Database();
    $db = $database->getConnection();
    $query = "SELECT id, username, email, password_hash, full_name, profile_image, phone, location, farm_size, is_active, last_login, created_at, updated_at FROM system_users WHERE email = ? AND is_active = 1";
    $stmt = $db->prepare($query);
    $stmt->execute([$email]);
    if ($stmt->rowCount() === 1) {
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (password_verify($password, $user['password_hash'])) {
            $update_login = $db->prepare("UPDATE system_users SET last_login = NOW() WHERE id = ?");
            $update_login->execute([$user['id']]);
            unset($user['password_hash']);
            $response['success'] = true;
            $response['message'] = 'Login successful!';
            $response['user'] = $user;
            $response['token'] = base64_encode($user['id'] . ':' . $user['email']);
            session_start();
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_name'] = $user['full_name'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['profile_image'] = $user['profile_image'];
        } else {
            throw new Exception('Invalid email or password');
        }
    } else {
        throw new Exception('Invalid email or password');
    }
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    $response['message'] = 'Login failed. Please try again.';
}
echo json_encode($response);
