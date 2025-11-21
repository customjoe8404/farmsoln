<?php
// reg.php - Fixed version
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

include 'config.php';

$response = array('success' => false, 'message' => '');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method');
    }

    // Get form data
    $full_name = trim($_POST['full_name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';

    // Basic validation
    if (empty($full_name) || empty($email) || empty($password) || empty($confirm_password)) {
        throw new Exception('All fields are required');
    }

    if ($password !== $confirm_password) {
        throw new Exception('Passwords do not match');
    }

    if (strlen($password) < 6) {
        throw new Exception('Password must be at least 6 characters');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Please enter a valid email address');
    }

    // Handle file upload
    $profile_image = null;
    $has_uploaded_photo = false;
    
    if (isset($_FILES['portfolio_photo']) && $_FILES['portfolio_photo']['error'] === UPLOAD_ERR_OK) {
        $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        $file_type = $_FILES['portfolio_photo']['type'];
        $file_size = $_FILES['portfolio_photo']['size'];
        $file_tmp = $_FILES['portfolio_photo']['tmp_name'];
        
        // Validate file type
        if (!in_array($file_type, $allowed_types)) {
            throw new Exception('Please upload a valid image (JPEG, PNG, GIF)');
        }

        // Validate file size (max 5MB)
        if ($file_size > 5 * 1024 * 1024) {
            throw new Exception('Image size must be less than 5MB');
        }

        // Validate image dimensions
        $image_info = getimagesize($file_tmp);
        if (!$image_info) {
            throw new Exception('Invalid image file');
        }

        // Create uploads directory if it doesn't exist
        if (!is_dir('uploads')) {
            mkdir('uploads', 0755, true);
        }

        // Generate unique filename
        $file_extension = pathinfo($_FILES['portfolio_photo']['name'], PATHINFO_EXTENSION);
        if (empty($file_extension)) {
            $file_extension = 'jpg';
        }
        
        $profile_image = 'user_' . time() . '_' . uniqid() . '.' . $file_extension;
        $upload_path = 'uploads/' . $profile_image;

        if (move_uploaded_file($file_tmp, $upload_path)) {
            $profile_image = 'uploads/' . $profile_image;
            $has_uploaded_photo = true;
        } else {
            throw new Exception('Failed to upload image');
        }
    }

    // Check if email already exists
    $database = new Database();
    $db = $database->getConnection();

    $check_email = $db->prepare("SELECT id FROM users WHERE email = ?");
    $check_email->execute([$email]);
    
    if ($check_email->rowCount() > 0) {
        throw new Exception('Email already registered');
    }

    // Generate username from email
    $username = strtolower(explode('@', $email)[0]);
    
    // Check if username exists, if so, append random number
    $check_username = $db->prepare("SELECT id FROM users WHERE username = ?");
    $check_username->execute([$username]);
    if ($check_username->rowCount() > 0) {
        $username = $username . '_' . rand(100, 999);
    }

    // Hash password
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    // Insert user into database
    $query = "INSERT INTO users (username, email, password_hash, full_name, profile_image, is_active, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())";
    $stmt = $db->prepare($query);
    
    if ($stmt->execute([$username, $email, $password_hash, $full_name, $profile_image])) {
        // Get the newly created user
        $user_id = $db->lastInsertId();
        $get_user = $db->prepare("SELECT id, username, email, full_name, profile_image, phone, location, farm_size, is_active, last_login, created_at, updated_at 
                                 FROM users WHERE id = ?");
        $get_user->execute([$user_id]);
        $user = $get_user->fetch(PDO::FETCH_ASSOC);

        $response['success'] = true;
        $response['message'] = 'Registration successful!' . ($has_uploaded_photo ? ' Profile photo uploaded.' : '');
        $response['user'] = $user;
        $response['token'] = base64_encode($user_id . ':' . $email);
        $response['has_photo'] = $has_uploaded_photo;
        
        // Start session
        session_start();
        $_SESSION['user_id'] = $user_id;
        $_SESSION['user_email'] = $email;
        $_SESSION['user_name'] = $full_name;
        $_SESSION['username'] = $username;
        $_SESSION['profile_image'] = $profile_image;
        
    } else {
        throw new Exception('Failed to create account');
    }

} catch (Exception $e) {
    $response['message'] = $e->getMessage();
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    $response['message'] = 'Registration failed. Please try again.';
}

echo json_encode($response);
?>