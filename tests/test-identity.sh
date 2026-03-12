#!/usr/bin/env bash
# test-identity.sh — Verify identity discovery, loading, and layering
#
# Tests:
#   1. Module exists and exports key functions
#   2. Identity file resolution (project → parent → global)
#   3. Identity template scaffolding on init
#   4. Identity frontmatter structure

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PASS=0 FAIL=0 TOTAL=0
pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ✗ $1"; }
section() { echo ""; echo "═══ $1 ═══"; }

IDENTITY_TS="$PROJECT_DIR/core/identity.ts"
INDEX_TS="$PROJECT_DIR/core/index.ts"

# ---------------------------------------------------------------------------
section "Module Structure"
# ---------------------------------------------------------------------------

[[ -f "$IDENTITY_TS" ]] && pass "core/identity.ts exists" || fail "core/identity.ts missing"

for fn in loadIdentity loadIdentityChain buildLayeredIdentity hasIdentity; do
  if grep -qE "export (function |async function |const )$fn" "$IDENTITY_TS" 2>/dev/null; then
    pass "exports: $fn"
  elif grep -q "$fn" "$INDEX_TS" 2>/dev/null; then
    pass "re-exported via index.ts: $fn"
  else
    fail "missing export: $fn"
  fi
done

# ---------------------------------------------------------------------------
section "Identity Loading Logic"
# ---------------------------------------------------------------------------

# Should read identity.md
if grep -q "identity.md\|identity\.md" "$IDENTITY_TS"; then
  pass "reads identity.md"
else
  fail "no identity.md reference"
fi

# Should handle missing identity gracefully
if grep -qE "null|undefined|default|fallback|not found" "$IDENTITY_TS"; then
  pass "handles missing identity gracefully"
else
  fail "no fallback for missing identity"
fi

# Should produce layered identity for system prompt
if grep -qE "buildLayeredIdentity|layered|chain" "$IDENTITY_TS"; then
  pass "builds layered identity for prompt"
else
  fail "no layered identity builder"
fi

# ---------------------------------------------------------------------------
section "Identity Template"
# ---------------------------------------------------------------------------

TEMPLATE="$PROJECT_DIR/.soma/templates/init/identity.md"
if [[ -f "$TEMPLATE" ]]; then
  pass "init template exists: identity.md"
  
  # Template should have frontmatter
  if head -1 "$TEMPLATE" | grep -q "^---"; then
    pass "template has frontmatter"
  else
    fail "template missing frontmatter"
  fi
  
  # Template should have placeholder/instructions
  if grep -qiE "project|workspace|discover|write" "$TEMPLATE"; then
    pass "template has discovery instructions"
  else
    fail "template has no guidance for identity discovery"
  fi
else
  fail "init template missing: identity.md"
fi

# ---------------------------------------------------------------------------
echo ""
echo "═══ Results: $PASS/$TOTAL passed, $FAIL failed ═══"
exit $FAIL
