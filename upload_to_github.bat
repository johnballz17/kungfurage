@echo off
setlocal enabledelayedexpansion
title Carpe's Kung Fu Rage - GitHub Auto-Uploader
cd /d "%~dp0"

set "REPO_URL=https://github.com/johnballz17/kungfurage.git"
set "BRANCH=main"

echo ========================================================
echo    CARPE'S KUNG FU RAGE - AUTOMATIC GITHUB UPLOADER
echo ========================================================
echo Target: %REPO_URL%
echo Branch: %BRANCH%
echo.

:: 1. Check Git Installation
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in your system PATH.
    echo Please install Git for Windows from https://git-scm.com/
    echo.
    pause
    exit /b 1
)

:: 2. Ensure Git Repository Initialized
if not exist ".git" (
    echo [1/5] Initializing local Git repository...
    git init
    git branch -M %BRANCH%
) else (
    echo [1/5] Local Git repository detected.
)

:: Ensure Git identity configured
git config user.name >nul 2>&1
if errorlevel 1 (
    git config user.name "johnballz17"
    git config user.email "64759767+johnballz17@users.noreply.github.com"
)

:: 3. Configure Remote URL
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [2/5] Setting remote origin to %REPO_URL%...
    git remote add origin %REPO_URL%
) else (
    echo [2/5] Updating remote origin to %REPO_URL%...
    git remote set-url origin %REPO_URL%
)
git branch -M %BRANCH%

:: 4. Stage Changes
echo [3/5] Staging all files...
git add -A

:: 5. Commit Changes if any exist
git diff --cached --quiet
if errorlevel 1 (
    echo [4/5] Changes detected. Preparing commit...
    if not "%~1"=="" (
        set "COMMIT_MSG=%~1"
    ) else (
        echo.
        set /p "COMMIT_MSG=Enter commit message (press Enter for auto-timestamp): "
        if "!COMMIT_MSG!"=="" set "COMMIT_MSG=Update Carpe's Kung Fu Rage [%DATE% %TIME%]"
    )
    git commit -m "!COMMIT_MSG!"
) else (
    echo [4/5] No new local changes to commit.
)

:: 6. Push to GitHub
echo [5/5] Uploading to GitHub (%BRANCH%)...
git push -u origin %BRANCH%
if errorlevel 1 (
    echo.
    echo [INFO] Push encountered conflicts or needs rebase. Attempting rebase pull...
    git pull --rebase origin %BRANCH%
    git push -u origin %BRANCH%
)

if errorlevel 1 (
    echo.
    echo ========================================================
    echo [ERROR] Upload to GitHub failed.
    echo 1. Verify you have push access to:
    echo    %REPO_URL%
    echo 2. Verify you are authenticated with GitHub:
    echo    Run 'gh auth login' or enter your GitHub credentials.
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo [SUCCESS] Carpe's Kung Fu Rage successfully uploaded!
    echo View repository: %REPO_URL%
    echo ========================================================
)

echo.
pause
