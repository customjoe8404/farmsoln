<?php
// run_cleanup.php - execute cleanup SQL to remove test user and integration plans
require_once __DIR__ . '/../../src/config/database.php';

$db = (new Database())->getConnection();
if (!$db) {
    echo "DB connection failed\n";
    exit(1);
}

try {
    $sql1 = "DELETE FROM system_users WHERE email = 'testuser+smoketest@example.com'";
    $stmt1 = $db->prepare($sql1);
    $stmt1->execute();
    $count1 = $stmt1->rowCount();

    $sql2 = "DELETE FROM crop_plans WHERE notes LIKE '%integration test%'";
    $stmt2 = $db->prepare($sql2);
    $stmt2->execute();
    $count2 = $stmt2->rowCount();

    echo "Deleted $count1 test user(s) and $count2 integration plan(s)\n";
} catch (PDOException $e) {
    echo "Cleanup failed: " . $e->getMessage() . "\n";
    exit(2);
}
