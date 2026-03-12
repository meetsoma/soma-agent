#!/usr/bin/env bash
# Test suite for core/muscles.ts conventions and muscle files
# Tests frontmatter, digest blocks, file structure
# Run from agent root: bash tests/test-muscles.sh

set -euo pipefail

AGENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MUSCLE_DIR="$AGENT_DIR/.soma/memory/muscles"

PASS=0
FAIL=0
TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ✗ $1"; }

echo "═══ Muscle File Discovery ═══"

# Muscle directory exists
if [[ -d "$MUSCLE_DIR" ]]; then
    pass "muscle directory exists"
else
    if [[ -n "${CI:-}" || -n "${GITHUB_ACTIONS:-}" ]]; then
        pass "muscle directory absent (CI — gitignored, skipping muscle tests)"
        echo "═══════════════════════════════"
        echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
        echo "═══════════════════════════════"
        exit 0
    fi
    pass "muscle directory absent (gitignored, personal — skipping muscle file tests)"
    echo "═══════════════════════════════"
    echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
    echo "═══════════════════════════════"
    exit 0
fi

# Count muscles
MUSCLE_COUNT=$(find "$MUSCLE_DIR" -name "*.md" -not -name "_*" -not -name ".*" | wc -l | tr -d ' ')
if [[ "$MUSCLE_COUNT" -ge 1 ]]; then
    pass "found $MUSCLE_COUNT muscle files"
else
    fail "no muscle files found"
fi

echo ""
echo "═══ Muscle Frontmatter ═══"

for f in "$MUSCLE_DIR"/*.md; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f" .md)

    # Check type: muscle
    if head -20 "$f" | grep -q "^type: muscle"; then
        pass "$name: type: muscle"
    else
        fail "$name: missing type: muscle"
    fi

    # Check status field
    if head -20 "$f" | grep -q "^status:"; then
        pass "$name: has status"
    else
        fail "$name: missing status field"
    fi

    # Check topic field
    if head -20 "$f" | grep -q "^topic:"; then
        pass "$name: has topic"
    else
        fail "$name: missing topic field"
    fi

    # Check heat field
    if head -20 "$f" | grep -q "^heat:"; then
        pass "$name: has heat"
    else
        fail "$name: missing heat field"
    fi

    # Check loads field
    if head -20 "$f" | grep -q "^loads:"; then
        pass "$name: has loads"
    else
        fail "$name: missing loads field"
    fi
done

echo ""
echo "═══ Muscle Digest Blocks ═══"

for f in "$MUSCLE_DIR"/*.md; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f" .md)

    # Check for digest block (expected for all muscles)
    if grep -q "<!-- digest:start -->" "$f" && grep -q "<!-- digest:end -->" "$f"; then
        pass "$name: has digest block"
    else
        fail "$name: missing digest block (PI133)"
    fi
done

echo ""
echo "═══ Muscle Module (muscles.ts) ═══"

MUSCLES_TS="$AGENT_DIR/core/muscles.ts"
if [[ -f "$MUSCLES_TS" ]]; then
    pass "core/muscles.ts exists"
else
    fail "core/muscles.ts missing"
fi

# Check key exports
for fn in discoverMuscles discoverMuscleChain buildMuscleInjection trackMuscleLoads bumpMuscleHeat decayMuscleHeat; do
    if grep -q "export function $fn" "$MUSCLES_TS" 2>/dev/null; then
        pass "exports: $fn"
    else
        fail "missing export: $fn"
    fi
done

# Check index.ts exports muscles
INDEX_TS="$AGENT_DIR/core/index.ts"
if grep -q "from \"./muscles.js\"" "$INDEX_TS" 2>/dev/null; then
    pass "index.ts exports muscles module"
else
    fail "index.ts missing muscles export"
fi

# Check soma-boot.ts imports muscles
BOOT_TS="$AGENT_DIR/extensions/soma-boot.ts"
if grep -q "discoverMuscleChain" "$BOOT_TS" 2>/dev/null; then
    pass "soma-boot.ts imports muscle functions"
else
    fail "soma-boot.ts missing muscle imports"
fi

if grep -q "buildMuscleInjection" "$BOOT_TS" 2>/dev/null; then
    pass "soma-boot.ts uses buildMuscleInjection"
else
    fail "soma-boot.ts missing buildMuscleInjection usage"
fi

if grep -q "trackMuscleLoads" "$BOOT_TS" 2>/dev/null; then
    pass "soma-boot.ts tracks muscle loads"
else
    fail "soma-boot.ts missing trackMuscleLoads"
fi

if grep -q "decayMuscleHeat" "$BOOT_TS" 2>/dev/null; then
    pass "soma-boot.ts decays muscle heat"
else
    fail "soma-boot.ts missing decayMuscleHeat"
fi

echo ""
echo "═══════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
echo "═══════════════════════════════"

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
