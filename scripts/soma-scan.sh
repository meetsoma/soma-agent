#!/usr/bin/env bash
# soma-scan.sh — Scan frontmatter across docs for status, staleness, relevance
#
# Usage:
#   soma-scan.sh                          # scan all known locations
#   soma-scan.sh --stale                  # only docs not updated today
#   soma-scan.sh --status draft           # only drafts
#   soma-scan.sh --type plan              # only plans
#   soma-scan.sh --dir ~/Vault/workspace  # specific directory
#   soma-scan.sh --related "soma"         # docs with "soma" in tags/project

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SOMA_DIR="$PROJECT_DIR/.soma"

# Default scan locations — project-level soma memory
SCAN_DIRS=(
  "$SOMA_DIR/protocols"
  "$SOMA_DIR/memory/muscles"
  "$SOMA_DIR/plans"
  "$SOMA_DIR/STATE.md"
  "$PROJECT_DIR/STATE.md"
)

FILTER_STATUS=""
FILTER_TYPE=""
FILTER_STALE=""
FILTER_RELATED=""
CUSTOM_DIR=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stale) FILTER_STALE="true"; shift ;;
    --status) FILTER_STATUS="$2"; shift 2 ;;
    --type) FILTER_TYPE="$2"; shift 2 ;;
    --dir) CUSTOM_DIR="$2"; shift 2 ;;
    --related) FILTER_RELATED="$2"; shift 2 ;;
    --help|-h)
      echo "σ  soma-scan — frontmatter scanner"
      echo "  --stale             docs not updated today"
      echo "  --status <status>   filter by status (draft/active/seed/stale/...)"
      echo "  --type <type>       filter by type (plan/spec/muscle/state/...)"
      echo "  --dir <path>        scan specific directory"
      echo "  --related <term>    match in tags/project/topic fields"
      exit 0 ;;
    *) shift ;;
  esac
done

TODAY=$(date +%Y-%m-%d)

# Override scan dirs if custom dir specified
if [ -n "$CUSTOM_DIR" ]; then
  SCAN_DIRS=("$CUSTOM_DIR")
fi

# Collect all .md files
FILES=()
for loc in "${SCAN_DIRS[@]}"; do
  if [ -f "$loc" ]; then
    FILES+=("$loc")
  elif [ -d "$loc" ]; then
    while IFS= read -r f; do
      FILES+=("$f")
    done < <(find "$loc" -name "*.md" -not -path "*/.git/*" -not -path "*/protocols-ref/*" -not -path "*/node_modules/*" 2>/dev/null)
  fi
done

# Header
printf "\n  %-10s %-10s %-12s %s\n" "TYPE" "STATUS" "UPDATED" "FILE"
printf "  %-10s %-10s %-12s %s\n" "────" "──────" "───────" "────"

SHOWN=0
TOTAL=${#FILES[@]}

for f in "${FILES[@]}"; do
  # Quick frontmatter extraction (no YAML parser needed)
  # Extract only from first frontmatter block (between first and second ---)
  _fm=$(awk '/^---$/{c++;next} c==1{print} c>=2{exit}' "$f" 2>/dev/null)
  type=$(echo "$_fm" | grep "^type:" | head -1 | awk '{print $2}')
  status=$(echo "$_fm" | grep "^status:" | head -1 | awk '{print $2}')
  updated=$(echo "$_fm" | grep "^updated:" | head -1 | awk '{print $2}')
  tags=$(echo "$_fm" | grep "^tags:" | head -1)
  project=$(echo "$_fm" | grep "^project:" | head -1 | awk '{print $2}')
  topic=$(echo "$_fm" | grep "^topic:" | head -1 | awk '{print $2}')

  # Skip files without frontmatter
  [ -z "$type" ] && [ -z "$status" ] && continue

  # Apply filters
  [ -n "$FILTER_STATUS" ] && [ "$status" != "$FILTER_STATUS" ] && continue
  [ -n "$FILTER_TYPE" ] && [ "$type" != "$FILTER_TYPE" ] && continue
  [ -n "$FILTER_STALE" ] && [ "$updated" = "$TODAY" ] && continue
  if [ -n "$FILTER_RELATED" ]; then
    echo "$tags $project $topic" | grep -qi "$FILTER_RELATED" || continue
  fi

  # Staleness indicator
  STALE_FLAG=""
  if [ -n "$updated" ] && [ "$updated" != "$TODAY" ]; then
    STALE_FLAG=" ⏰"
  fi

  # Shorten path for display
  short=$(echo "$f" | sed "s|$PROJECT_DIR/||")

  printf "  %-10s %-10s %-12s %s%s\n" "${type:-?}" "${status:-?}" "${updated:-never}" "$short" "$STALE_FLAG"
  SHOWN=$((SHOWN + 1))
done

echo ""
echo "  σ  $SHOWN/$TOTAL docs shown"
