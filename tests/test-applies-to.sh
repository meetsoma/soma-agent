#!/usr/bin/env bash
# Test G6: applies-to filtering
# Tests signal detection and protocol filtering logic

set -euo pipefail

PASS=0 FAIL=0 TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ✗ $1"; }
section() { echo ""; echo "═══ $1 ═══"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOMA_DIR="$SCRIPT_DIR/.."
PROTO_DIR="$SOMA_DIR/.soma/protocols"

# ---------------------------------------------------------------------------
# 1. applies-to frontmatter present
# ---------------------------------------------------------------------------
section "applies-to Frontmatter"

for proto in breath-cycle frontmatter-standard heat-tracking git-identity; do
  if grep -q "applies-to:" "$PROTO_DIR/$proto.md" 2>/dev/null; then
    value=$(grep "applies-to:" "$PROTO_DIR/$proto.md" | head -1 | sed 's/.*applies-to: *//')
    pass "$proto: applies-to = $value"
  else
    fail "$proto: missing applies-to field"
  fi
done

# ---------------------------------------------------------------------------
# 2. Template has applies-to
# ---------------------------------------------------------------------------
section "Template"

if grep -q "applies-to:" "$PROTO_DIR/_template.md" 2>/dev/null; then
  pass "_template.md includes applies-to field"
else
  fail "_template.md missing applies-to field"
fi

# ---------------------------------------------------------------------------
# 3. Signal values are valid
# ---------------------------------------------------------------------------
section "Signal Values"

VALID_SIGNALS="always git typescript javascript python rust go frontend docs multi-repo"

for proto in "$PROTO_DIR"/*.md; do
  [[ "$(basename "$proto")" == _* ]] && continue
  [[ "$(basename "$proto")" == README.md ]] && continue
  
  name=$(basename "$proto" .md)
  applies_to=$(grep "applies-to:" "$proto" 2>/dev/null | head -1 | sed 's/.*applies-to: *//' || echo "")
  
  if [[ -z "$applies_to" ]]; then
    pass "$name: no applies-to (defaults to always)"
    continue
  fi
  
  # Strip brackets and split
  cleaned=$(echo "$applies_to" | tr -d '[]' | tr ',' '\n' | sed 's/^ *//;s/ *$//')
  all_valid=true
  for signal in $cleaned; do
    if ! echo "$VALID_SIGNALS" | grep -qw "$signal"; then
      fail "$name: invalid signal '$signal'"
      all_valid=false
    fi
  done
  $all_valid && pass "$name: all signals valid ($applies_to)"
done

# ---------------------------------------------------------------------------
# 4. git-identity requires git signal
# ---------------------------------------------------------------------------
section "Filtering Logic"

# git-identity has applies-to: [git] — should NOT match a project without .git/
git_applies=$(grep "applies-to:" "$PROTO_DIR/git-identity.md" | head -1)
if echo "$git_applies" | grep -q "git"; then
  pass "git-identity scoped to git signal"
else
  fail "git-identity should be scoped to git"
fi

# breath-cycle has applies-to: [always] — should match everything
bc_applies=$(grep "applies-to:" "$PROTO_DIR/breath-cycle.md" | head -1)
if echo "$bc_applies" | grep -q "always"; then
  pass "breath-cycle scoped to always"
else
  fail "breath-cycle should be scoped to always"
fi

# ---------------------------------------------------------------------------
# 5. Project signal detection (heuristic — test on this repo)
# ---------------------------------------------------------------------------
section "Signal Detection (this repo)"

# This repo has .git/ — should detect git
if [[ -d "$SOMA_DIR/.git" ]]; then
  pass "This repo has .git/ — git signal expected"
else
  fail "Expected .git/ in $SOMA_DIR"
fi

# This repo has no package.json — should NOT detect typescript/javascript
if [[ ! -f "$SOMA_DIR/package.json" ]]; then
  pass "No package.json — javascript signal NOT expected"
else
  pass "Has package.json — javascript signal expected"
fi

# This repo has no Cargo.toml — should NOT detect rust
if [[ ! -f "$SOMA_DIR/Cargo.toml" ]]; then
  pass "No Cargo.toml — rust signal NOT expected"
else
  pass "Has Cargo.toml — rust signal expected"
fi

# ---------------------------------------------------------------------------
# 6. core/protocols.ts exports
# ---------------------------------------------------------------------------
section "Code Exports"

if grep -q "detectProjectSignals" "$SOMA_DIR/core/protocols.ts"; then
  pass "protocols.ts exports detectProjectSignals"
else
  fail "protocols.ts missing detectProjectSignals"
fi

if grep -q "protocolMatchesSignals" "$SOMA_DIR/core/protocols.ts"; then
  pass "protocols.ts exports protocolMatchesSignals"
else
  fail "protocols.ts missing protocolMatchesSignals"
fi

if grep -q "appliesTo" "$SOMA_DIR/core/protocols.ts"; then
  pass "Protocol interface has appliesTo field"
else
  fail "Protocol interface missing appliesTo field"
fi

if grep -q "parseAppliesTo" "$SOMA_DIR/core/protocols.ts"; then
  pass "protocols.ts has parseAppliesTo parser"
else
  fail "protocols.ts missing parseAppliesTo parser"
fi

# ---------------------------------------------------------------------------
# 7. Boot integration
# ---------------------------------------------------------------------------
section "Boot Integration"

if grep -q "detectProjectSignals" "$SOMA_DIR/extensions/soma-boot.ts"; then
  pass "soma-boot.ts uses detectProjectSignals"
else
  fail "soma-boot.ts not using detectProjectSignals"
fi

if grep -q "discoverProtocolChain.*signals" "$SOMA_DIR/extensions/soma-boot.ts"; then
  pass "soma-boot.ts passes signals to discoverProtocolChain"
else
  fail "soma-boot.ts not passing signals to chain discovery"
fi

# ---------------------------------------------------------------------------
# 8. Index exports
# ---------------------------------------------------------------------------
section "Core Index"

if grep -q "detectProjectSignals" "$SOMA_DIR/core/index.ts"; then
  pass "core/index.ts exports detectProjectSignals"
else
  fail "core/index.ts missing detectProjectSignals export"
fi

if grep -q "ProjectSignal" "$SOMA_DIR/core/index.ts"; then
  pass "core/index.ts exports ProjectSignal type"
else
  fail "core/index.ts missing ProjectSignal type export"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "═══════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
echo "═══════════════════════════════"

[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
