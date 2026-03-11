#!/usr/bin/env bash
# Frontmatter — validate frontmatter on protocols and muscles
#
# Checks required fields, valid values, consistent formatting.
# Exit: 0=valid, 1=issues found

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"

SCAN_DIRS=(
  "$PROJECT_DIR/.soma/protocols"
  "$PROJECT_DIR/.soma/memory/muscles"
)

ISSUES=0
CHECKED=0

for loc in "${SCAN_DIRS[@]}"; do
  [ ! -d "$loc" ] && continue

  for f in "$loc"/*.md; do
    [ ! -f "$f" ] && continue
    name=$(basename "$f")
    [ "$name" = "_template.md" ] && continue

    short=$(echo "$f" | sed "s|$PROJECT_DIR/||")
    CHECKED=$((CHECKED + 1))

    # Extract frontmatter
    fm=$(awk '/^---$/{c++;next} c==1{print} c>=2{exit}' "$f" 2>/dev/null)

    if [ -z "$fm" ]; then
      echo "❌ No frontmatter: $short"
      ISSUES=$((ISSUES + 1))
      continue
    fi

    # Required fields
    type=$(echo "$fm" | grep "^type:" | head -1 | awk '{print $2}')
    fname=$(echo "$fm" | grep "^name:" | head -1 | awk '{print $2}')
    status=$(echo "$fm" | grep "^status:" | head -1 | awk '{print $2}')

    if [ -z "$type" ]; then
      echo "⚠  Missing type: $short"
      ISSUES=$((ISSUES + 1))
    fi
    if [ -z "$fname" ]; then
      echo "⚠  Missing name: $short"
      ISSUES=$((ISSUES + 1))
    fi
    if [ -z "$status" ]; then
      echo "⚠  Missing status: $short"
      ISSUES=$((ISSUES + 1))
    fi

    # Validate type values
    if [ -n "$type" ]; then
      case "$type" in
        protocol|muscle|skill|template|ritual|spec|plan|state) ;;
        *) echo "⚠  Unknown type '$type': $short"; ISSUES=$((ISSUES + 1)) ;;
      esac
    fi

    # Validate status values
    if [ -n "$status" ]; then
      case "$status" in
        active|draft|seed|stale|archived|deprecated) ;;
        *) echo "⚠  Unknown status '$status': $short"; ISSUES=$((ISSUES + 1)) ;;
      esac
    fi

    # Check name matches filename
    expected_name=$(basename "$f" .md)
    if [ -n "$fname" ] && [ "$fname" != "$expected_name" ]; then
      echo "⚠  Name mismatch: frontmatter '$fname' vs filename '$expected_name' in $short"
      ISSUES=$((ISSUES + 1))
    fi
  done
done

echo "ℹ  Checked $CHECKED files"

if [ $ISSUES -eq 0 ]; then
  echo "✅ All frontmatter valid"
  exit 0
else
  echo ""
  echo "⚠  $ISSUES frontmatter issue(s)"
  exit 1
fi
