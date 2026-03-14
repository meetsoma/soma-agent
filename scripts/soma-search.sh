#!/usr/bin/env bash
# soma-search.sh — search .soma/ docs by type, tags, or content
# Related: soma-verify.sh, soma-scan.sh
# Usage: soma-search.sh [--type TYPE] [--tags TAG] [--deep] [--missing-tldr] [QUERY]

set -euo pipefail

SOMA_DIR=""
for d in .soma "$HOME/.soma"; do
  [[ -d "$d" ]] && SOMA_DIR="$d" && break
done
[[ -z "$SOMA_DIR" ]] && echo "No .soma/ found" && exit 1

TYPE_FILTER=""
TAG_FILTER=""
DEEP=false
MISSING_TLDR=false
QUERY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) TYPE_FILTER="$2"; shift 2 ;;
    --tags) TAG_FILTER="$2"; shift 2 ;;
    --deep) DEEP=true; shift ;;
    --missing-tldr) MISSING_TLDR=true; shift ;;
    *) QUERY="$1"; shift ;;
  esac
done

count=0

# Search protocols and muscles directories
for dir in "$SOMA_DIR/protocols" "$SOMA_DIR/memory/muscles" "$SOMA_DIR/amps/protocols" "$SOMA_DIR/amps/muscles"; do
  [[ -d "$dir" ]] || continue
  for f in "$dir"/*.md; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f" .md)
    [[ "$name" == "_template" || "$name" == "README" ]] && continue

    # Type filter
    if [[ -n "$TYPE_FILTER" ]]; then
      file_type=$(grep -m1 "^type:" "$f" 2>/dev/null | sed 's/type: *//')
      [[ "$file_type" != "$TYPE_FILTER" ]] && continue
    fi

    # Tag filter
    if [[ -n "$TAG_FILTER" ]]; then
      grep -q "$TAG_FILTER" "$f" 2>/dev/null || continue
    fi

    # Missing TL;DR filter
    if $MISSING_TLDR; then
      grep -q "## TL;DR" "$f" 2>/dev/null && continue
    fi

    # Query filter
    if [[ -n "$QUERY" ]]; then
      grep -qi "$QUERY" "$f" 2>/dev/null || continue
    fi

    count=$((count + 1))

    if $DEEP; then
      # Show TL;DR content
      echo "── $name ──"
      tldr=$(sed -n '/## TL;DR/,/^##/p' "$f" 2>/dev/null | head -5 | grep -v "^##")
      if [[ -n "$tldr" ]]; then
        echo "$tldr"
      else
        breadcrumb=$(grep "^breadcrumb:" "$f" 2>/dev/null | sed 's/breadcrumb: *//' | tr -d '"')
        echo "  ${breadcrumb:-no TL;DR}"
      fi
      echo ""
    else
      echo "  $name ($f)"
    fi
  done
done

echo "$count docs found"
