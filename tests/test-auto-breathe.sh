#!/usr/bin/env bash
# test-auto-breathe.sh — Verify auto-breathe settings, code paths, and /auto-breathe command
#
# Tests:
#   1. Settings — breathe defaults, type definitions, merge behavior
#   2. Extension wiring — pendingFollowUps queue, initiateBreathe, phase detection
#   3. /auto-breathe command — registered, completions, persistence logic
#   4. Safety net — 85% emergency always active regardless of breathe.auto
#   5. Integration — settings ↔ extension ↔ command coherence
#
# Usage: bash tests/test-auto-breathe.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BOOT_TS="$PROJECT_DIR/extensions/soma-boot.ts"
SETTINGS_TS="$PROJECT_DIR/core/settings.ts"

PASS=0 FAIL=0 TOTAL=0
pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ✗ $1"; }
section() { echo ""; echo "═══ $1 ═══"; }

# ---------------------------------------------------------------------------
# 1. Settings — Type Definitions & Defaults
# ---------------------------------------------------------------------------
section "Settings: Type Definitions"

# breathe type exists in SomaSettings
if grep -q "breathe:" "$SETTINGS_TS" && grep -A5 "breathe:" "$SETTINGS_TS" | grep -q "auto: boolean"; then
  pass "SomaSettings has breathe.auto: boolean"
else
  fail "SomaSettings missing breathe.auto type"
fi

if grep -A5 "breathe:" "$SETTINGS_TS" | grep -q "triggerAt: number"; then
  pass "SomaSettings has breathe.triggerAt: number"
else
  fail "SomaSettings missing breathe.triggerAt type"
fi

if grep -A10 "breathe:" "$SETTINGS_TS" | grep -q "rotateAt: number"; then
  pass "SomaSettings has breathe.rotateAt: number"
else
  fail "SomaSettings missing breathe.rotateAt type"
fi

section "Settings: Defaults"

# Check defaults are sensible
if grep -A4 "breathe:" "$SETTINGS_TS" | grep -q "auto: false"; then
  pass "Default: breathe.auto = false (opt-in)"
else
  fail "Default breathe.auto should be false"
fi

if grep -A4 "breathe:" "$SETTINGS_TS" | grep -q "triggerAt: 50"; then
  pass "Default: breathe.triggerAt = 50"
else
  fail "Default breathe.triggerAt should be 50"
fi

if grep -A4 "breathe:" "$SETTINGS_TS" | grep -q "rotateAt: 70"; then
  pass "Default: breathe.rotateAt = 70"
else
  fail "Default breathe.rotateAt should be 70"
fi

# triggerAt < rotateAt < autoExhaleAt (85)
# Extract defaults from the DEFAULTS block (second occurrence of breathe:)
trigger=$(awk '/DEFAULTS/,0' "$SETTINGS_TS" | grep "triggerAt:" | head -1 | grep -o '[0-9]*')
rotate=$(awk '/DEFAULTS/,0' "$SETTINGS_TS" | grep "rotateAt:" | head -1 | grep -o '[0-9]*')
exhale=$(awk '/DEFAULTS/,0' "$SETTINGS_TS" | grep "autoExhaleAt:" | head -1 | grep -o '[0-9]*')
if [[ -n "$trigger" && -n "$rotate" && -n "$exhale" ]] && (( trigger < rotate && rotate < exhale )); then
  pass "Threshold ordering: triggerAt($trigger) < rotateAt($rotate) < autoExhaleAt($exhale)"
else
  fail "Threshold ordering broken: trigger=$trigger rotate=$rotate exhale=$exhale"
fi

# ---------------------------------------------------------------------------
# 2. Extension Wiring — Race Condition Fix
# ---------------------------------------------------------------------------
section "Extension: Race Condition Fix (pendingFollowUps)"

# pendingFollowUps queue exists
if grep -q "let pendingFollowUps: string\[\] = \[\]" "$BOOT_TS"; then
  pass "pendingFollowUps queue declared"
else
  fail "pendingFollowUps queue missing — race condition not fixed"
fi

# initiateBreathe sets breathePending (callers handle messaging)
if grep -A15 "const initiateBreathe" "$BOOT_TS" | grep -q "breathePending = true"; then
  pass "initiateBreathe sets breathePending flag"
else
  fail "initiateBreathe should set breathePending flag"
fi

# initiateBreathe does NOT call sendUserMessage or push to pendingFollowUps
# (callers decide notification strategy — some rotate with zero tokens)
if grep -A15 "const initiateBreathe" "$BOOT_TS" | grep -q "pendingFollowUps\|sendUserMessage"; then
  fail "initiateBreathe should not push messages — callers handle notification"
else
  pass "initiateBreathe delegates messaging to callers (zero-token rotation possible)"
fi

# agent_end flushes pendingFollowUps
if grep -A15 '"agent_end"' "$BOOT_TS" | grep -q "pendingFollowUps"; then
  pass "agent_end flushes pendingFollowUps"
else
  fail "agent_end does not flush pendingFollowUps"
fi

# agent_end uses deliverAs: followUp
if grep -A15 '"agent_end"' "$BOOT_TS" | grep -q 'deliverAs.*followUp'; then
  pass "agent_end sends with deliverAs: followUp"
else
  fail "agent_end should use deliverAs: followUp"
fi

# pendingFollowUps reset on session_switch
if grep -A30 '"session_switch"' "$BOOT_TS" | grep -q "pendingFollowUps = \[\]"; then
  pass "pendingFollowUps reset on session_switch"
else
  fail "pendingFollowUps not reset on session_switch — leaks between sessions"
fi

# ---------------------------------------------------------------------------
# 3. Extension: Auto-Breathe Phases
# ---------------------------------------------------------------------------
section "Extension: Auto-Breathe Phases"

# Phase 1: triggerAt detection
if grep -q "pct >= breatheSettings.triggerAt" "$BOOT_TS"; then
  pass "Phase 1: triggerAt threshold check exists"
else
  fail "Phase 1: triggerAt threshold check missing"
fi

# Phase 1: fires soma:recall event
if grep -q 'soma:recall.*auto-breathe-trigger' "$BOOT_TS"; then
  pass "Phase 1: emits soma:recall event"
else
  fail "Phase 1: should emit soma:recall for steno integration"
fi

# Phase 1: only fires once (autoBreatheTriggerSent guard)
if grep -q "autoBreatheTriggerSent" "$BOOT_TS"; then
  pass "Phase 1: dedup guard (autoBreatheTriggerSent)"
else
  fail "Phase 1: missing dedup guard — will fire every turn"
fi

# Phase 2: rotateAt detection
if grep -q "pct >= breatheSettings.rotateAt" "$BOOT_TS"; then
  pass "Phase 2: rotateAt threshold check exists"
else
  fail "Phase 2: rotateAt threshold check missing"
fi

# Phase 2: calls initiateBreathe
if grep -A20 "autoBreatheRotateSent = true" "$BOOT_TS" | grep -q "initiateBreathe"; then
  pass "Phase 2: triggers breathe rotation"
else
  fail "Phase 2: should trigger breathe rotation"
fi

# Phase 2: only fires once (autoBreatheRotateSent guard)
if grep -q "autoBreatheRotateSent" "$BOOT_TS"; then
  pass "Phase 2: dedup guard (autoBreatheRotateSent)"
else
  fail "Phase 2: missing dedup guard"
fi

# Phase order: triggerAt check must be AFTER rotateAt (higher threshold first)
trigger_line=$(grep -n "breatheSettings.triggerAt" "$BOOT_TS" | head -1 | cut -d: -f1)
rotate_line=$(grep -n "breatheSettings.rotateAt" "$BOOT_TS" | head -1 | cut -d: -f1)
if [[ -n "$trigger_line" && -n "$rotate_line" ]] && (( rotate_line < trigger_line )); then
  pass "Phase order: rotateAt checked before triggerAt (higher wins)"
else
  fail "Phase order wrong: rotateAt should be checked first (higher threshold takes priority)"
fi

# ---------------------------------------------------------------------------
# 4. Safety Net — Always Active
# ---------------------------------------------------------------------------
section "Extension: Safety Net (85%)"

# 85% check exists and is outside the breatheSettings.auto block
if grep -q "autoExhaleAt" "$BOOT_TS" && grep -q "autoFlushSent" "$BOOT_TS"; then
  pass "Safety net: autoExhaleAt threshold check exists"
else
  fail "Safety net: missing autoExhaleAt check"
fi

# Safety net calls initiateBreathe for emergency
if grep -A10 "auto-breathe-emergency" "$BOOT_TS" | grep -q "initiateBreathe"; then
  pass "Safety net: calls initiateBreathe for emergency rotation"
else
  fail "Safety net: should call initiateBreathe for emergency"
fi

# Safety net handles breathePending (already rotating)
if grep -A15 "autoFlushSent = true" "$BOOT_TS" | grep -q "breathePending"; then
  pass "Safety net: checks if breathe already in progress"
else
  fail "Safety net: should check breathePending to avoid double-fire"
fi

# ---------------------------------------------------------------------------
# 5. /auto-breathe Command
# ---------------------------------------------------------------------------
section "Command: /auto-breathe"

# Command registered
if grep -q 'registerCommand("auto-breathe"' "$BOOT_TS"; then
  pass "/auto-breathe command registered"
else
  fail "/auto-breathe command not registered"
fi

# Has completions
if grep -A5 'registerCommand("auto-breathe"' "$BOOT_TS" | grep -q "getArgumentCompletions"; then
  pass "/auto-breathe has argument completions"
else
  fail "/auto-breathe missing argument completions"
fi

# Supports on/off/status
for arg in "on" "off" "status"; do
  if grep -A50 'registerCommand("auto-breathe"' "$BOOT_TS" | grep -q "\"$arg\""; then
    pass "/auto-breathe supports '$arg'"
  else
    fail "/auto-breathe missing '$arg' handler"
  fi
done

# Persists to settings.json
if grep -A60 'registerCommand("auto-breathe"' "$BOOT_TS" | grep -q "writeFileSync"; then
  pass "/auto-breathe persists to settings.json"
else
  fail "/auto-breathe should persist to settings.json"
fi

# Updates in-memory settings
if grep -A60 'registerCommand("auto-breathe"' "$BOOT_TS" | grep -q "settings.*breathe.*auto.*value"; then
  pass "/auto-breathe updates in-memory settings"
else
  # Check alternate pattern
  if grep -A60 'registerCommand("auto-breathe"' "$BOOT_TS" | grep -q "breathe.*auto = value"; then
    pass "/auto-breathe updates in-memory settings"
  else
    fail "/auto-breathe should update in-memory settings"
  fi
fi

# ---------------------------------------------------------------------------
# 6. Passive Warnings — Only When Auto-Breathe Off
# ---------------------------------------------------------------------------
section "Extension: Passive Warnings"

# Passive warnings gated behind !breatheSettings.auto
if grep -q '!breatheSettings.auto' "$BOOT_TS"; then
  pass "Passive warnings only fire when auto-breathe is off"
else
  fail "Passive warnings should be gated by !breatheSettings.auto"
fi

# ---------------------------------------------------------------------------
# 7. State Reset — Session Switch & Init
# ---------------------------------------------------------------------------
section "Extension: State Reset"

for var in autoBreatheTriggerSent autoBreatheRotateSent breathePending breatheTurnCount; do
  if grep -A40 '"session_switch"' "$BOOT_TS" | grep -q "$var"; then
    pass "session_switch resets $var"
  else
    fail "session_switch does not reset $var"
  fi
done

# ---------------------------------------------------------------------------
# 8. Documentation
# ---------------------------------------------------------------------------
section "Documentation"

DOCS_DIR="$PROJECT_DIR/docs"

# configuration.md documents breathe settings
if grep -q "### Auto-Breathe" "$DOCS_DIR/configuration.md" 2>/dev/null; then
  pass "configuration.md has Auto-Breathe section"
else
  fail "configuration.md missing Auto-Breathe section"
fi

# configuration.md full reference includes breathe
if grep -q '"breathe"' "$DOCS_DIR/configuration.md" 2>/dev/null; then
  pass "configuration.md full reference includes breathe"
else
  fail "configuration.md full reference missing breathe"
fi

# commands.md documents /auto-breathe
if grep -q "auto-breathe" "$DOCS_DIR/commands.md" 2>/dev/null; then
  pass "commands.md documents /auto-breathe"
else
  fail "commands.md missing /auto-breathe"
fi

# how-it-works.md mentions auto-breathe
if grep -qi "auto-breathe\|auto.breathe" "$DOCS_DIR/how-it-works.md" 2>/dev/null; then
  pass "how-it-works.md mentions auto-breathe"
else
  fail "how-it-works.md missing auto-breathe"
fi

# CHANGELOG mentions auto-breathe
if grep -qi "auto-breathe\|auto.breathe" "$PROJECT_DIR/CHANGELOG.md" 2>/dev/null; then
  pass "CHANGELOG mentions auto-breathe"
else
  fail "CHANGELOG missing auto-breathe"
fi

# ---------------------------------------------------------------------------
# 9. Integration: Settings ↔ Extension ↔ Command Coherence
# ---------------------------------------------------------------------------
section "Integration: Coherence"

# Extension reads breathe from settings (not hardcoded)
if grep -q "settings?.breathe\|settings.breathe" "$BOOT_TS"; then
  pass "Extension reads breathe from settings object"
else
  fail "Extension should read breathe from settings, not hardcode"
fi

# Extension has fallback defaults matching settings.ts
if grep -q "auto: false, triggerAt: 50, rotateAt: 70" "$BOOT_TS"; then
  pass "Extension fallback defaults match settings.ts defaults"
else
  fail "Extension fallback defaults don't match settings.ts"
fi

# Command reads from same settings object as extension
if grep -A10 'registerCommand("auto-breathe"' "$BOOT_TS" | grep -q "settings.*breathe"; then
  pass "Command reads from same settings object as extension"
else
  fail "Command should read from shared settings object"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
echo "═══════════════════════════════════════════════════════"

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
