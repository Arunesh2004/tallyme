@echo off
call npx ts-node queue-evidence.ts > step1-10.txt 2>&1
docker stop tallyme-redis-1
call npx ts-node queue-evidence-failure.ts > step11.txt 2>&1
docker start tallyme-redis-1
timeout /t 5
call npx ts-node queue-evidence-persistence.ts > step13.txt 2>&1

type step1-10.txt
echo ====== STEP 11 ======
type step11.txt
echo ====== STEP 13 ======
type step13.txt
