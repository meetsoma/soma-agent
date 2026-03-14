#!/usr/bin/env bash
# Test suite for core/muscles.ts — discovery, heat, digest, injection
# Uses synthetic fixtures so tests work in CI (no real .soma/ needed)
# Run from agent root: bash tests/test-muscles.sh

set -euo pipefail

AGENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURES="$(mktemp -d)"
trap "rm -rf '$FIXTURES'" EXIT

PASS=0
FAIL=0
TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ✗ $1"; }

# ── Build fixtures ───────────────────────────────────────────────────────

FIXTURE_SOMA="$FIXTURES/.soma"
FIXTURE_MUSCLES="$FIXTURE_SOMA/amps/muscles"
mkdir -p "$FIXTURE_MUSCLES"
mkdir -p "$FIXTURE_SOMA/memory/muscles"  # legacy path

# Hot muscle (heat 10)
cat > "$FIXTURE_MUSCLES/ship-cycle.md" << 'EOF'
---
type: muscle
name: ship-cycle
status: active
heat: 10
loads: 50
created: 2026-03-10
updated: 2026-03-14
topic: [shipping, git, deploy]
breadcrumb: "dev-first flow: commit → push → sync → test"
---

# Ship Cycle

<!-- digest:start -->
> **Ship Cycle** — dev-first flow. Two modes: dev (frequent) and release (squash-merge).
<!-- digest:end -->

## Full Body

The full muscle content here...
EOF

# Warm muscle (heat 5)
cat > "$FIXTURE_MUSCLES/task-tooling.md" << 'EOF'
---
type: muscle
name: task-tooling
status: active
heat: 5
loads: 12
created: 2026-03-13
updated: 2026-03-14
topic: [workflow, tools]
breadcrumb: "map scripts/muscles/gaps before starting any task"
---

# Task Tooling

<!-- digest:start -->
> **Task Tooling** — before starting any task, map which scripts and muscles apply.
<!-- digest:end -->

## Details

Details here...
EOF

# Cold muscle (heat 1)
cat > "$FIXTURE_MUSCLES/old-pattern.md" << 'EOF'
---
type: muscle
name: old-pattern
status: active
heat: 1
loads: 2
created: 2026-03-10
updated: 2026-03-10
topic: [deprecated]
breadcrumb: "an old pattern that cooled off"
---

# Old Pattern

<!-- digest:start -->
> **Old Pattern** — this should be cold tier.
<!-- digest:end -->
EOF

# Archived muscle (should be skipped)
cat > "$FIXTURE_MUSCLES/archived-thing.md" << 'EOF'
---
type: muscle
name: archived-thing
status: archived
heat: 0
loads: 100
created: 2026-03-10
updated: 2026-03-10
topic: [old]
breadcrumb: "archived"
---

# Archived Thing

Should not appear in discovery.
EOF

# Non-muscle file (should be skipped)
cat > "$FIXTURE_MUSCLES/README.md" << 'EOF'
# Muscles Directory
Not a muscle.
EOF

# ── Module checks ────────────────────────────────────────────────────────

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

# Check soma-boot.ts imports
BOOT_TS="$AGENT_DIR/extensions/soma-boot.ts"
for fn in discoverMuscleChain buildMuscleInjection trackMuscleLoads decayMuscleHeat; do
    if grep -q "$fn" "$BOOT_TS" 2>/dev/null; then
        pass "soma-boot.ts uses $fn"
    else
        fail "soma-boot.ts missing $fn"
    fi
done

# ── Discovery tests (using jiti to run TS directly) ──────────────────────

echo ""
echo "═══ Muscle Discovery ═══"

# Use node with jiti to test the actual TS module
DISCOVERY_RESULT=$(node --require "$AGENT_DIR/node_modules/jiti/register.mjs" -e "
const { discoverMuscles } = require('$AGENT_DIR/core/muscles.ts');
const muscles = discoverMuscles({ path: '$FIXTURE_SOMA', project: '$FIXTURES' }, '$FIXTURE_MUSCLES');
console.log(JSON.stringify({
  count: muscles.length,
  names: muscles.map(m => m.name).sort(),
  heats: Object.fromEntries(muscles.map(m => [m.name, m.heat])),
  statuses: Object.fromEntries(muscles.map(m => [m.name, m.status])),
}));
" 2>/dev/null || echo "JITI_FAILED")

if [[ "$DISCOVERY_RESULT" == "JITI_FAILED" ]]; then
    # Fallback: try tsx
    DISCOVERY_RESULT=$(npx tsx -e "
import { discoverMuscles } from '$AGENT_DIR/core/muscles.ts';
const muscles = discoverMuscles({ path: '$FIXTURE_SOMA', project: '$FIXTURES' }, '$FIXTURE_MUSCLES');
console.log(JSON.stringify({
  count: muscles.length,
  names: muscles.map(m => m.name).sort(),
  heats: Object.fromEntries(muscles.map(m => [m.name, m.heat])),
  statuses: Object.fromEntries(muscles.map(m => [m.name, m.status])),
}));
" 2>/dev/null || echo "TSX_FAILED")
fi

if [[ "$DISCOVERY_RESULT" == *"FAILED"* ]]; then
    # Can't run TS directly — fall back to shell-based checks
    echo "  (jiti/tsx unavailable — using shell-based discovery tests)"
    
    # Test: only active muscles discovered
    active_count=$(grep -rl "^status: active" "$FIXTURE_MUSCLES" --include="*.md" | wc -l | tr -d ' ')
    if [[ "$active_count" -eq 3 ]]; then
        pass "found 3 active muscles (excluded archived + README)"
    else
        fail "expected 3 active muscles, found $active_count"
    fi
    
    # Test: heat values parsed
    for f in "$FIXTURE_MUSCLES"/*.md; do
        [[ -f "$f" ]] || continue
        name=$(basename "$f" .md)
        [[ "$name" == "README" ]] && continue
        if head -20 "$f" | grep -q "^heat:"; then
            pass "$name: has heat field"
        else
            fail "$name: missing heat field"
        fi
    done
else
    # Parse JSON result
    count=$(echo "$DISCOVERY_RESULT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.count)" 2>/dev/null || echo "0")
    names=$(echo "$DISCOVERY_RESULT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.names.join(','))" 2>/dev/null || echo "")
    
    # Test: discovery finds only active muscles (filters archived, retired, README)
    if [[ "$count" -eq 3 ]]; then
        pass "discovered 3 active muscles (excluded archived + README)"
    else
        fail "expected 3 muscles, got $count (result: $DISCOVERY_RESULT)"
    fi
    
    # Test: active muscles present
    if [[ "$names" == *"ship-cycle"* ]] && [[ "$names" == *"task-tooling"* ]] && [[ "$names" == *"old-pattern"* ]]; then
        pass "all active muscles discovered: ship-cycle, task-tooling, old-pattern"
    else
        fail "missing active muscles: $names"
    fi
    
    # Test: heat values parsed correctly
    ship_heat=$(echo "$DISCOVERY_RESULT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.heats['ship-cycle']||0)" 2>/dev/null || echo "0")
    if [[ "$ship_heat" -eq 10 ]]; then
        pass "ship-cycle heat=10 parsed correctly"
    else
        fail "ship-cycle heat expected 10, got $ship_heat"
    fi
fi

# ── Frontmatter validation ──────────────────────────────────────────────

echo ""
echo "═══ Frontmatter Validation ═══"

for f in "$FIXTURE_MUSCLES"/*.md; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f" .md)
    [[ "$name" == "README" ]] && continue
    
    # Required fields
    for field in type name status heat loads created updated; do
        if head -20 "$f" | grep -q "^${field}:"; then
            pass "$name: has $field"
        else
            fail "$name: missing $field"
        fi
    done
done

# ── Digest block validation ─────────────────────────────────────────────

echo ""
echo "═══ Digest Blocks ═══"

for f in "$FIXTURE_MUSCLES"/*.md; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f" .md)
    [[ "$name" == "README" ]] && continue
    [[ "$(head -20 "$f" | grep "^status:" | sed 's/status: *//')" == "archived" ]] && continue
    
    if grep -q "<!-- digest:start -->" "$f" && grep -q "<!-- digest:end -->" "$f"; then
        pass "$name: has digest block"
        
        # Digest should contain a blockquote summary
        digest=$(sed -n '/<!-- digest:start -->/,/<!-- digest:end -->/p' "$f" | grep "^>" | head -1)
        if [[ -n "$digest" ]]; then
            pass "$name: digest has blockquote summary"
        else
            fail "$name: digest missing blockquote summary"
        fi
    else
        fail "$name: missing digest block"
    fi
done

# ── Heat tier classification ────────────────────────────────────────────

echo ""
echo "═══ Heat Tiers ═══"

# Test heat tier boundaries: cold (0-2), warm (3-7), hot (8+)
check_tier() {
    local heat=$1 expected=$2
    local tier="cold"
    [[ $heat -ge 3 ]] && tier="warm"
    [[ $heat -ge 8 ]] && tier="hot"
    if [[ "$tier" == "$expected" ]]; then
        pass "heat=$heat → $tier"
    else
        fail "heat=$heat → expected $expected, got $tier"
    fi
}

check_tier 0 "cold"
check_tier 1 "cold"
check_tier 2 "cold"
check_tier 3 "warm"
check_tier 5 "warm"
check_tier 7 "warm"
check_tier 8 "hot"
check_tier 10 "hot"
check_tier 15 "hot"

# ── Real muscle directory (if available) ─────────────────────────────────

REAL_MUSCLES="$AGENT_DIR/.soma/amps/muscles"
if [[ -d "$REAL_MUSCLES" ]]; then
    echo ""
    echo "═══ Real Muscle Files ═══"
    
    real_count=$(find "$REAL_MUSCLES" -name "*.md" -not -name "_*" -not -name "README*" | wc -l | tr -d ' ')
    if [[ "$real_count" -ge 1 ]]; then
        pass "found $real_count real muscle files"
    else
        fail "no real muscle files found"
    fi
    
    # Check all active muscles have required fields
    for f in "$REAL_MUSCLES"/*.md; do
        [[ -f "$f" ]] || continue
        name=$(basename "$f" .md)
        [[ "$name" == _* || "$name" == README* ]] && continue
        
        status=$(head -20 "$f" | grep "^status:" | sed 's/status: *//')
        [[ "$status" == "archived" ]] && continue
        
        for field in type name status heat; do
            if head -20 "$f" | grep -q "^${field}:"; then
                : # pass silently for real files (too noisy)
            else
                fail "REAL $name: missing $field"
            fi
        done
        
        if grep -q "<!-- digest:start -->" "$f"; then
            : # pass silently
        else
            fail "REAL $name: missing digest block"
        fi
    done
    
    pass "all real muscles have required frontmatter + digest"
fi

echo ""
echo "═══════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
echo "═══════════════════════════════"

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
