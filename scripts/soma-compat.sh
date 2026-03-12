#!/usr/bin/env bash
# σ Soma Compatibility Check
# Detects overlap, redundancy, and conflicting directives across protocols + muscles.
# Usage: bash soma-compat.sh [path-to-soma-dir]
set -o pipefail

SOMA_DIR="${1:-$(pwd)/.soma}"
[ ! -d "$SOMA_DIR" ] && SOMA_DIR="$(pwd)"

PROTO_DIR="$SOMA_DIR/protocols"
MUSCLE_DIR="$SOMA_DIR/memory/muscles"

SCORE=100
WARNINGS=0
ISSUES=""

# ── Helpers ──────────────────────────────────────────────────────

extract_fm() {
  awk '/^---$/{n++; next} n==1{print}' "$1"
}

extract_body() {
  awk 'BEGIN{n=0} /^---$/{n++; next} n>=2{print}' "$1"
}

get_field() {
  echo "$1" | grep -i "^$2:" | head -1 | sed "s/^$2: *//i" | tr -d '"' | tr -d "'" 
}

get_array() {
  echo "$1" | grep -i "^$2:" | head -1 | sed "s/^$2: *//i" | tr -d '[]"'"'" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | grep -v '^$'
}

get_name() {
  local fm; fm=$(extract_fm "$1")
  local name; name=$(get_field "$fm" "name")
  [ -z "$name" ] && name=$(basename "$1" .md)
  echo "$name"
}

warn() {
  WARNINGS=$((WARNINGS + 1))
  ISSUES="${ISSUES}\n  ⚠️  $1"
  SCORE=$((SCORE - $2))
}

# ── Collect items ────────────────────────────────────────────────

declare -a FILES=()
declare -a NAMES=()
declare -a TYPES=()
declare -a TAG_SETS=()
declare -a APPLIES_SETS=()
declare -a DIRECTIVES=()

idx=0
for dir_info in "protocol:$PROTO_DIR" "muscle:$MUSCLE_DIR"; do
  type="${dir_info%%:*}"
  dir="${dir_info#*:}"
  [ ! -d "$dir" ] && continue
  for f in "$dir"/*.md; do
    [ ! -f "$f" ] && continue
    [[ "$(basename "$f")" == _* ]] && continue
    [[ "$(basename "$f")" == "README.md" ]] && continue
    
    fm=$(extract_fm "$f")
    body=$(extract_body "$f")
    name=$(get_field "$fm" "name")
    [ -z "$name" ] && name=$(basename "$f" .md)
    
    tags=$(get_array "$fm" "tags" | tr '\n' '|')
    applies=$(get_array "$fm" "applies-to" | tr '\n' '|')
    [ -z "$applies" ] && applies=$(get_array "$fm" "appliesTo" | tr '\n' '|')
    
    # Extract directive words with context
    directives=$(echo "$body" | grep -oiE "(always|never|must|don.t|stop|avoid|require|forbid|prohibited)[^.!]*[.!]" | head -20 | tr '\n' '|')
    
    FILES[$idx]="$f"
    NAMES[$idx]="$name"
    TYPES[$idx]="$type"
    TAG_SETS[$idx]="$tags"
    APPLIES_SETS[$idx]="$applies"
    DIRECTIVES[$idx]="$directives"
    idx=$((idx + 1))
  done
done

TOTAL=$idx

if [ "$TOTAL" -lt 2 ]; then
  echo "σ Compatibility Check — $TOTAL items (need 2+ to compare)"
  exit 0
fi

# ── Compare pairs ────────────────────────────────────────────────

tag_overlap() {
  local a="$1" b="$2"
  local shared=0 total_a=0 total_b=0
  
  IFS='|' read -ra A <<< "$a"
  IFS='|' read -ra B <<< "$b"
  total_a=${#A[@]}
  total_b=${#B[@]}
  
  for ta in "${A[@]}"; do
    [ -z "$ta" ] && continue
    for tb in "${B[@]}"; do
      [ -z "$tb" ] && continue
      [ "$ta" = "$tb" ] && shared=$((shared + 1))
    done
  done
  
  local max=$total_a
  [ $total_b -gt $max ] && max=$total_b
  [ $max -eq 0 ] && echo 0 && return
  echo $((shared * 100 / max))
}

directive_conflicts() {
  local a="$1" b="$2"
  local conflicts=""
  
  # Check for always/never on same topic
  IFS='|' read -ra DA <<< "$a"
  IFS='|' read -ra DB <<< "$b"
  
  for da in "${DA[@]}"; do
    [ -z "$da" ] && continue
    da_lower=$(echo "$da" | tr '[:upper:]' '[:lower:]')
    for db in "${DB[@]}"; do
      [ -z "$db" ] && continue
      db_lower=$(echo "$db" | tr '[:upper:]' '[:lower:]')
      
      # "always X" vs "never X" or "don't X" 
      if echo "$da_lower" | grep -q "^always" && echo "$db_lower" | grep -q "^never\|^don.t\|^stop\|^avoid"; then
        # Check if they share a key noun (3+ char words)
        for word in $(echo "$da_lower" | tr -cs '[:alpha:]' '\n' | awk 'length>=4'); do
          if echo "$db_lower" | grep -qi "$word"; then
            conflicts="${conflicts}CONFLICT: \"${da:0:60}\" vs \"${db:0:60}\"\n"
            break
          fi
        done
      fi
      # Reverse
      if echo "$db_lower" | grep -q "^always" && echo "$da_lower" | grep -q "^never\|^don.t\|^stop\|^avoid"; then
        for word in $(echo "$db_lower" | tr -cs '[:alpha:]' '\n' | awk 'length>=4'); do
          if echo "$da_lower" | grep -qi "$word"; then
            conflicts="${conflicts}CONFLICT: \"${db:0:60}\" vs \"${da:0:60}\"\n"
            break
          fi
        done
      fi
    done
  done
  
  echo -e "$conflicts"
}

scope_overlap() {
  local a="$1" b="$2"
  [ -z "$a" ] || [ -z "$b" ] && echo 0 && return
  [ "$a" = "|" ] || [ "$b" = "|" ] && echo 0 && return
  
  # "always" applies to everything — high overlap with anything
  if echo "$a" | grep -q "always" && echo "$b" | grep -q "always"; then
    echo 50
    return
  fi
  
  tag_overlap "$a" "$b"
}

# ── Run comparisons ─────────────────────────────────────────────

for ((i=0; i<TOTAL; i++)); do
  for ((j=i+1; j<TOTAL; j++)); do
    name_a="${NAMES[$i]}"
    name_b="${NAMES[$j]}"
    
    # Tag overlap
    toverlap=$(tag_overlap "${TAG_SETS[$i]}" "${TAG_SETS[$j]}")
    
    # Scope overlap
    soverlap=$(scope_overlap "${APPLIES_SETS[$i]}" "${APPLIES_SETS[$j]}")
    
    # Directive conflicts
    dconflicts=$(directive_conflicts "${DIRECTIVES[$i]}" "${DIRECTIVES[$j]}")
    
    # High tag overlap = redundancy warning
    if [ "$toverlap" -ge 70 ]; then
      warn "REDUNDANCY: $name_a ↔ $name_b — ${toverlap}% tag overlap" 3
    elif [ "$toverlap" -ge 50 ]; then
      warn "OVERLAP: $name_a ↔ $name_b — ${toverlap}% tag overlap" 1
    fi
    
    # Directive conflicts
    if [ -n "$dconflicts" ]; then
      count=$(echo -e "$dconflicts" | grep -c "CONFLICT" || true)
      warn "DIRECTIVE CONFLICT: $name_a ↔ $name_b ($count conflicts)" 5
      while IFS= read -r line; do
        [ -n "$line" ] && ISSUES="${ISSUES}\n     $line"
      done <<< "$(echo -e "$dconflicts" | grep "CONFLICT")"
    fi
  done
done

# ── Output ───────────────────────────────────────────────────────

[ $SCORE -lt 0 ] && SCORE=0

echo ""
echo "σ Compatibility Check — $TOTAL items ($( echo "${TYPES[@]}" | tr ' ' '\n' | grep -c protocol || true) protocols, $( echo "${TYPES[@]}" | tr ' ' '\n' | grep -c muscle || true) muscles)"
echo "═══════════════════════════════════════"

if [ $SCORE -ge 90 ]; then
  echo "  ✅ $SCORE/100 — highly compatible"
elif [ $SCORE -ge 70 ]; then
  echo "  ⚠️  $SCORE/100 — some overlap detected"
elif [ $SCORE -ge 50 ]; then
  echo "  🟡 $SCORE/100 — review recommended"
else
  echo "  🔴 $SCORE/100 — significant conflicts"
fi

if [ -n "$ISSUES" ]; then
  echo -e "$ISSUES"
fi

echo "═══════════════════════════════════════"

[ $WARNINGS -gt 5 ] && exit 2
[ $WARNINGS -gt 0 ] && exit 1
exit 0
