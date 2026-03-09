#!/usr/bin/env bash
# soma-search.sh — Query the soma memory system by frontmatter + extract TL;DR/digest
#
# Usage:
#   soma-search.sh                                # all docs with TL;DR, grouped by type
#   soma-search.sh --type protocol                # only protocols
#   soma-search.sh --type muscle,plan             # multiple types
#   soma-search.sh --status active                # filter by status
#   soma-search.sh --tags "git,identity"          # match any tag
#   soma-search.sh --related breath-cycle         # docs listing breath-cycle in related field
#   soma-search.sh --domain memory                # match domain in tags/path
#   soma-search.sh --stale                        # not updated today
#   soma-search.sh --brief                        # breadcrumbs only (one line per doc)
#   soma-search.sh --deep                         # full TL;DR / digest sections
#   soma-search.sh --dir ~/some/path              # scan specific directory
#   soma-search.sh --body-min 50                  # only docs with 50+ body lines (TL;DR candidates)
#   soma-search.sh --missing-tldr                 # docs that SHOULD have TL;DR but don't
#
# Output modes:
#   --brief   → breadcrumb field only (1 line per doc)
#   --deep    → TL;DR section (## TL;DR) or digest block (<!-- digest:start/end -->)
#   (default) → type + status + name + breadcrumb

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SOMA_DIR="$PROJECT_DIR/.soma"

# Default scan locations — the soma memory system
SCAN_DIRS=(
  "$SOMA_DIR/protocols"
  "$SOMA_DIR/memory/muscles"
  "$PROJECT_DIR/docs/plans"
  "$SOMA_DIR/STATE.md"
  "$PROJECT_DIR/STATE.md"
)

# Filters
FILTER_TYPE=""
FILTER_STATUS=""
FILTER_TAGS=""
FILTER_RELATED=""
FILTER_DOMAIN=""
FILTER_STALE=""
FILTER_BODY_MIN=""
FILTER_MISSING_TLDR=""
CUSTOM_DIR=""
OUTPUT_MODE="default"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) FILTER_TYPE="$2"; shift 2 ;;
    --status) FILTER_STATUS="$2"; shift 2 ;;
    --tags) FILTER_TAGS="$2"; shift 2 ;;
    --related) FILTER_RELATED="$2"; shift 2 ;;
    --domain) FILTER_DOMAIN="$2"; shift 2 ;;
    --stale) FILTER_STALE="true"; shift ;;
    --brief) OUTPUT_MODE="brief"; shift ;;
    --deep) OUTPUT_MODE="deep"; shift ;;
    --dir) CUSTOM_DIR="$2"; shift 2 ;;
    --body-min) FILTER_BODY_MIN="$2"; shift 2 ;;
    --missing-tldr) FILTER_MISSING_TLDR="true"; shift ;;
    --help|-h)
      sed -n '2,/^$/p' "$0" | sed 's/^# //' | sed 's/^#//'
      exit 0 ;;
    *) shift ;;
  esac
done

TODAY=$(date +%Y-%m-%d)

if [ -n "$CUSTOM_DIR" ]; then
  SCAN_DIRS=("$CUSTOM_DIR")
fi

# ---------------------------------------------------------------------------
# Frontmatter extraction (no deps, bash only)
# ---------------------------------------------------------------------------

get_field() {
  local file="$1" field="$2"
  # Extract only the FIRST frontmatter block (between first and second ---)
  awk '/^---$/{c++;next} c==1{print} c>=2{exit}' "$file" 2>/dev/null | grep "^${field}:" | head -1 | sed "s/^${field}:[ ]*//" | sed 's/^["'"'"']//;s/["'"'"']$//'
}

get_body_lines() {
  local file="$1"
  sed -n '/^---$/,/^---$/d; p' "$file" 2>/dev/null | wc -l | tr -d ' '
}

# Extract ## TL;DR section (between ## TL;DR and next ##)
get_tldr() {
  local file="$1"
  local in_tldr=false
  while IFS= read -r line; do
    if echo "$line" | grep -qE '^## TL;DR'; then
      in_tldr=true
      continue
    fi
    if $in_tldr && echo "$line" | grep -qE '^## '; then
      break
    fi
    if $in_tldr && [[ -n "$line" ]]; then
      echo "$line"
    fi
  done < "$file"
}

# Extract <!-- digest:start --> ... <!-- digest:end --> block
get_digest() {
  local file="$1"
  sed -n '/<!-- digest:start/,/<!-- digest:end/p' "$file" 2>/dev/null | grep -v '<!-- digest:'
}

# Get whichever exists: TL;DR section or digest block
get_summary() {
  local file="$1"
  local tldr
  tldr=$(get_tldr "$file")
  if [[ -n "$tldr" ]]; then
    echo "$tldr"
    return
  fi
  local digest
  digest=$(get_digest "$file")
  if [[ -n "$digest" ]]; then
    echo "$digest"
    return
  fi
}

has_summary() {
  local file="$1"
  grep -qE '^## TL;DR' "$file" 2>/dev/null && return 0
  grep -q '<!-- digest:start' "$file" 2>/dev/null && return 0
  return 1
}

# ---------------------------------------------------------------------------
# Collect files
# ---------------------------------------------------------------------------

FILES=()
for loc in "${SCAN_DIRS[@]}"; do
  if [ -f "$loc" ]; then
    FILES+=("$loc")
  elif [ -d "$loc" ]; then
    while IFS= read -r f; do
      FILES+=("$f")
    done < <(find "$loc" -name "*.md" \
      -not -path "*/.git/*" \
      -not -path "*/node_modules/*" \
      -not -name "_template.md" \
      -not -name "README.md" \
      2>/dev/null)
  fi
done

# ---------------------------------------------------------------------------
# Filter + output
# ---------------------------------------------------------------------------

shorten() {
  echo "$1" | sed "s|$HOME/Gravicity/products/soma/agent/||;s|$HOME/Gravicity/||;s|$HOME/||"
}

SHOWN=0

for f in "${FILES[@]}"; do
  type=$(get_field "$f" "type")
  status=$(get_field "$f" "status")
  updated=$(get_field "$f" "updated")
  tags=$(get_field "$f" "tags")
  related=$(get_field "$f" "related")
  name=$(get_field "$f" "name")
  breadcrumb=$(get_field "$f" "breadcrumb")
  body_lines=$(get_body_lines "$f")

  # Use filename as fallback name
  [[ -z "$name" ]] && name=$(basename "$f" .md)

  # Skip files without any frontmatter
  [[ -z "$type" && -z "$status" ]] && continue

  # Apply filters
  if [[ -n "$FILTER_TYPE" ]]; then
    local_match=false
    IFS=',' read -ra types <<< "$FILTER_TYPE"
    for t in "${types[@]}"; do
      [[ "$type" == "$t" ]] && local_match=true
    done
    $local_match || continue
  fi

  [[ -n "$FILTER_STATUS" && "$status" != "$FILTER_STATUS" ]] && continue
  [[ -n "$FILTER_STALE" && "$updated" == "$TODAY" ]] && continue

  if [[ -n "$FILTER_TAGS" ]]; then
    # Check both tags and topic fields (muscles use topic, everything else uses tags)
    _topic=$(get_field "$f" "topic")
    _keywords=$(get_field "$f" "keywords")
    _all_tags="$tags $_topic $_keywords"

    tag_match=false
    IFS=',' read -ra search_tags <<< "$FILTER_TAGS"
    for st in "${search_tags[@]}"; do
      st=$(echo "$st" | xargs)
      echo "$_all_tags" | grep -qi "$st" && tag_match=true
    done
    $tag_match || continue
  fi

  if [[ -n "$FILTER_RELATED" ]]; then
    echo "$related" | grep -qi "$FILTER_RELATED" || continue
  fi

  if [[ -n "$FILTER_DOMAIN" ]]; then
    # Match domain against tags, topic, keywords, OR path components
    _topic_d=$(get_field "$f" "topic")
    _keywords_d=$(get_field "$f" "keywords")
    domain_match=false
    echo "$tags $_topic_d $_keywords_d" | grep -qi "$FILTER_DOMAIN" && domain_match=true
    echo "$f" | grep -qi "$FILTER_DOMAIN" && domain_match=true
    $domain_match || continue
  fi

  if [[ -n "$FILTER_BODY_MIN" ]]; then
    [[ "$body_lines" -lt "$FILTER_BODY_MIN" ]] && continue
  fi

  if [[ -n "$FILTER_MISSING_TLDR" ]]; then
    has_summary "$f" && continue
    [[ "$body_lines" -lt 50 ]] && continue
  fi

  # Output
  short=$(shorten "$f")

  case "$OUTPUT_MODE" in
    brief)
      if [[ -n "$breadcrumb" ]]; then
        echo "  [$type] $name — $breadcrumb"
      else
        echo "  [$type] $name — $short"
      fi
      ;;
    deep)
      summary=$(get_summary "$f")
      echo ""
      echo "━━━ $name ($type/$status) ━━━ $short"
      if [[ -n "$summary" ]]; then
        echo "$summary"
      elif [[ -n "$breadcrumb" ]]; then
        echo "  (no TL;DR — breadcrumb only) $breadcrumb"
      else
        echo "  (no TL;DR or breadcrumb)"
      fi
      ;;
    *)
      printf "  %-10s %-10s %-25s %s\n" "${type:-?}" "${status:-?}" "$name" "$short"
      ;;
  esac

  SHOWN=$((SHOWN + 1))
done

if [[ "$OUTPUT_MODE" == "default" && $SHOWN -gt 0 ]]; then
  echo ""
fi
echo "  σ  $SHOWN docs found"
