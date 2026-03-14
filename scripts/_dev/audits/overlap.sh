#!/usr/bin/env bash
# Overlap — detect duplicate or near-duplicate content across protocols/muscles
#
# Finds files with similar names or overlapping topics.
# Exit: 0=clean, 1=potential overlaps

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"

SCAN_DIRS=(
  "$PROJECT_DIR/.soma/protocols"
  "$PROJECT_DIR/.soma/memory/muscles"
  "$PROJECT_DIR/docs"
)

OVERLAPS=0
TOPIC_LOG=$(mktemp)
NAME_LOG=$(mktemp)
trap "rm -f $TOPIC_LOG $NAME_LOG" EXIT

# Collect tags and check for cross-directory overlaps
for loc in "${SCAN_DIRS[@]}"; do
  [ ! -d "$loc" ] && continue
  for f in "$loc"/*.md; do
    [ ! -f "$f" ] && continue
    short=$(echo "$f" | sed "s|$PROJECT_DIR/||")

    # Extract tags/topic from frontmatter
    fm=$(awk '/^---$/{c++;next} c==1{print} c>=2{exit}' "$f" 2>/dev/null)
    tags=$(echo "$fm" | grep -E "^(tags|topic):" | sed 's/.*\[//;s/\].*//' | tr ',' '\n' | tr -d ' "' | tr -d "'" | sort -u)

    for tag in $tags; do
      [ -z "$tag" ] && continue
      existing=$(grep "^$tag	" "$TOPIC_LOG" 2>/dev/null | head -1 | cut -f2)
      if [ -n "$existing" ]; then
        existing_dir=$(dirname "$existing")
        current_dir=$(dirname "$short")
        if [ "$existing_dir" != "$current_dir" ]; then
          echo "⚠  Tag overlap [$tag]: $existing ↔ $short"
          OVERLAPS=$((OVERLAPS + 1))
        fi
      fi
      printf "%s\t%s\n" "$tag" "$short" >> "$TOPIC_LOG"
    done

    # Track names for collision detection
    name=$(basename "$f" .md)
    existing_name=$(grep "^$name	" "$NAME_LOG" 2>/dev/null | head -1 | cut -f2)
    if [ -n "$existing_name" ]; then
      echo "⚠  Name collision: $name exists in $existing_name and $short"
      OVERLAPS=$((OVERLAPS + 1))
    fi
    printf "%s\t%s\n" "$name" "$short" >> "$NAME_LOG"
  done
done

if [ $OVERLAPS -eq 0 ]; then
  echo "✅ No overlaps detected"
  exit 0
else
  echo ""
  echo "⚠  $OVERLAPS potential overlap(s)"
  exit 1
fi
