@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

REM Determine repo root (directory of this script)
set "ROOT=%~dp0"
set "COMPOSE_FILE=%ROOT%infrastructure\docker-compose.yml"

REM Pick docker compose command (prefer new syntax)
call :detect_compose
if errorlevel 1 (
  echo [ERROR] Docker is not available or not in PATH.
  exit /b 1
)

if "%~1"=="" goto :cmd_up
if /I "%~1"=="up" goto :cmd_up
if /I "%~1"=="restart" goto :cmd_restart
if /I "%~1"=="down" goto :cmd_down
if /I "%~1"=="logs" goto :cmd_logs
if /I "%~1"=="ps" goto :cmd_ps
if /I "%~1"=="seed" goto :cmd_seed
if /I "%~1"=="help" goto :cmd_help

echo Unknown command "%~1"
goto :cmd_help

:cmd_help
echo.
echo Usage: run.bat ^<command^>
echo   up        Build and start stack, run DB migrations (default)
echo   restart   Restart backend and frontend services
echo   down      Stop and remove stack (volumes preserved)
echo   logs      Tail backend logs
echo   ps        Show service status
echo   seed      Seed sample users (requires running backend container)
echo   help      Show this help
echo.
exit /b 0

:cmd_up
echo [INFO] Using compose file: %COMPOSE_FILE%
"%COMPOSE_CMD%" -f "%COMPOSE_FILE%" up -d --build
if errorlevel 1 (
  echo [ERROR] Failed to start Docker Compose stack.
  exit /b 1
)

echo [INFO] Applying Prisma migrations in backend container...
REM Retry migrate deploy a few times while DB initializes
set /a ATTEMPTS=0
:migrate_retry
set /a ATTEMPTS+=1
"%COMPOSE_CMD%" -f "%COMPOSE_FILE%" exec -T backend npx prisma migrate deploy 1>nul 2>nul
if errorlevel 1 (
  if !ATTEMPTS! LSS 10 (
    echo   [WAIT] Database not ready yet (attempt !ATTEMPTS!/10). Retrying in 3s...
    call :sleep 3
    goto :migrate_retry
  ) else (
    echo [WARN] Could not run migrations automatically. You can run them later with:
    echo        "%COMPOSE_CMD%" -f "%COMPOSE_FILE%" exec -T backend npx prisma migrate deploy
  )
)

echo.
echo [OK] Stack is up.
echo - API:      http://localhost:4000  (Swagger: http://localhost:4000/docs)
echo - Frontend: http://localhost:5173
echo.
exit /b 0

:cmd_restart
echo [INFO] Restarting backend and frontend services...
"%COMPOSE_CMD%" -f "%COMPOSE_FILE%" up -d --build
if errorlevel 1 (
  echo [ERROR] Failed to (re)build services.
  exit /b 1
)
"%COMPOSE_CMD%" -f "%COMPOSE_FILE%" restart backend frontend
if errorlevel 1 (
  echo [WARN] Restart command reported an error; services may still be running.
)
echo [OK] Restart complete.
exit /b 0

:cmd_down
echo [INFO] Stopping and removing containers (volumes preserved)...
"%COMPOSE_CMD%" -f "%COMPOSE_FILE%" down
exit /b %ERRORLEVEL%

:cmd_logs
echo [INFO] Tailing backend logs (Ctrl+C to stop)...
"%COMPOSE_CMD%" -f "%COMPOSE_FILE%" logs -f backend
exit /b %ERRORLEVEL%

:cmd_ps
"%COMPOSE_CMD%" -f "%COMPOSE_FILE%" ps
exit /b %ERRORLEVEL%

:cmd_seed
echo [INFO] Running seed script inside backend container...
"%COMPOSE_CMD%" -f "%COMPOSE_FILE%" exec -T backend node scripts/seed.js
exit /b %ERRORLEVEL%

:detect_compose
for /f "delims=" %%A in ('where docker 2^>nul') do set "HAVE_DOCKER=1"
if not defined HAVE_DOCKER (
  exit /b 1
)

REM Try new docker compose
docker compose version 1>nul 2>nul
if not errorlevel 1 (
  set "COMPOSE_CMD=docker compose"
  exit /b 0
)

REM Fallback to classic docker-compose
for /f "delims=" %%A in ('where docker-compose 2^>nul') do set "HAVE_DC=1"
if defined HAVE_DC (
  set "COMPOSE_CMD=docker-compose"
  exit /b 0
)

exit /b 1

:sleep
REM Usage: call :sleep <seconds>
setlocal
set "_S=%~1"
REM Ping loop for approximate sleep
ping -n %_S% 127.0.0.1 >nul
endlocal & exit /b 0

endlocal
