#!/usr/bin/env bash
# Docs sync — check if agent docs and website docs are in sync
#
# Compares agent/docs/*.md against website/src/content/docs/*.md
# Exit: 0=synced, 1=drift detected

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"
WEBSITE_DOCS="$(dirname "$PROJECT_DIR")/website/src/content/docs"

if [ ! -d "$WEBSITE_DOCS" ]; then
  echo "⚠  Website docs not found at $WEBSITE_DOCS — skipping"
  exit 0
fi

AGENT_DOCS="$PROJECT_DIR/docs"
if [ ! -d "$AGENT_DOCS" ]; then
  echo "⚠  Agent docs not found at $AGENT_DOCS — skipping"
  exit 0
fi

DRIFT=0

for f in "$AGENT_DOCS"/*.md; do
  name=$(basename "$f")
  website_file="$WEBSITE_DOCS/$name"

  if [ ! -f "$website_file" ]; then
    echo "⚠  Missing on website: docs/$name"
    DRIFT=$((DRIFT + 1))
    continue
  fi

  # Strip frontmatter from both and compare content
  agent_body=$(awk '/^---$/{c++;next} c==1{next} {print}' "$f" 2>/dev/null)
  # Website has different frontmatter + stripped H1, so compare loosely
  # Check if agent file is newer by mtime
  agent_mtime=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null)
  website_mtime=$(stat -f %m "$website_file" 2>/dev/null || stat -c %Y "$website_file" 2>/dev/null)

  if [ "$agent_mtime" -gt "$website_mtime" ]; then
    echo "⚠  Agent newer: docs/$name (run sync-docs.sh)"
    DRIFT=$((DRIFT + 1))
  fi
done

# Check for website docs with no agent source
for f in "$WEBSITE_DOCS"/*.md; do
  name=$(basename "$f")
  [ "$name" = "changelog.md" ] && continue  # special case — comes from CHANGELOG.md
  if [ ! -f "$AGENT_DOCS/$name" ]; then
    echo "⚠  Website-only doc (no agent source): $name"
    DRIFT=$((DRIFT + 1))
  fi
done

if [ $DRIFT -eq 0 ]; then
  echo "✅ Agent docs and website in sync"
  exit 0
else
  echo ""
  echo "⚠  $DRIFT doc(s) out of sync — run: bash website/scripts/sync-docs.sh"
  exit 1
fi
