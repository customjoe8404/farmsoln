#!/usr/bin/env bash
# Simple integration test: login -> save -> edit -> complete task -> complete plan -> delete -> cleanup
BASE="http://127.0.0.1:8000"
COOKIEJAR=$(pwd)/cookies_test.txt
rm -f "$COOKIEJAR"

echo "1) Login"
curl -s -c "$COOKIEJAR" -X POST -H "Content-Type: application/json" -d '{"email":"testuser+smoketest@example.com","password":"pass123"}' "$BASE/src/components/reg/log.php" | sed -n '1,200p'

echo "\n2) Save plan"
SAVE=$(curl -s -b "$COOKIEJAR" -X POST -H "Content-Type: application/json" -d '{"action":"save_plan","plan":{"crop":"beans","variety":"intvar","cropName":"Beans","plantingDate":"2025-12-15","harvestDate":"2026-02-15","area":1.0,"duration":60,"status":"active","notes":"integration test","tasks":[{"id":101,"name":"Planting","dueDate":"2025-12-16","completed":false}]}}' "$BASE/src/components/planner/planner.php")
echo "$SAVE" | sed -n '1,200p'
PLAN_ID=$(echo "$SAVE" | sed -n '1,200p' | python -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")

echo "\n3) Edit plan (area -> 2.0)"
curl -s -b "$COOKIEJAR" -X POST -H "Content-Type: application/json" -d "{\"action\":\"edit_plan\",\"plan\":{\"id\":$PLAN_ID,\"area\":2.0,\"notes\":\"updated notes\"}}" "$BASE/src/components/planner/planner.php" | sed -n '1,200p'

echo "\n4) Complete task"
curl -s -b "$COOKIEJAR" -X POST -H "Content-Type: application/json" -d "{\"action\":\"complete_task\",\"planId\":$PLAN_ID,\"taskId\":101}" "$BASE/src/components/planner/planner.php" | sed -n '1,200p'

echo "\n5) Complete plan"
curl -s -b "$COOKIEJAR" -X POST -H "Content-Type: application/json" -d "{\"action\":\"complete_plan\",\"planId\":$PLAN_ID}" "$BASE/src/components/planner/planner.php" | sed -n '1,200p'

echo "\n6) Delete plan"
curl -s -b "$COOKIEJAR" -X POST -H "Content-Type: application/json" -d "{\"action\":\"delete_plan\",\"id\":$PLAN_ID}" "$BASE/src/components/planner/planner.php" | sed -n '1,200p'

echo "\nDone. Cookie jar: $COOKIEJAR"
