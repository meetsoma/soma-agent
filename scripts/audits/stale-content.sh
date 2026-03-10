#!/usr/bin/env bash
# Stale content — find docs/protocols/muscles not updated recently
#
# Checks frontmatter `updated:` field against threshold.
# Exit: 0=fresh, 1=stale content found

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"
THRESHOLD_DAYS=${STALE_THRESHOLD:-7}
THRESHOLD_DATE=$(date -v-${THRESHOLD_DAYS}d +%Y-%m-%d 2>/dev/null || date -d "${THRESHOLD_DAYS} days ago" +%Y-%m-%d 2>/dev/null)

SCAN_DIRS=(
  "$PROJECT_DIR/docs"
  "$PROJECT_DIR/.soma/protocols"
  "$PROJECT_DIR/.soma/memory/muscles"
)

STALE=0

for loc in "${SCAN_DIRS[@]}"; do
  [ ! -d "$loc" ] && [ ! -f "$loc" ] && continue

  if [ -f "$loc" ]; then
    files="$loc"
  else
    files=$(find "$loc" -name "*.md" -not -path "*/.git/*" 2>/dev/null)
  fi

  echo "$files" | while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ ! -f "$f" ] && continue

    updated=$(awk '/^---$/{c++;next} c==1{print} c>=2{exit}' "$f" 2>/dev/null | grep "^updated:" | head -1 | awk '{print $2}')
    [ -z "$updated" ] && continue

    if [[ "$updated" < "$THRESHOLD_DATE" ]]; then
      short=$(echo "$f" | sed "s|$PROJECT_DIR/||")
      printf "  ⏰ %-40s last updated: %s\n" "$short" "$updated"
    fi
  done
done

# Count stale (re-run to get count since subshell)
for loc in "${SCAN_DIRS[@]}"; do
  [ ! -d "$loc" ] && [ ! -f "$loc" ] && continue
  if [ -f "$loc" ]; then
    files="$loc"
  else
    files=$(find "$loc" -name "*.md" -not -path "*/.git/*" 2>/dev/null)
  fi
  echo "$files" | while IFS= read -r f; do
    [ -z "$f" ] || [ ! -f "$f" ] && continue
    updated=$(awk '/^---$/{c++;next} c==1{print} c>=2{exit}' "$f" 2>/dev/null | grep "^updated:" | head -1 | awk '{print $2}')
    [ -z "$updated" ] && continue
    [[ "$updated" < "$THRESHOLD_DATE" ]] && echo "stale"
  done
done | grep -c "stale" > /tmp/soma-stale-count 2>/dev/null || echo "0" > /tmp/soma-stale-count

STALE=$(cat /tmp/soma-stale-count)
rm -f /tmp/soma-stale-count

if [ "$STALE" -eq 0 ] 2>/dev/null; then
  echo "✅ All content updated within ${THRESHOLD_DAYS} days"
  exit 0
else
  echo ""
  echo "⚠  $STALE file(s) stale (>${THRESHOLD_DAYS} days)"
  exit 1
fi
