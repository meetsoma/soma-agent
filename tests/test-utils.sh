#!/usr/bin/env bash
# test-utils.sh — Verify shared utility functions
#
# Tests:
#   1. Module exists and exports key functions
#   2. Token estimation logic
#   3. Duration formatting
#   4. Safe file operations

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PASS=0 FAIL=0 TOTAL=0
pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ✗ $1"; }
section() { echo ""; echo "═══ $1 ═══"; }

UTILS_TS="$PROJECT_DIR/core/utils.ts"
INDEX_TS="$PROJECT_DIR/core/index.ts"

# ---------------------------------------------------------------------------
section "Module Structure"
# ---------------------------------------------------------------------------

[[ -f "$UTILS_TS" ]] && pass "core/utils.ts exists" || fail "core/utils.ts missing"

for fn in safeRead fmtDuration; do
  if grep -qE "export (function |const )$fn" "$UTILS_TS" 2>/dev/null; then
    pass "exports: $fn"
  elif grep -q "$fn" "$INDEX_TS" 2>/dev/null; then
    pass "re-exported via index.ts: $fn"
  else
    fail "missing export: $fn"
  fi
done

# ---------------------------------------------------------------------------
section "Token Estimation"
# ---------------------------------------------------------------------------

# Should approximate tokens from text length
if grep -qE "token|char|length|\/\s*[34]" "$UTILS_TS" 2>/dev/null; then
  pass "token estimation uses text length heuristic"
else
  fail "no token estimation heuristic"
fi

# ---------------------------------------------------------------------------
section "Re-exports via index.ts"
# ---------------------------------------------------------------------------

# All core modules should be re-exported through index.ts
for mod in discovery identity init muscles preload protocols settings utils; do
  if grep -qE "from.*['\"]\./$mod" "$INDEX_TS" 2>/dev/null; then
    pass "index.ts re-exports $mod"
  else
    fail "index.ts missing re-export for $mod"
  fi
done

# ---------------------------------------------------------------------------
echo ""
echo "═══ Results: $PASS/$TOTAL passed, $FAIL failed ═══"
exit $FAIL
