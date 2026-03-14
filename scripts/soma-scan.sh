#!/usr/bin/env bash
# soma-scan.sh — scan .soma/ for protocols, muscles, and staleness
# Related: soma-search.sh, soma-verify.sh
# Usage: soma-scan.sh [--type TYPE] [--stale] [--all]

set -euo pipefail

SOMA_DIR=""
for d in .soma "$HOME/.soma"; do
  [[ -d "$d" ]] && SOMA_DIR="$d" && break
done
[[ -z "$SOMA_DIR" ]] && echo "No .soma/ found" && exit 1

TYPE_FILTER=""
STALE_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) TYPE_FILTER="$2"; shift 2 ;;
    --stale) STALE_ONLY=true; shift ;;
    --all) shift ;;
    *) shift ;;
  esac
done

count=0
now=$(date +%s)

for dir in "$SOMA_DIR/protocols" "$SOMA_DIR/memory/muscles" "$SOMA_DIR/amps/protocols" "$SOMA_DIR/amps/muscles"; do
  [[ -d "$dir" ]] || continue
  for f in "$dir"/*.md; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f" .md)
    [[ "$name" == "_template" || "$name" == "README" ]] && continue

    file_type=$(grep -m1 "^type:" "$f" 2>/dev/null | sed 's/type: *//' || echo "unknown")
    status=$(grep -m1 "^status:" "$f" 2>/dev/null | sed 's/status: *//' || echo "unknown")
    updated=$(grep -m1 "^updated:" "$f" 2>/dev/null | sed 's/updated: *//' || echo "")

    # Type filter
    if [[ -n "$TYPE_FILTER" && "$file_type" != "$TYPE_FILTER" ]]; then
      continue
    fi

    # Staleness check (30+ days)
    is_stale=false
    if [[ -n "$updated" ]]; then
      updated_ts=$(date -j -f "%Y-%m-%d" "$updated" +%s 2>/dev/null || echo "0")
      age_days=$(( (now - updated_ts) / 86400 ))
      [[ $age_days -ge 30 ]] && is_stale=true
    fi

    if $STALE_ONLY && ! $is_stale; then
      continue
    fi

    count=$((count + 1))
    stale_marker=""
    $is_stale && stale_marker=" ⚠️ stale"
    echo "  ${file_type}: ${name} [${status}]${stale_marker}"
  done
done

echo "$count docs shown"
