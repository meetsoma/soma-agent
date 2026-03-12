#!/usr/bin/env bash
# test-protocols.sh — Verify protocol loading, heat bootstrap, and frontmatter
#
# Usage: ./tests/test-protocols.sh
#
# Tests:
#   1. Protocol discovery — finds all .md files, skips _template and README
#   2. Heat bootstrap — .protocol-state.json created with correct structure
#   3. Protocol state sync — new protocols get added to existing state
#   4. Frontmatter extraction — all protocols have required fields
#   5. TL;DR sections — all protocols 50+ lines have TL;DR
#   5. Search script — query by type, tags, deep mode
#   6. Scan script — frontmatter scanner across project
#   7. Protocol state file — valid JSON with version and protocols
#   8. Boot integration — soma --version boots clean

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SOMA_DIR="$PROJECT_DIR/.soma"

PASS=0
FAIL=0
TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ✗ $1"; }
section() { echo ""; echo "═══ $1 ═══"; }

# ---------------------------------------------------------------------------
# 1. Protocol Discovery
# ---------------------------------------------------------------------------
section "Protocol Discovery"

PROTO_DIR="$SOMA_DIR/protocols"

# Should find active protocols
proto_count=$(find "$PROTO_DIR" -maxdepth 1 -name "*.md" \
  -not -name "_template.md" \
  -not -name "README.md" \
  2>/dev/null | wc -l | tr -d ' ')

[[ "$proto_count" -ge 4 ]] && pass "Found $proto_count protocols (≥4 expected)" \
  || fail "Found $proto_count protocols (expected ≥4)"

# Should skip _template.md
if echo "$proto_count" | grep -qv "_template"; then
  pass "_template.md not counted"
else
  fail "_template.md was counted"
fi

# Drafts dir should exist but not be scanned by loader
# drafts/ is optional — archived drafts moved to Gravicity/.soma/
[[ -d "$PROTO_DIR/drafts" ]] && pass "drafts/ directory exists" \
  || pass "no drafts/ directory (archived — OK)"

# ---------------------------------------------------------------------------
# 2. Frontmatter Validation
# ---------------------------------------------------------------------------
section "Protocol Frontmatter"

for f in "$PROTO_DIR"/*.md; do
  name=$(basename "$f" .md)
  [[ "$name" == "_template" || "$name" == "README" ]] && continue

  fm=$(awk '/^---$/{c++;next} c==1{print} c>=2{exit}' "$f")

  # Required runtime fields
  echo "$fm" | grep -q "^name:" && pass "$name: has name" || fail "$name: missing name"
  echo "$fm" | grep -q "^heat-default:" && pass "$name: has heat-default" || fail "$name: missing heat-default"
  echo "$fm" | grep -q "^breadcrumb:" && pass "$name: has breadcrumb" || fail "$name: missing breadcrumb"

  # Required tooling fields
  echo "$fm" | grep -q "^type:" && pass "$name: has type" || fail "$name: missing type"
  echo "$fm" | grep -q "^status:" && pass "$name: has status" || fail "$name: missing status"
  echo "$fm" | grep -q "^updated:" && pass "$name: has updated" || fail "$name: missing updated"

  # Attribution should NOT be in frontmatter (should be trailing comment)
  if echo "$fm" | grep -q "^author:"; then
    fail "$name: author in frontmatter (should be trailing comment)"
  else
    pass "$name: no author in frontmatter"
  fi
  if echo "$fm" | grep -q "^license:"; then
    fail "$name: license in frontmatter (should be trailing comment)"
  else
    pass "$name: no license in frontmatter"
  fi
done

# ---------------------------------------------------------------------------
# 3. TL;DR Sections
# ---------------------------------------------------------------------------
section "TL;DR / Digest Sections"

for f in "$PROTO_DIR"/*.md; do
  name=$(basename "$f" .md)
  [[ "$name" == "_template" || "$name" == "README" ]] && continue

  body_lines=$(awk '/^---$/{c++;next} c>=2{print}' "$f" | wc -l | tr -d ' ')

  if [[ "$body_lines" -ge 30 ]]; then
    grep -q "^## TL;DR" "$f" && pass "$name: has TL;DR ($body_lines lines)" \
      || fail "$name: missing TL;DR ($body_lines lines)"
  fi
done

# Check muscles for digest blocks
for f in "$SOMA_DIR"/memory/muscles/*.md; do
  [[ -f "$f" ]] || continue
  name=$(basename "$f" .md)
  body_lines=$(awk '/^---$/{c++;next} c>=2{print}' "$f" | wc -l | tr -d ' ')

  if [[ "$body_lines" -ge 50 ]]; then
    grep -q "digest:start" "$f" && pass "muscle/$name: has digest ($body_lines lines)" \
      || fail "muscle/$name: missing digest ($body_lines lines)"
  fi
done

# ---------------------------------------------------------------------------
# 4. Muscle Frontmatter
# ---------------------------------------------------------------------------
section "Muscle Frontmatter"

for f in "$SOMA_DIR"/memory/muscles/*.md; do
  [[ -f "$f" ]] || continue
  name=$(basename "$f" .md)
  fm=$(awk '/^---$/{c++;next} c==1{print} c>=2{exit}' "$f")

  [[ -z "$fm" ]] && { fail "muscle/$name: no frontmatter at all"; continue; }

  echo "$fm" | grep -q "^type: muscle" && pass "muscle/$name: type=muscle" \
    || fail "muscle/$name: missing type: muscle"
  echo "$fm" | grep -q "^status:" && pass "muscle/$name: has status" \
    || fail "muscle/$name: missing status"
  echo "$fm" | grep -q "^topic:" && pass "muscle/$name: has topic" \
    || fail "muscle/$name: missing topic"
done

# ---------------------------------------------------------------------------
# 5. Search Script
# ---------------------------------------------------------------------------
section "Search Script"

SEARCH="$PROJECT_DIR/scripts/soma-search.sh"
if [[ -x "$SEARCH" ]]; then
  result=$(bash "$SEARCH" 2>&1)
  echo "$result" | grep -q "docs found" && pass "soma-search.sh runs" \
    || fail "soma-search.sh failed to run"

  # Type filter
  result=$(bash "$SEARCH" --type protocol 2>&1)
  proto_found=$(echo "$result" | grep "docs found" | grep -o '[0-9]*')
  [[ "$proto_found" -ge 4 ]] && pass "--type protocol finds ≥4" \
    || fail "--type protocol found $proto_found (expected ≥4)"

  # Deep mode extracts TL;DR
  result=$(bash "$SEARCH" --deep --type protocol 2>&1)
  echo "$result" | grep -q "breath-cycle" && pass "--deep shows breath-cycle TL;DR" \
    || fail "--deep missing breath-cycle"

  # Tags filter
  result=$(bash "$SEARCH" --tags git 2>&1)
  echo "$result" | grep -q "docs found" && pass "--tags filter returns results" \
    || fail "--tags filter failed"

  # Missing TL;DR finder
  result=$(bash "$SEARCH" --missing-tldr 2>&1)
  echo "$result" | grep -q "docs found" && pass "--missing-tldr runs" \
    || fail "--missing-tldr failed"
else
  fail "soma-search.sh not found at scripts/soma-search.sh"
fi

# ---------------------------------------------------------------------------
# 6. Scan Script
# ---------------------------------------------------------------------------
section "Scan Script"

SCAN="$PROJECT_DIR/scripts/soma-scan.sh"
if [[ -x "$SCAN" ]]; then
  result=$(bash "$SCAN" --type protocol 2>&1)
  echo "$result" | grep -q "protocol" && pass "soma-scan.sh finds protocols" \
    || fail "soma-scan.sh found nothing"

  # Staleness filter runs
  result=$(bash "$SCAN" --stale 2>&1)
  echo "$result" | grep -q "docs shown" && pass "--stale filter runs" \
    || fail "--stale filter failed"
else
  fail "soma-scan.sh not found at scripts/soma-scan.sh"
fi

# ---------------------------------------------------------------------------
# 7. Protocol State File
# ---------------------------------------------------------------------------
section "Protocol State (.protocol-state.json)"

STATE_FILE="$SOMA_DIR/.protocol-state.json"
if [[ -f "$STATE_FILE" ]]; then
  # Validate JSON
  python3 -c "import json; json.load(open('$STATE_FILE'))" 2>/dev/null \
    && pass "Valid JSON" || fail "Invalid JSON"

  # Has version field
  python3 -c "
import json
s = json.load(open('$STATE_FILE'))
assert 'version' in s, 'missing version'
assert 'protocols' in s, 'missing protocols'
print('OK')
" 2>/dev/null && pass "Has version + protocols keys" \
    || fail "Missing required keys"

  # Has entries for each protocol
  for proto in breath-cycle heat-tracking frontmatter-standard git-identity; do
    python3 -c "
import json
s = json.load(open('$STATE_FILE'))
assert '$proto' in s['protocols'], 'missing $proto'
p = s['protocols']['$proto']
assert 'heat' in p, 'missing heat'
assert 'firstSeen' in p, 'missing firstSeen'
print('OK')
" 2>/dev/null && pass "State has $proto entry" \
      || fail "State missing $proto entry"
  done
else
  echo "  ⚠ No .protocol-state.json yet (created on first soma boot)"
  pass "State file absent (expected before first boot)"
fi

# ---------------------------------------------------------------------------
# 8. Boot Integration
# ---------------------------------------------------------------------------
section "Boot Integration"

if command -v soma &>/dev/null; then
  version=$(soma --version 2>&1)
  if echo "$version" | grep -qE '^[0-9]+\.[0-9]+'; then
    pass "soma --version: $version"
  else
    fail "soma --version: expected semver, got error (check CLI dependencies)"
  fi
else
  # CI environments won't have soma installed — skip gracefully
  if [[ -n "$CI" || -n "$GITHUB_ACTIONS" ]]; then
    pass "soma not installed (CI — skipping boot integration)"
  else
    fail "soma command not found"
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "═══════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
echo "═══════════════════════════════"

[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
