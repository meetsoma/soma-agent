#!/usr/bin/env bash
# Sync agent docs → website docs (preserving website frontmatter)
# Run from agent-stable/ after changes
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
WEBSITE_DIR="$(dirname "$AGENT_DIR")/website"
WEBSITE_DOCS="$WEBSITE_DIR/src/content/docs"

if [ ! -d "$WEBSITE_DOCS" ]; then
  echo "ERROR: Website docs not found at $WEBSITE_DOCS"
  exit 1
fi

echo "Syncing $AGENT_DIR/docs/ → $WEBSITE_DOCS/"

SYNCED=0
SKIPPED=0

for f in "$AGENT_DIR/docs/"*.md; do
  fname=$(basename "$f")
  web_path="$WEBSITE_DOCS/$fname"

  if [ ! -f "$web_path" ]; then
    echo "  ⚠ New doc (not on website): $fname"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Extract website frontmatter (preserve it)
  frontmatter=$(awk '/^---$/{c++;if(c==2){print;exit}} {print}' "$web_path")

  # Extract agent body (skip frontmatter if present)
  body=$(awk 'BEGIN{c=0} /^---$/{c++;if(c==2){getline;found=1;next}} found||c==0{print}' "$f")

  # Combine
  echo "$frontmatter" > "$web_path"
  echo "" >> "$web_path"
  echo "$body" >> "$web_path"

  SYNCED=$((SYNCED + 1))
done

# Also sync CHANGELOG → website changelog doc
if [ -f "$AGENT_DIR/CHANGELOG.md" ] && [ -f "$WEBSITE_DOCS/changelog.md" ]; then
  frontmatter=$(awk '/^---$/{c++;if(c==2){print;exit}} {print}' "$WEBSITE_DOCS/changelog.md")
  body=$(cat "$AGENT_DIR/CHANGELOG.md")
  echo "$frontmatter" > "$WEBSITE_DOCS/changelog.md"
  echo "" >> "$WEBSITE_DOCS/changelog.md"
  echo "$body" >> "$WEBSITE_DOCS/changelog.md"
  SYNCED=$((SYNCED + 1))
  echo "  ✓ changelog.md"
fi

echo ""
echo "Done: $SYNCED synced, $SKIPPED skipped"

# Show what changed
cd "$WEBSITE_DIR"
changes=$(git diff --stat 2>/dev/null)
if [ -z "$changes" ]; then
  echo "✅ Already in sync — no changes"
else
  echo ""
  echo "Changes:"
  echo "$changes"
  echo ""
  echo "Run: cd $WEBSITE_DIR && git add -A && git commit -m 'docs: sync from agent' && git push"
  echo "Then: git checkout main && git merge dev --no-edit && git push && git checkout dev"
fi
