#!/usr/bin/env bash
# Test suite for core/init.ts — scaffolding and template resolution
# Run from agent root: bash tests/test-init.sh

set -euo pipefail

AGENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0 FAIL=0 TOTAL=0
pass() { ((PASS++)); ((TOTAL++)); echo "  ✓ $1"; }
fail() { ((FAIL++)); ((TOTAL++)); echo "  ✗ $1"; }

echo "═══ Init Module ═══"

INIT_TS="$AGENT_DIR/core/init.ts"
if [[ -f "$INIT_TS" ]]; then pass "core/init.ts exists"; else fail "core/init.ts missing"; fi

# Check key exports
for fn in initSoma resolveTemplateDir; do
    if grep -q "export function $fn" "$INIT_TS" 2>/dev/null; then
        pass "exports: $fn"
    else
        fail "missing export: $fn"
    fi
done

# Check template resolution
if grep -q "resolveTemplateDir" "$INIT_TS"; then
    pass "uses template resolution"
else
    fail "no template resolution"
fi

# Check built-in defaults exist (fallback when no templates)
if grep -q "BUILTIN_IDENTITY" "$INIT_TS"; then
    pass "has built-in identity fallback"
else
    fail "missing built-in identity fallback"
fi

if grep -q "BUILTIN_STATE" "$INIT_TS"; then
    pass "has built-in STATE fallback"
else
    fail "missing built-in STATE fallback"
fi

if grep -q "BUILTIN_SETTINGS" "$INIT_TS"; then
    pass "has built-in settings fallback"
else
    fail "missing built-in settings fallback"
fi

# Check placeholder substitution
if grep -q "substitute" "$INIT_TS"; then
    pass "has placeholder substitution"
else
    fail "missing placeholder substitution"
fi

echo ""
echo "═══ Template Files ═══"

TEMPLATE_DIR="$AGENT_DIR/.soma/templates/init"
if [[ -d "$TEMPLATE_DIR" ]]; then
    pass "template directory exists"
else
    fail "template directory missing"
fi

for f in identity.md STATE.md settings.json .gitignore; do
    if [[ -f "$TEMPLATE_DIR/$f" ]]; then
        pass "template: $f"
    else
        fail "missing template: $f"
    fi
done

# Check templates use placeholders
for f in identity.md STATE.md; do
    if grep -q "{{PROJECT_NAME}}" "$TEMPLATE_DIR/$f" 2>/dev/null; then
        pass "$f uses {{PROJECT_NAME}}"
    else
        fail "$f missing {{PROJECT_NAME}} placeholder"
    fi
    if grep -q "{{DATE}}" "$TEMPLATE_DIR/$f" 2>/dev/null; then
        pass "$f uses {{DATE}}"
    else
        fail "$f missing {{DATE}} placeholder"
    fi
done

# Settings template should have heat section
if grep -q "heat" "$TEMPLATE_DIR/settings.json" 2>/dev/null; then
    pass "settings template has heat section"
else
    fail "settings template missing heat section"
fi

if grep -q "muscles" "$TEMPLATE_DIR/settings.json" 2>/dev/null; then
    pass "settings template has muscles section"
else
    fail "settings template missing muscles section"
fi

echo ""
echo "═══ Init Options ═══"

# Check InitOptions has templateDir
if grep -q "templateDir" "$INIT_TS"; then
    pass "InitOptions has templateDir"
else
    fail "InitOptions missing templateDir"
fi

# Check inheritSettings option
if grep -q "inheritSettings" "$INIT_TS"; then
    pass "InitOptions has inheritSettings (for child somas)"
else
    fail "InitOptions missing inheritSettings"
fi

echo ""
echo "═══════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
echo "═══════════════════════════════"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
