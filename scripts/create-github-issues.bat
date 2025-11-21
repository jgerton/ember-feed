@echo off
REM Batch create GitHub issues from CSV (Windows version)
REM
REM Prerequisites:
REM 1. GitHub CLI installed (gh)
REM 2. Authenticated to GitHub (gh auth login)
REM 3. Repository created on GitHub
REM 4. CSV file exists
REM
REM Usage:
REM   scripts\create-github-issues.bat owner/repo
REM
REM Example:
REM   scripts\create-github-issues.bat jonge/ember-feed

setlocal enabledelayedexpansion

REM Check arguments
if "%~1"=="" (
    echo Usage: %~nx0 owner/repo
    echo Example: %~nx0 jonge/ember-feed
    exit /b 1
)

set REPO=%~1
set CSV_FILE=github-issues-updated.csv

REM Check if CSV exists
if not exist "%CSV_FILE%" (
    echo Error: %CSV_FILE% not found
    exit /b 1
)

REM Check if authenticated
gh auth status >nul 2>&1
if errorlevel 1 (
    echo Not authenticated to GitHub. Run: gh auth login
    exit /b 1
)

echo.
echo Creating GitHub issues for %REPO%
echo.

echo Creating milestones...
echo.

REM Create milestones
gh api repos/%REPO%/milestones -f title="Phase 1: Basic App" -f description="Get something visible in browser" -f state="open" >nul 2>&1
gh api repos/%REPO%/milestones -f title="Phase 2: Data Layer" -f description="Connect to database and algorithm" -f state="open" >nul 2>&1
gh api repos/%REPO%/milestones -f title="Phase 3: News Fetching" -f description="Fetch and display real news" -f state="open" >nul 2>&1
gh api repos/%REPO%/milestones -f title="Phase 4: Learning" -f description="Track engagement and personalize" -f state="open" >nul 2>&1
gh api repos/%REPO%/milestones -f title="Phase 5: Polish" -f description="Portfolio-ready and secure" -f state="open" >nul 2>&1
gh api repos/%REPO%/milestones -f title="Future Enhancements" -f description="Post-MVP features" -f state="open" >nul 2>&1

echo Milestones created
echo.

echo Creating issues from CSV...
echo.

REM Note: Windows batch doesn't handle CSV parsing well
REM Better to use PowerShell or Python for CSV processing
echo For Windows, please use PowerShell version: scripts\create-github-issues.ps1
echo Or manually create issues from the CSV file.
echo.
echo CSV file location: %CSV_FILE%
echo.

pause
