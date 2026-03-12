#!/usr/bin/env bash
# soma-tldr.sh — Generate or update ## TL;DR / <!-- digest --> sections via agent
#
# Usage:
#   soma-tldr.sh <file.md>                 # generate TL;DR for one file
#   soma-tldr.sh --scan                    # find all files needing TL;DR, list them
#   soma-tldr.sh --batch                   # generate for all missing (with confirmation)
#   soma-tldr.sh --check <file.md>         # check if TL;DR is stale vs body
#   soma-tldr.sh --dry-run <file.md>       # show what would be generated, don't write
#   soma-tldr.sh --model sonnet            # model override (default: haiku)
#   soma-tldr.sh --budget 0.10             # budget cap (default: $0.05 per file)
#
# Conventions:
#   - type: protocol, plan, spec, state → ## TL;DR (visible markdown heading)
#   - type: muscle                       → <!-- digest:start/end --> (invisible)
#   - Files under 50 body lines are skipped (not worth summarizing)
#
# Requires: claude CLI (claude -p)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOMA_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$SOMA_DIR")"

MODEL="haiku"
BUDGET="0.05"
DRY_RUN=false
MODE="single"  # single | scan | batch | check
TARGET_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scan) MODE="scan"; shift ;;
    --batch) MODE="batch"; shift ;;
    --check) MODE="check"; TARGET_FILE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; TARGET_FILE="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --budget) BUDGET="$2"; shift 2 ;;
    --help|-h)
      sed -n '2,/^$/p' "$0" | sed 's/^# //' | sed 's/^#//'
      exit 0 ;;
    *)
      if [[ -f "$1" ]]; then
        TARGET_FILE="$1"
      fi
      shift ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

get_field() {
  local file="$1" field="$2"
  awk '/^---$/{c++;next} c==1{print} c>=2{exit}' "$file" 2>/dev/null \
    | grep "^${field}:" | head -1 \
    | sed "s/^${field}:[ ]*//" | sed 's/^["'"'"']//;s/["'"'"']$//'
}

get_body() {
  # Everything after closing --- of frontmatter
  awk '/^---$/{c++;next} c>=2{print}' "$file" 2>/dev/null
}

get_body_lines() {
  local file="$1"
  awk '/^---$/{c++;next} c>=2{print}' "$file" 2>/dev/null | wc -l | tr -d ' '
}

has_tldr() {
  grep -qE '^## TL;DR' "$1" 2>/dev/null
}

has_digest() {
  grep -q '<!-- digest:start' "$1" 2>/dev/null
}

has_summary() {
  has_tldr "$1" || has_digest "$1"
}

# Determine which convention this file type uses
summary_format() {
  local file="$1"
  local type
  type=$(get_field "$file" "type")
  case "$type" in
    muscle) echo "digest" ;;
    *)      echo "tldr" ;;
  esac
}

shorten() {
  echo "$1" | sed "s|$(pwd)/||;s|$HOME/||"
}

# ---------------------------------------------------------------------------
# Find all files needing TL;DR
# ---------------------------------------------------------------------------

find_missing() {
  local SCAN_DIRS=(
    "$SOMA_DIR/protocols"
    "$SOMA_DIR/memory/muscles"
    "$PROJECT_DIR/docs/plans"
    "$SOMA_DIR/STATE.md"
    "$PROJECT_DIR/STATE.md"
  )

  for loc in "${SCAN_DIRS[@]}"; do
    if [ -f "$loc" ]; then
      echo "$loc"
    elif [ -d "$loc" ]; then
      find "$loc" -name "*.md" \
        -not -path "*/.git/*" \
        -not -path "*/node_modules/*" \
        -not -name "_template.md" \
        -not -name "README.md" \
        2>/dev/null
    fi
  done | while IFS= read -r f; do
    local body_lines
    body_lines=$(get_body_lines "$f")
    [[ "$body_lines" -lt 50 ]] && continue
    has_summary "$f" && continue
    echo "$f"
  done
}

# ---------------------------------------------------------------------------
# Generate TL;DR for a single file
# ---------------------------------------------------------------------------

generate_tldr() {
  local file="$1"
  local format
  format=$(summary_format "$file")
  local type
  type=$(get_field "$file" "type")
  local name
  name=$(get_field "$file" "name")
  [[ -z "$name" ]] && name=$(basename "$file" .md)

  # Read the file body (strip frontmatter)
  local body
  body=$(awk '/^---$/{c++;next} c>=2{print}' "$file")

  # Skip if body is short
  local line_count
  line_count=$(echo "$body" | wc -l | tr -d ' ')
  if [[ "$line_count" -lt 50 ]]; then
    echo "SKIP: $name — only $line_count body lines (< 50)" >&2
    return 1
  fi

  local prompt
  if [[ "$format" == "digest" ]]; then
    prompt="You are summarizing a muscle memory file for an AI agent memory system.

File: $(shorten "$file")
Type: $type
Name: $name

Write a digest block that will appear at the top of the body, wrapped in <!-- digest:start --> and <!-- digest:end --> markers.

Format:
<!-- digest:start -->
> **$name** — \`$(shorten "$file")\`
> Use when: [1 line — trigger conditions]
> - [3-8 dense bullet points covering core rules, commands, key values]
> - [Each bullet is actionable — agent can follow without reading full doc]
> - [Include specific commands, paths, numbers where relevant]
<!-- digest:end -->

Rules:
- Dense, imperative bullets. No fluff.
- Include specific commands, file paths, config values — not vague summaries.
- 3-8 bullets. Enough to act on, short enough to scan.
- The agent should be able to follow these bullets without reading the full document for most tasks.
- Output ONLY the digest block, nothing else.

Document body:
$body"
  else
    prompt="You are summarizing a document for an AI agent memory system.

File: $(shorten "$file")
Type: $type
Name: $name

Write a ## TL;DR section with 3-7 dense bullet points. This goes at the top of the document body, right after the first # heading.

Format:
## TL;DR
- [Dense bullet with specific details, commands, key decisions]
- [Each bullet is actionable — captures a core rule or fact]
- [Include specifics: names, paths, thresholds, not vague summaries]

Rules:
- Dense, imperative bullets. No fluff.
- Include specific values, paths, commands where the document has them.
- 3-7 bullets. Capture the essence — what would an agent need to know to act without reading the full doc?
- Start with the most important point.
- Output ONLY the ## TL;DR section (heading + bullets), nothing else.

Document body:
$body"
  fi

  local result
  result=$(echo "$prompt" | claude -p --model "$MODEL" --max-tokens 500 --no-session-persistence 2>/dev/null) || {
    echo "ERROR: claude call failed for $name" >&2
    return 1
  }

  echo "$result"
}

# ---------------------------------------------------------------------------
# Insert TL;DR/digest into file
# ---------------------------------------------------------------------------

insert_summary() {
  local file="$1"
  local summary="$2"
  local format
  format=$(summary_format "$file")
  local tmp="${file}.tmp"

  if [[ "$format" == "digest" ]]; then
    # For muscles: insert after frontmatter closing ---
    # Remove existing digest block first
    sed '/<!-- digest:start/,/<!-- digest:end/d' "$file" > "$tmp.clean"

    awk -v block="$summary" '
      /^---$/ { count++ }
      { print }
      count == 2 && !inserted { printf "\n%s\n", block; inserted=1 }
    ' "$tmp.clean" > "$tmp"
    rm "$tmp.clean"
  else
    # For protocols/plans: insert after first # heading
    # Remove existing ## TL;DR section first
    local cleaned
    cleaned=$(awk '
      /^## TL;DR/ { skip=1; next }
      skip && /^## / { skip=0 }
      skip { next }
      { print }
    ' "$file")

    echo "$cleaned" | awk -v block="$summary" '
      /^# / && !inserted { print; printf "\n%s\n", block; inserted=1; next }
      { print }
    ' > "$tmp"
  fi

  mv "$tmp" "$file"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

case "$MODE" in
  scan)
    echo "σ  Files needing TL;DR / digest (50+ body lines, no summary):"
    echo ""
    count=0
    find_missing | while IFS= read -r f; do
      format=$(summary_format "$f")
      lines=$(get_body_lines "$f")
      printf "  %-8s %-4d lines  %s\n" "[$format]" "$lines" "$(shorten "$f")"
      ((count++)) || true
    done
    echo ""
    echo "  Run with --batch to generate all, or soma-tldr.sh <file> for one."
    ;;

  batch)
    files=()
    while IFS= read -r f; do
      files+=("$f")
    done < <(find_missing)

    if [[ ${#files[@]} -eq 0 ]]; then
      echo "σ  All files have TL;DR / digest sections. Nothing to do."
      exit 0
    fi

    echo "σ  Will generate summaries for ${#files[@]} files using $MODEL:"
    for f in "${files[@]}"; do
      echo "  $(shorten "$f")"
    done
    echo ""
    read -p "Proceed? (y/N) " -n 1 -r
    echo ""
    [[ $REPLY =~ ^[Yy]$ ]] || exit 0

    for f in "${files[@]}"; do
      name=$(get_field "$f" "name")
      [[ -z "$name" ]] && name=$(basename "$f" .md)
      echo -n "  Generating $name... "

      summary=$(generate_tldr "$f") || continue

      if $DRY_RUN; then
        echo "DRY RUN:"
        echo "$summary"
      else
        insert_summary "$f" "$summary"
        echo "✓"
      fi
    done
    echo ""
    echo "σ  Done. Review changes with: git diff"
    ;;

  check)
    if [[ -z "$TARGET_FILE" ]]; then
      echo "Usage: soma-tldr.sh --check <file.md>" >&2
      exit 1
    fi
    if has_summary "$TARGET_FILE"; then
      echo "σ  $(shorten "$TARGET_FILE") has a summary section."
      echo "   (Staleness check: compare updated date vs summary content — future feature)"
    else
      lines=$(get_body_lines "$TARGET_FILE")
      if [[ "$lines" -ge 50 ]]; then
        echo "⚠️  $(shorten "$TARGET_FILE") has $lines body lines but no TL;DR."
      else
        echo "σ  $(shorten "$TARGET_FILE") is $lines lines — doesn't need a TL;DR."
      fi
    fi
    ;;

  single)
    if [[ -z "$TARGET_FILE" ]]; then
      echo "Usage: soma-tldr.sh <file.md>" >&2
      echo "       soma-tldr.sh --scan" >&2
      echo "       soma-tldr.sh --batch" >&2
      exit 1
    fi

    name=$(get_field "$TARGET_FILE" "name")
    [[ -z "$name" ]] && name=$(basename "$TARGET_FILE" .md)

    echo "σ  Generating TL;DR for $name..."
    summary=$(generate_tldr "$TARGET_FILE") || exit 1

    if $DRY_RUN; then
      echo ""
      echo "$summary"
      echo ""
      echo "(dry run — not written)"
    else
      insert_summary "$TARGET_FILE" "$summary"
      echo "✓ Written to $(shorten "$TARGET_FILE")"
      echo "  Review: head -30 $TARGET_FILE"
    fi
    ;;
esac
