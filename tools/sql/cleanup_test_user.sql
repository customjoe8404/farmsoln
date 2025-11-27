-- Delete the smoke test user created during integration tests
DELETE FROM system_users WHERE email = 'testuser+smoketest@example.com';
-- Optionally delete any anonymous/demo plans left by tests
DELETE FROM crop_plans WHERE notes LIKE '%integration test%';
