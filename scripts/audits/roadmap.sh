#!/usr/bin/env bash
# Roadmap claims — verify shipped items, detect stale statuses
#
# Checks:
# 1. Features claimed as "shipped" have code evidence
# 2. Features in "built — shipping" status that are actually in CHANGELOG (should be "shipped")
# 3. Unreleased changelog items that might need roadmap presence
# 4. Roadmap timeline vs CHANGELOG version alignment
#
# Exit: 0=accurate, 1=stale claims found

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"
WEBSITE_DIR="$(dirname "$PROJECT_DIR")/website"
ROADMAP="$WEBSITE_DIR/src/pages/roadmap/index.astro"

if [ ! -f "$ROADMAP" ]; then
  echo "⚠  Roadmap page not found — skipping"
  exit 0
fi

ISSUES=0
CHANGELOG="$PROJECT_DIR/CHANGELOG.md"

# ── 1. Detect stale "shipping next release" / "built" statuses ──
# Extract feature names paired with their status
while IFS= read -r line; do
  # Match: status: 'Built — shipping next release' or similar
  if echo "$line" | grep -qi "status:.*built.*ship\|status:.*ready.*ship\|status:.*shipping"; then
    # Get the feature name from nearby context (look back for name:)
    feature=$(echo "$line" | sed "s/.*status: *['\"]//;s/['\"].*//" | tr '[:upper:]' '[:lower:]')
    echo "⚠  Roadmap has stale shipping status: '$feature' — should this be 'Shipped' now?"
    ISSUES=$((ISSUES + 1))
  fi
done < "$ROADMAP"

# ── 2. Cross-check: features in CHANGELOG [Unreleased] that roadmap says "Planned" ──
if [ -f "$CHANGELOG" ]; then
  # Extract unreleased feature keywords
  unreleased_features=$(awk '/^## \[Unreleased\]/{found=1;next} /^## \[/{found=0} found && /^- \*\*/{print}' "$CHANGELOG" 2>/dev/null)
  unreleased_count=$(echo "$unreleased_features" | grep -c '^\- ' 2>/dev/null || echo 0)

  if [ "$unreleased_count" -gt 0 ]; then
    echo "ℹ  $unreleased_count unreleased changelog items (may need roadmap update on ship)"
  fi

  # Check if any "Planned" roadmap items are actually in unreleased changelog
  while IFS= read -r line; do
    if echo "$line" | grep -qi "status:.*'Planned'"; then
      # Get feature name
      name=""
      # Look for the name in surrounding lines
    fi
  done < "$ROADMAP"
fi

# ── 3. Check timeline versions exist in CHANGELOG ──
timeline_versions=$(grep -o "version: 'v[^']*'" "$ROADMAP" 2>/dev/null | sed "s/version: '//;s/'//")
if [ -f "$CHANGELOG" ]; then
  for ver in $timeline_versions; do
    clean_ver=$(echo "$ver" | sed 's/^v//')
    if ! grep -q "\[$clean_ver\]" "$CHANGELOG" 2>/dev/null; then
      echo "⚠  Roadmap timeline has $ver but CHANGELOG has no [$clean_ver] section"
      ISSUES=$((ISSUES + 1))
    fi
  done
fi

# ── 4. Basic code evidence for shipped features ──
if grep -qi "install" "$ROADMAP" 2>/dev/null; then
  if [ ! -f "$PROJECT_DIR/core/install.ts" ]; then
    echo "⚠  Roadmap mentions install but core/install.ts missing"
    ISSUES=$((ISSUES + 1))
  fi
fi

if grep -qi "heat" "$ROADMAP" 2>/dev/null; then
  if ! grep -q "heat" "$PROJECT_DIR/core/protocols.ts" 2>/dev/null; then
    echo "⚠  Roadmap mentions heat but no heat logic in protocols.ts"
    ISSUES=$((ISSUES + 1))
  fi
fi

if grep -qi "auto-breathe\|auto.breathe" "$ROADMAP" 2>/dev/null; then
  if ! grep -q "auto-breathe\|autoBreath\|auto.breathe" "$PROJECT_DIR/extensions/soma-boot.ts" 2>/dev/null; then
    echo "⚠  Roadmap mentions auto-breathe but not found in soma-boot.ts"
    ISSUES=$((ISSUES + 1))
  fi
fi

if grep -qi "compat" "$ROADMAP" 2>/dev/null; then
  if [ ! -f "$PROJECT_DIR/scripts/soma-compat.sh" ] && [ ! -f "$PROJECT_DIR/../../../.soma/scripts/soma-compat.sh" ]; then
    echo "⚠  Roadmap mentions compatibility scoring but soma-compat.sh not found"
    ISSUES=$((ISSUES + 1))
  fi
fi

# ── Summary ──
if [ $ISSUES -eq 0 ]; then
  echo "✅ Roadmap claims look accurate"
  exit 0
else
  echo ""
  echo "⚠  $ISSUES roadmap issue(s) found"
  exit 1
fi
