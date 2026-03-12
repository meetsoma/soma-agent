#!/usr/bin/env bash
# Test suite for core/debug.ts
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0 FAIL=0 TOTAL=0
pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ✗ $1"; }

echo "═══ Debug Module ═══"

DEBUG_TS="$AGENT_DIR/core/debug.ts"
if [[ -f "$DEBUG_TS" ]]; then pass "core/debug.ts exists"; else fail "core/debug.ts missing"; fi

# Check key exports
if grep -q "export function createDebugLogger" "$DEBUG_TS"; then
    pass "exports: createDebugLogger"
else
    fail "missing export: createDebugLogger"
fi

if grep -q "export interface DebugLogger" "$DEBUG_TS"; then
    pass "exports: DebugLogger type"
else
    fail "missing export: DebugLogger type"
fi

# Check it's in barrel
if grep -q "createDebugLogger" "$AGENT_DIR/core/index.ts"; then
    pass "createDebugLogger in barrel export"
else
    fail "createDebugLogger not in barrel"
fi

echo ""
echo "═══ Debug Logger Methods ═══"

for method in "boot" "error" "heat" "systemPrompt" "log"; do
    if grep -q "$method(" "$DEBUG_TS"; then
        pass "logger has method: $method"
    else
        fail "logger missing method: $method"
    fi
done

echo ""
echo "═══ Debug Integration ═══"

BOOT_TS="$AGENT_DIR/extensions/soma-boot.ts"

# Check soma-boot imports debug
if grep -q "createDebugLogger" "$BOOT_TS"; then
    pass "soma-boot imports createDebugLogger"
else
    fail "soma-boot missing createDebugLogger import"
fi

# Check /soma debug subcommand exists
if grep -q 'cmd.startsWith("debug")' "$BOOT_TS" || grep -q 'debugCmd' "$BOOT_TS"; then
    pass "/soma debug subcommand registered"
else
    fail "/soma debug subcommand not found"
fi

# Check debug logs boot steps
if grep -q "debug.boot" "$BOOT_TS"; then
    pass "boot steps are debug-logged"
else
    fail "boot steps not debug-logged"
fi

# Check debug logs system prompt
if grep -q "debug.systemPrompt" "$BOOT_TS"; then
    pass "system prompt is debug-logged"
else
    fail "system prompt not debug-logged"
fi

# Check debug logs heat
if grep -q "debug.heat" "$BOOT_TS"; then
    pass "heat changes are debug-logged"
else
    fail "heat changes not debug-logged"
fi

echo ""
echo "═══ Settings ═══"

SETTINGS_TS="$AGENT_DIR/core/settings.ts"
if grep -q "debug: boolean" "$SETTINGS_TS"; then
    pass "SomaSettings has debug flag"
else
    fail "SomaSettings missing debug flag"
fi

if grep -q "debug: false" "$SETTINGS_TS"; then
    pass "debug defaults to false"
else
    fail "debug default not set"
fi

echo ""
echo "═══ Safety ═══"

# Check SOMA_DEBUG env var support
if grep -q "SOMA_DEBUG" "$DEBUG_TS"; then
    pass "supports SOMA_DEBUG env var"
else
    fail "missing SOMA_DEBUG env var support"
fi

# Check no-op when disabled
if grep -q "() => {}" "$DEBUG_TS"; then
    pass "no-op methods when disabled"
else
    fail "missing no-op for disabled state"
fi

# Check debug/ in gitignore template
if grep -q "debug/" "$AGENT_DIR/core/init.ts"; then
    pass "debug/ in gitignore template"
else
    fail "debug/ not in gitignore template"
fi

echo ""
echo "═══════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
echo "═══════════════════════════════"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
