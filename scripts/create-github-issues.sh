#!/bin/bash
# Batch create GitHub issues from CSV
#
# Prerequisites:
# 1. GitHub CLI installed (gh)
# 2. Authenticated to GitHub (gh auth login)
# 3. Repository created on GitHub
# 4. CSV file exists
#
# Usage:
#   ./scripts/create-github-issues.sh <owner/repo>
#
# Example:
#   ./scripts/create-github-issues.sh jonge/ember-feed

set -e  # Exit on error

# Check arguments
if [ -z "$1" ]; then
    echo "Usage: $0 <owner/repo>"
    echo "Example: $0 jonge/ember-feed"
    exit 1
fi

REPO=$1
CSV_FILE="github-issues-updated.csv"

# Check if CSV exists
if [ ! -f "$CSV_FILE" ]; then
    echo "❌ Error: $CSV_FILE not found"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated to GitHub. Run: gh auth login"
    exit 1
fi

echo "🚀 Creating GitHub issues for $REPO"
echo ""

# Create milestones first
echo "📋 Creating milestones..."

gh issue list --repo "$REPO" --milestone "Phase 1: Basic App" &> /dev/null || \
    gh api repos/$REPO/milestones -f title="Phase 1: Basic App" -f description="Get something visible in browser" -f state="open"

gh issue list --repo "$REPO" --milestone "Phase 2: Data Layer" &> /dev/null || \
    gh api repos/$REPO/milestones -f title="Phase 2: Data Layer" -f description="Connect to database and algorithm" -f state="open"

gh issue list --repo "$REPO" --milestone "Phase 3: News Fetching" &> /dev/null || \
    gh api repos/$REPO/milestones -f title="Phase 3: News Fetching" -f description="Fetch and display real news" -f state="open"

gh issue list --repo "$REPO" --milestone "Phase 4: Learning" &> /dev/null || \
    gh api repos/$REPO/milestones -f title="Phase 4: Learning" -f description="Track engagement and personalize" -f state="open"

gh issue list --repo "$REPO" --milestone "Phase 5: Polish" &> /dev/null || \
    gh api repos/$REPO/milestones -f title="Phase 5: Polish" -f description="Portfolio-ready and secure" -f state="open"

gh issue list --repo "$REPO" --milestone "Future Enhancements" &> /dev/null || \
    gh api repos/$REPO/milestones -f title="Future Enhancements" -f description="Post-MVP features" -f state="open"

echo "✅ Milestones created"
echo ""

# Count total issues (excluding header)
TOTAL=$(tail -n +2 "$CSV_FILE" | wc -l)
CURRENT=0

echo "📝 Creating $TOTAL issues..."
echo ""

# Read CSV and create issues
tail -n +2 "$CSV_FILE" | while IFS=, read -r title body labels milestone; do
    CURRENT=$((CURRENT + 1))

    # Remove quotes from fields
    title=$(echo "$title" | sed 's/^"//;s/"$//')
    body=$(echo "$body" | sed 's/^"//;s/"$//')
    labels=$(echo "$labels" | sed 's/^"//;s/"$//')
    milestone=$(echo "$milestone" | sed 's/^"//;s/"$//')

    echo "[$CURRENT/$TOTAL] Creating: $title"

    # Create issue
    gh issue create \
        --repo "$REPO" \
        --title "$title" \
        --body "$body" \
        --label "$labels" \
        --milestone "$milestone" \
        2>&1 | grep -E "^https://" || echo "  ⚠️  Issue may already exist or failed to create"

    # Rate limiting: sleep briefly between creates
    sleep 0.5
done

echo ""
echo "✅ Done! Created $TOTAL issues"
echo ""
echo "View issues:"
echo "  gh issue list --repo $REPO"
echo "  https://github.com/$REPO/issues"
