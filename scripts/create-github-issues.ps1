# Batch create GitHub issues from CSV (PowerShell version)
#
# Prerequisites:
# 1. GitHub CLI installed (gh)
# 2. Authenticated to GitHub (gh auth login)
# 3. Repository created on GitHub
# 4. CSV file exists
#
# Usage:
#   .\scripts\create-github-issues.ps1 -Repo "owner/repo"
#
# Example:
#   .\scripts\create-github-issues.ps1 -Repo "jonge/ember-feed"

param(
    [Parameter(Mandatory=$true)]
    [string]$Repo
)

$ErrorActionPreference = "Stop"

$CsvFile = "github-issues-updated.csv"

# Check if CSV exists
if (-not (Test-Path $CsvFile)) {
    Write-Error "Error: $CsvFile not found"
    exit 1
}

# Check if authenticated
try {
    gh auth status 2>&1 | Out-Null
} catch {
    Write-Error "Not authenticated to GitHub. Run: gh auth login"
    exit 1
}

Write-Host ""
Write-Host "🚀 Creating GitHub issues for $Repo" -ForegroundColor Green
Write-Host ""

# Create milestones
Write-Host "📋 Creating milestones..." -ForegroundColor Cyan

$milestones = @(
    @{title="Phase 1: Basic App"; description="Get something visible in browser"},
    @{title="Phase 2: Data Layer"; description="Connect to database and algorithm"},
    @{title="Phase 3: News Fetching"; description="Fetch and display real news"},
    @{title="Phase 4: Learning"; description="Track engagement and personalize"},
    @{title="Phase 5: Polish"; description="Portfolio-ready and secure"},
    @{title="Future Enhancements"; description="Post-MVP features"}
)

foreach ($m in $milestones) {
    try {
        gh api "repos/$Repo/milestones" -f title="$($m.title)" -f description="$($m.description)" -f state="open" 2>&1 | Out-Null
    } catch {
        # Milestone might already exist, continue
    }
}

Write-Host "✅ Milestones created" -ForegroundColor Green
Write-Host ""

# Read and parse CSV
$issues = Import-Csv $CsvFile

$total = $issues.Count
$current = 0

Write-Host "📝 Creating $total issues..." -ForegroundColor Cyan
Write-Host ""

foreach ($issue in $issues) {
    $current++

    Write-Host "[$current/$total] Creating: $($issue.title)" -ForegroundColor Yellow

    try {
        # Create issue
        $result = gh issue create `
            --repo $Repo `
            --title $issue.title `
            --body $issue.body `
            --label $issue.labels `
            --milestone $issue.milestone `
            2>&1

        if ($result -match "^https://") {
            Write-Host "  ✅ Created: $result" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Issue may already exist or failed" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
    }

    # Rate limiting: sleep briefly
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "✅ Done! Created $total issues" -ForegroundColor Green
Write-Host ""
Write-Host "View issues:"
Write-Host "  gh issue list --repo $Repo"
Write-Host "  https://github.com/$Repo/issues"
