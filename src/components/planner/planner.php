<?php
// planner-api.php - Crop Planning API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';

$response = ['success' => false, 'data' => null, 'error' => ''];

session_start();

try {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $_GET['action'] ?? $input['action'] ?? '';

    switch ($action) {
        case 'get_plans':
            $response = getCropPlans();
            break;

        case 'save_plan':
            $plan = $input['plan'] ?? null;
            if (!$plan) throw new Exception('No plan provided');
            $response = saveCropPlan($plan);
            break;

        case 'edit_plan':
            $plan = $input['plan'] ?? null;
            if (!$plan || empty($plan['id'])) throw new Exception('No plan id provided for edit');
            $response = editCropPlan($plan);
            break;

        case 'delete_plan':
            $planId = $input['id'] ?? $_GET['id'] ?? null;
            if (!$planId) throw new Exception('No plan id provided for delete');
            $response = deleteCropPlan($planId);
            break;

        case 'complete_task':
            $planId = $input['planId'] ?? null;
            $taskId = $input['taskId'] ?? null;
            if (!$planId || !$taskId) throw new Exception('planId and taskId required');
            $response = completeTask($planId, $taskId);
            break;

        case 'complete_plan':
            $planId = $input['planId'] ?? null;
            if (!$planId) throw new Exception('planId required');
            $response = completePlan($planId);
            break;

        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response);

function getCropPlans()
{
    $dbConn = (new Database())->getConnection();

    // If user logged in, return their plans; otherwise return public/anonymous plans (user_id IS NULL)
    $userId = $_SESSION['user_id'] ?? null;

    try {
        if ($userId) {
            $stmt = $dbConn->prepare('SELECT * FROM crop_plans WHERE user_id = ? ORDER BY created_at DESC');
            $stmt->execute([$userId]);
        } else {
            // return anonymous plans (if any) or empty list
            $stmt = $dbConn->prepare('SELECT * FROM crop_plans WHERE user_id IS NULL ORDER BY created_at DESC');
            $stmt->execute();
        }

        $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decode tasks JSON for each plan
        foreach ($plans as &$p) {
            if (isset($p['tasks'])) {
                $p['tasks'] = json_decode($p['tasks'], true) ?: [];
            }
        }

        return ['success' => true, 'data' => $plans];
    } catch (PDOException $e) {
        return ['success' => false, 'error' => 'DB error: ' . $e->getMessage()];
    }
}

function saveCropPlan($plan)
{
    $dbConn = (new Database())->getConnection();

    $userId = $_SESSION['user_id'] ?? null;

    // Require authenticated user to save plans
    if (!$userId) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Authentication required to save plans'];
    }

    // Validate plan fields
    $errors = validatePlan($plan);
    if (!empty($errors)) {
        return ['success' => false, 'error' => 'Validation failed', 'details' => $errors];
    }

    // Normalize plan fields
    $crop_type = $plan['crop'] ?? ($plan['crop_type'] ?? '');
    $variety = $plan['variety'] ?? null;
    $crop_name = $plan['cropName'] ?? ($plan['cropName'] ?? $crop_type);
    $planting_date = $plan['plantingDate'] ?? null;
    $harvest_date = $plan['harvestDate'] ?? null;
    $area = isset($plan['area']) ? floatval($plan['area']) : 0;
    $duration = isset($plan['duration']) ? intval($plan['duration']) : null;
    $status = $plan['status'] ?? 'active';
    $notes = $plan['notes'] ?? null;
    $tasks = isset($plan['tasks']) ? json_encode($plan['tasks']) : json_encode([]);

    try {
        $stmt = $dbConn->prepare('INSERT INTO crop_plans (user_id, crop_type, variety, crop_name, planting_date, harvest_date, area, duration, status, notes, tasks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $crop_type, $variety, $crop_name, $planting_date, $harvest_date, $area, $duration, $status, $notes, $tasks]);

        $insertId = $dbConn->lastInsertId();

        // Fetch the inserted plan
        $get = $dbConn->prepare('SELECT * FROM crop_plans WHERE id = ?');
        $get->execute([$insertId]);
        $saved = $get->fetch(PDO::FETCH_ASSOC);
        if ($saved && isset($saved['tasks'])) {
            $saved['tasks'] = json_decode($saved['tasks'], true) ?: [];
        }

        return ['success' => true, 'message' => 'Crop plan saved successfully', 'data' => $saved];
    } catch (PDOException $e) {
        return ['success' => false, 'error' => 'DB save error: ' . $e->getMessage()];
    }
}

function validatePlan($plan)
{
    $errors = [];

    $crop_type = $plan['crop'] ?? ($plan['crop_type'] ?? '');
    if (!is_string($crop_type) || trim($crop_type) === '') {
        $errors[] = 'Crop type is required';
    }

    $planting_date = $plan['plantingDate'] ?? null;
    if (!$planting_date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $planting_date) || !strtotime($planting_date)) {
        $errors[] = 'Valid planting date (YYYY-MM-DD) is required';
    }

    $area = $plan['area'] ?? null;
    if (!is_numeric($area) || floatval($area) <= 0) {
        $errors[] = 'Area must be a number greater than 0';
    }

    if (isset($plan['duration']) && (!is_numeric($plan['duration']) || intval($plan['duration']) <= 0)) {
        $errors[] = 'Duration must be a positive integer';
    }

    if (isset($plan['tasks']) && !is_array($plan['tasks'])) {
        $errors[] = 'Tasks must be an array';
    } elseif (isset($plan['tasks'])) {
        foreach ($plan['tasks'] as $i => $task) {
            if (empty($task['name'])) $errors[] = "Task #{$i} missing name";
            if (empty($task['dueDate']) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $task['dueDate'])) $errors[] = "Task #{$i} has invalid dueDate";
        }
    }

    return $errors;
}

function editCropPlan($plan)
{
    $dbConn = (new Database())->getConnection();
    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Authentication required to edit plans'];
    }

    $id = $plan['id'];
    // Check ownership
    try {
        $check = $dbConn->prepare('SELECT * FROM crop_plans WHERE id = ?');
        $check->execute([$id]);
        $existing = $check->fetch(PDO::FETCH_ASSOC);
        if (!$existing) return ['success' => false, 'error' => 'Plan not found'];
        if (intval($existing['user_id']) !== intval($userId)) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Forbidden'];
        }

        // Allow partial updates; validate only fields provided
        $fields = [];
        $params = [];
        if (isset($plan['crop'])) {
            $fields[] = 'crop_type = ?';
            $params[] = $plan['crop'];
        }
        if (isset($plan['variety'])) {
            $fields[] = 'variety = ?';
            $params[] = $plan['variety'];
        }
        if (isset($plan['cropName'])) {
            $fields[] = 'crop_name = ?';
            $params[] = $plan['cropName'];
        }
        if (isset($plan['plantingDate'])) {
            $fields[] = 'planting_date = ?';
            $params[] = $plan['plantingDate'];
        }
        if (isset($plan['harvestDate'])) {
            $fields[] = 'harvest_date = ?';
            $params[] = $plan['harvestDate'];
        }
        if (isset($plan['area'])) {
            $fields[] = 'area = ?';
            $params[] = floatval($plan['area']);
        }
        if (isset($plan['duration'])) {
            $fields[] = 'duration = ?';
            $params[] = intval($plan['duration']);
        }
        if (isset($plan['status'])) {
            $fields[] = 'status = ?';
            $params[] = $plan['status'];
        }
        if (isset($plan['notes'])) {
            $fields[] = 'notes = ?';
            $params[] = $plan['notes'];
        }
        if (isset($plan['tasks'])) {
            $fields[] = 'tasks = ?';
            $params[] = json_encode($plan['tasks']);
        }

        if (empty($fields)) return ['success' => false, 'error' => 'No updatable fields provided'];

        $params[] = $id; // for WHERE
        $sql = 'UPDATE crop_plans SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $upd = $dbConn->prepare($sql);
        $upd->execute($params);

        $get = $dbConn->prepare('SELECT * FROM crop_plans WHERE id = ?');
        $get->execute([$id]);
        $saved = $get->fetch(PDO::FETCH_ASSOC);
        if ($saved && isset($saved['tasks'])) $saved['tasks'] = json_decode($saved['tasks'], true) ?: [];

        return ['success' => true, 'message' => 'Plan updated', 'data' => $saved];
    } catch (PDOException $e) {
        return ['success' => false, 'error' => 'DB update error: ' . $e->getMessage()];
    }
}

function deleteCropPlan($id)
{
    $dbConn = (new Database())->getConnection();
    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Authentication required to delete plans'];
    }

    try {
        $check = $dbConn->prepare('SELECT user_id FROM crop_plans WHERE id = ?');
        $check->execute([$id]);
        $row = $check->fetch(PDO::FETCH_ASSOC);
        if (!$row) return ['success' => false, 'error' => 'Plan not found'];
        if (intval($row['user_id']) !== intval($userId)) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Forbidden'];
        }

        $del = $dbConn->prepare('DELETE FROM crop_plans WHERE id = ?');
        $del->execute([$id]);
        return ['success' => true, 'message' => 'Plan deleted'];
    } catch (PDOException $e) {
        return ['success' => false, 'error' => 'DB delete error: ' . $e->getMessage()];
    }
}

function completeTask($planId, $taskId)
{
    $dbConn = (new Database())->getConnection();
    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Authentication required'];
    }

    try {
        $get = $dbConn->prepare('SELECT * FROM crop_plans WHERE id = ?');
        $get->execute([$planId]);
        $plan = $get->fetch(PDO::FETCH_ASSOC);
        if (!$plan) return ['success' => false, 'error' => 'Plan not found'];
        if (intval($plan['user_id']) !== intval($userId)) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Forbidden'];
        }

        $tasks = json_decode($plan['tasks'], true) ?: [];
        $found = false;
        foreach ($tasks as &$t) {
            if (strval($t['id']) === strval($taskId) || intval($t['id']) === intval($taskId)) {
                $t['completed'] = true;
                $found = true;
                break;
            }
        }
        if (!$found) return ['success' => false, 'error' => 'Task not found in plan'];

        $upd = $dbConn->prepare('UPDATE crop_plans SET tasks = ? WHERE id = ?');
        $upd->execute([json_encode($tasks), $planId]);

        // return updated plan
        $get2 = $dbConn->prepare('SELECT * FROM crop_plans WHERE id = ?');
        $get2->execute([$planId]);
        $saved = $get2->fetch(PDO::FETCH_ASSOC);
        if ($saved && isset($saved['tasks'])) $saved['tasks'] = json_decode($saved['tasks'], true) ?: [];

        return ['success' => true, 'message' => 'Task marked complete', 'data' => $saved];
    } catch (PDOException $e) {
        return ['success' => false, 'error' => 'DB error: ' . $e->getMessage()];
    }
}

function completePlan($planId)
{
    $dbConn = (new Database())->getConnection();
    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Authentication required'];
    }

    try {
        $get = $dbConn->prepare('SELECT user_id FROM crop_plans WHERE id = ?');
        $get->execute([$planId]);
        $row = $get->fetch(PDO::FETCH_ASSOC);
        if (!$row) return ['success' => false, 'error' => 'Plan not found'];
        if (intval($row['user_id']) !== intval($userId)) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Forbidden'];
        }

        $upd = $dbConn->prepare('UPDATE crop_plans SET status = ? WHERE id = ?');
        $upd->execute(['completed', $planId]);

        $get2 = $dbConn->prepare('SELECT * FROM crop_plans WHERE id = ?');
        $get2->execute([$planId]);
        $saved = $get2->fetch(PDO::FETCH_ASSOC);
        if ($saved && isset($saved['tasks'])) $saved['tasks'] = json_decode($saved['tasks'], true) ?: [];

        return ['success' => true, 'message' => 'Plan marked completed', 'data' => $saved];
    } catch (PDOException $e) {
        return ['success' => false, 'error' => 'DB error: ' . $e->getMessage()];
    }
}
