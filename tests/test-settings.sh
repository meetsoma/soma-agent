#!/usr/bin/env bash
# Test suite for core/settings.ts conventions
# Run from agent root: bash tests/test-settings.sh

set -euo pipefail

AGENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0 FAIL=0 TOTAL=0
pass() { ((PASS++)); ((TOTAL++)); echo "  ✓ $1"; }
fail() { ((FAIL++)); ((TOTAL++)); echo "  ✗ $1"; }

echo "═══ Settings Module ═══"

SETTINGS_TS="$AGENT_DIR/core/settings.ts"
if [[ -f "$SETTINGS_TS" ]]; then pass "core/settings.ts exists"; else fail "core/settings.ts missing"; fi

for fn in loadSettings loadSettingsFile getDefaultSettings; do
    if grep -q "export function $fn" "$SETTINGS_TS" 2>/dev/null; then
        pass "exports: $fn"
    else
        fail "missing export: $fn"
    fi
done

# Check index.ts exports
if grep -q "from \"./settings.js\"" "$AGENT_DIR/core/index.ts" 2>/dev/null; then
    pass "index.ts exports settings module"
else
    fail "index.ts missing settings export"
fi

# Check soma-boot.ts uses settings
BOOT_TS="$AGENT_DIR/extensions/soma-boot.ts"
if grep -q "loadSettings" "$BOOT_TS" 2>/dev/null; then
    pass "soma-boot.ts loads settings"
else
    fail "soma-boot.ts missing loadSettings"
fi

echo ""
echo "═══ Settings File ═══"

SETTINGS_JSON="$AGENT_DIR/.soma/settings.json"
if [[ -f "$SETTINGS_JSON" ]]; then
    pass "settings.json exists"
    # Check key sections
    for section in protocols muscles heat; do
        if grep -q "\"$section\"" "$SETTINGS_JSON" 2>/dev/null; then
            pass "settings.json has $section section"
        else
            fail "settings.json missing $section section"
        fi
    done
else
    pass "no project settings.json (uses defaults — OK)"
fi

echo ""
echo "═══ Init Template ═══"

INIT_TS="$AGENT_DIR/core/init.ts"
for section in protocols muscles heat; do
    if grep -q "$section:" "$INIT_TS" 2>/dev/null; then
        pass "init.ts writes $section in settings template"
    else
        fail "init.ts missing $section in settings template"
    fi
done

echo ""
echo "═══ Heat Tracking (PI132) ═══"

# Check auto-detect hook
if grep -q "tool_result" "$BOOT_TS" 2>/dev/null; then
    pass "soma-boot.ts has tool_result hook"
else
    fail "soma-boot.ts missing tool_result hook for heat auto-detect"
fi

# Check /pin and /kill commands
if grep -q 'registerCommand("pin"' "$BOOT_TS" 2>/dev/null; then
    pass "soma-boot.ts registers /pin command"
else
    fail "soma-boot.ts missing /pin command"
fi

if grep -q 'registerCommand("kill"' "$BOOT_TS" 2>/dev/null; then
    pass "soma-boot.ts registers /kill command"
else
    fail "soma-boot.ts missing /kill command"
fi

# Check recordHeatEvent imported
if grep -q "recordHeatEvent" "$BOOT_TS" 2>/dev/null; then
    pass "soma-boot.ts imports recordHeatEvent"
else
    fail "soma-boot.ts missing recordHeatEvent"
fi

echo ""
echo "═══════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
echo "═══════════════════════════════"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
