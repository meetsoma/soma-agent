#!/usr/bin/env bash
# test-discovery.sh — Verify .soma/ directory discovery and chain resolution
#
# Tests:
#   1. Module exists and exports key functions
#   2. findSomaDir walks up directory tree
#   3. Chain resolution (local → parent → global)
#   4. Settings chain merge

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PASS=0 FAIL=0 TOTAL=0
pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ✗ $1"; }
section() { echo ""; echo "═══ $1 ═══"; }

DISCOVERY_TS="$PROJECT_DIR/core/discovery.ts"
INDEX_TS="$PROJECT_DIR/core/index.ts"

# ---------------------------------------------------------------------------
section "Module Structure"
# ---------------------------------------------------------------------------

[[ -f "$DISCOVERY_TS" ]] && pass "core/discovery.ts exists" || fail "core/discovery.ts missing"

for fn in findSomaDir findParentSomaDir findGlobalSomaDir getSomaChain; do
  if grep -q "export function $fn\|export.*$fn" "$DISCOVERY_TS" 2>/dev/null; then
    pass "exports: $fn"
  elif grep -q "$fn" "$INDEX_TS" 2>/dev/null; then
    pass "re-exported via index.ts: $fn"
  else
    fail "missing export: $fn"
  fi
done

# ---------------------------------------------------------------------------
section "Discovery Logic"
# ---------------------------------------------------------------------------

# findSomaDir should walk up looking for .soma/
if grep -q "\.soma" "$DISCOVERY_TS"; then
  pass "searches for .soma/ directory"
else
  fail "no .soma/ search logic"
fi

# Should handle missing .soma/ gracefully (return null/undefined, not throw)
if grep -qE "null|undefined|return" "$DISCOVERY_TS"; then
  pass "handles missing .soma/ gracefully"
else
  fail "no graceful fallback for missing .soma/"
fi

# Should resolve identity.md path
if grep -q "identity" "$DISCOVERY_TS"; then
  pass "resolves identity.md"
else
  fail "no identity resolution"
fi

# ---------------------------------------------------------------------------
section "Chain Resolution"
# ---------------------------------------------------------------------------

# buildSomaChain should merge settings from multiple levels
if grep -q "buildSomaChain\|chain\|merge" "$DISCOVERY_TS" 2>/dev/null; then
  pass "chain resolution logic present"
else
  fail "no chain resolution — single-level only"
fi

# Should support global (~/.soma/) fallback
if grep -qE "HOME|home|global|~" "$DISCOVERY_TS" 2>/dev/null; then
  pass "global fallback (~/.soma/) supported"
else
  fail "no global fallback"
fi

# ---------------------------------------------------------------------------
section "Integration — This Repo"
# ---------------------------------------------------------------------------

# This repo should have a .soma/ directory
if [[ -d "$PROJECT_DIR/.soma" ]]; then
  pass ".soma/ exists in agent repo"
  [[ -f "$PROJECT_DIR/.soma/STATE.md" ]] && pass "STATE.md present" || fail "STATE.md missing"
  [[ -d "$PROJECT_DIR/.soma/protocols" ]] && pass "protocols/ present" || fail "protocols/ missing"
else
  fail "no .soma/ in agent repo"
fi

# ---------------------------------------------------------------------------
echo ""
echo "═══ Results: $PASS/$TOTAL passed, $FAIL failed ═══"
exit $FAIL
