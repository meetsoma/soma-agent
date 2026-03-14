#!/usr/bin/env bash
# test-preload.sh — Verify preload writing, reading, and staleness detection
#
# Tests:
#   1. Module exists and exports key functions
#   2. Preload file naming (preload-next.md)
#   3. Staleness detection logic
#   4. Preload injection for system prompt

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PASS=0 FAIL=0 TOTAL=0
pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ✗ $1"; }
section() { echo ""; echo "═══ $1 ═══"; }

PRELOAD_TS="$PROJECT_DIR/core/preload.ts"
INDEX_TS="$PROJECT_DIR/core/index.ts"

# ---------------------------------------------------------------------------
section "Module Structure"
# ---------------------------------------------------------------------------

[[ -f "$PRELOAD_TS" ]] && pass "core/preload.ts exists" || fail "core/preload.ts missing"

for fn in findPreload hasPreload; do
  if grep -qE "export (function |async function |const )$fn" "$PRELOAD_TS" 2>/dev/null; then
    pass "exports: $fn"
  elif grep -q "$fn" "$INDEX_TS" 2>/dev/null; then
    pass "re-exported via index.ts: $fn"
  else
    fail "missing export: $fn"
  fi
done

# ---------------------------------------------------------------------------
section "Preload Naming"
# ---------------------------------------------------------------------------

# Should use preload-next.md (not continuation-prompt.md)
if grep -q "preload-next" "$PRELOAD_TS"; then
  pass "uses preload-next.md"
else
  fail "preload-next.md not referenced"
fi

# Should NOT reference old continuation-prompt
if grep -q "continuation-prompt" "$PRELOAD_TS"; then
  fail "still references deprecated continuation-prompt.md"
else
  pass "no legacy continuation-prompt references"
fi

# ---------------------------------------------------------------------------
section "Staleness Detection"
# ---------------------------------------------------------------------------

# Should check file age / staleness
if grep -qE "stale|age|hours|modified|mtime|stat" "$PRELOAD_TS"; then
  pass "staleness detection logic present"
else
  fail "no staleness detection"
fi

# Should accept maxAgeHours parameter
if grep -qE "maxAgeHours|maxAge|48" "$PRELOAD_TS"; then
  pass "configurable staleness threshold"
else
  fail "no configurable staleness threshold"
fi

# ---------------------------------------------------------------------------
section "Injection"
# ---------------------------------------------------------------------------

# Should return structured PreloadInfo
if grep -qE "PreloadInfo|interface.*Preload" "$PRELOAD_TS"; then
  pass "returns structured PreloadInfo"
else
  fail "no structured return type"
fi

# Should read file content
if grep -qE "readFileSync|safeRead|readFile" "$PRELOAD_TS"; then
  pass "reads preload file content"
else
  fail "no file reading"
fi

# ---------------------------------------------------------------------------
section "Boot Integration"
# ---------------------------------------------------------------------------

# Boot extension should call findPreload
BOOT_TS="$PROJECT_DIR/extensions/soma-boot.ts"
if grep -q "findPreload\|loadPreload\|buildPreloadInjection" "$BOOT_TS" 2>/dev/null; then
  pass "boot extension uses preload module"
else
  fail "boot extension doesn't use preload module"
fi

# ---------------------------------------------------------------------------
section "Preload Filename Pattern"
# ---------------------------------------------------------------------------

# preloadFilename() should use session ID in name (unique per session, prevents overwrites)
if grep -A5 "function preloadFilename" "$BOOT_TS" | grep -q "somaSessionId\|generateSessionId"; then
  pass "preloadFilename uses unique session ID"
else
  fail "preloadFilename should use somaSessionId for unique filenames"
fi

# preloadFilename() should have overwrite guard
if grep -A20 "function preloadFilename" "$BOOT_TS" | grep -q "existsSync"; then
  pass "preloadFilename has overwrite guard"
else
  fail "preloadFilename should check for existing files (overwrite guard)"
fi

# ---------------------------------------------------------------------------
echo ""
echo "═══ Results: $PASS/$TOTAL passed, $FAIL failed ═══"
exit $FAIL
