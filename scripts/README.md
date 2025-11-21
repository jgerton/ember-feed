# GitHub Issue Creation Scripts

Batch create all project issues from CSV file.

## Prerequisites

1. **GitHub CLI installed** and authenticated:
   ```bash
   gh --version  # Should show version
   gh auth login  # If not authenticated
   ```

2. **Repository created** on GitHub (empty is fine)

3. **CSV file exists**: `github-issues-updated.csv` in project root

## Usage

### On Windows (PowerShell - Recommended)

```powershell
# Navigate to project root
cd E:\Projects\my-dashboard

# Run PowerShell script
.\scripts\create-github-issues.ps1 -Repo "yourusername/ember-feed"
```

### On Mac/Linux (Bash)

```bash
# Navigate to project root
cd ~/Projects/my-dashboard

# Run bash script
./scripts/create-github-issues.sh yourusername/ember-feed
```

## What It Does

1. **Creates milestones**:
   - Phase 1: Basic App
   - Phase 2: Data Layer
   - Phase 3: News Fetching
   - Phase 4: Learning
   - Phase 5: Polish
   - Future Enhancements

2. **Creates 25 issues** from CSV with:
   - Title
   - Description
   - Labels (setup, feature, bug, etc.)
   - Milestone assignment
   - Priority indicators in title

3. **Rate limits** requests (0.5s between issues)

## After Running

View your issues:
```bash
# List issues in terminal
gh issue list --repo yourusername/ember-feed

# Or visit GitHub
https://github.com/yourusername/ember-feed/issues
```

## Troubleshooting

**"Not authenticated"**
```bash
gh auth login
```

**"Repository not found"**
- Create the repository on GitHub first
- Make sure the repository name matches exactly (case-sensitive)

**"Milestone already exists"**
- This is okay! Script continues

**"Issue already exists"**
- Script will warn but continue

## Manual Creation

If scripts fail, you can:
1. Import CSV to GitHub directly (no built-in feature, sadly)
2. Create issues manually from `github-issues-updated.csv`
3. Use a third-party tool like [GitHub Issue Importer](https://github-csv-tools.herokuapp.com/)

## CSV Format

```csv
title,body,labels,milestone
"[Phase 1] Feature name","Description...","label1,label2","Phase 1: Basic App"
```

Fields:
- **title**: Issue title (50-80 chars recommended)
- **body**: Full description (Markdown supported)
- **labels**: Comma-separated labels
- **milestone**: Milestone name (must match exactly)

---

**Note**: After creating issues, close this session and manually rename the directory from `my-dashboard` to `ember-feed`.
