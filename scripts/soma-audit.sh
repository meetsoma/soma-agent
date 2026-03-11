#!/usr/bin/env bash
# soma-audit.sh — Orchestrate all audit scripts
#
# Usage:
#   soma-audit.sh              # run all audits
#   soma-audit.sh --list       # list available audits
#   soma-audit.sh pii drift    # run specific audits
#   soma-audit.sh --quiet      # summary only (no details)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUDIT_DIR="$SCRIPT_DIR/audits"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

QUIET=false
SELECTED=()

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --list|-l)
      echo "σ  Available audits:"
      for f in "$AUDIT_DIR"/*.sh; do
        name=$(basename "$f" .sh)
        desc=$(head -3 "$f" | grep "^# " | tail -1 | sed 's/^# //')
        printf "  %-20s %s\n" "$name" "$desc"
      done
      exit 0 ;;
    --quiet|-q) QUIET=true; shift ;;
    --help|-h)
      echo "σ  soma-audit — ecosystem health check"
      echo "  soma-audit.sh              run all audits"
      echo "  soma-audit.sh --list       list available audits"
      echo "  soma-audit.sh pii drift    run specific audits"
      echo "  soma-audit.sh --quiet      summary only"
      exit 0 ;;
    *) SELECTED+=("$1"); shift ;;
  esac
done

# Collect audit scripts
AUDITS=()
if [ ${#SELECTED[@]} -gt 0 ]; then
  for name in "${SELECTED[@]}"; do
    script="$AUDIT_DIR/$name.sh"
    if [ -f "$script" ]; then
      AUDITS+=("$script")
    else
      echo "⚠  Unknown audit: $name (skipping)"
    fi
  done
else
  for f in "$AUDIT_DIR"/*.sh; do
    [ -f "$f" ] && AUDITS+=("$f")
  done
fi

if [ ${#AUDITS[@]} -eq 0 ]; then
  echo "No audits found in $AUDIT_DIR"
  exit 1
fi

# Run audits
PASS=0
WARN=0
FAIL=0
TOTAL=${#AUDITS[@]}

echo ""
echo "σ  Soma Audit — $TOTAL checks"
echo "═══════════════════════════════════════"

for script in "${AUDITS[@]}"; do
  name=$(basename "$script" .sh)

  if $QUIET; then
    output=$(bash "$script" --project-dir "$PROJECT_DIR" 2>&1)
    exit_code=$?
  else
    echo ""
    echo "── $name ──"
    output=$(bash "$script" --project-dir "$PROJECT_DIR" 2>&1)
    exit_code=$?
    echo "$output"
  fi

  case $exit_code in
    0) PASS=$((PASS + 1)); $QUIET && printf "  ✅ %-20s pass\n" "$name" ;;
    1) WARN=$((WARN + 1)); $QUIET && printf "  ⚠️  %-20s warnings\n" "$name" ;;
    2) FAIL=$((FAIL + 1)); $QUIET && printf "  ❌ %-20s FAIL\n" "$name" ;;
    *) WARN=$((WARN + 1)); $QUIET && printf "  ⚠️  %-20s unknown ($exit_code)\n" "$name" ;;
  esac
done

echo ""
echo "═══════════════════════════════════════"
echo "σ  Results: $PASS pass · $WARN warn · $FAIL fail (of $TOTAL)"

[ $FAIL -gt 0 ] && exit 2
[ $WARN -gt 0 ] && exit 1
exit 0
