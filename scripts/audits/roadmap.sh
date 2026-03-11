#!/usr/bin/env bash
# Roadmap claims — verify shipped items on roadmap actually exist
#
# Cross-references roadmap page claims against actual code/files.
# Exit: 0=accurate, 1=questionable claims

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"
WEBSITE_DIR="$(dirname "$PROJECT_DIR")/website"
ROADMAP="$WEBSITE_DIR/src/pages/roadmap/index.astro"

if [ ! -f "$ROADMAP" ]; then
  echo "⚠  Roadmap page not found — skipping"
  exit 0
fi

ISSUES=0

# Check if features claimed as shipped actually exist
# soma install
if grep -qi "install" "$ROADMAP" 2>/dev/null; then
  if [ ! -f "$PROJECT_DIR/core/install.ts" ]; then
    echo "⚠  Roadmap mentions install but core/install.ts missing"
    ISSUES=$((ISSUES + 1))
  fi
fi

# Heat system
if grep -qi "heat" "$ROADMAP" 2>/dev/null; then
  if ! grep -q "heat" "$PROJECT_DIR/core/protocols.ts" 2>/dev/null; then
    echo "⚠  Roadmap mentions heat but no heat logic in protocols.ts"
    ISSUES=$((ISSUES + 1))
  fi
fi

# Check CHANGELOG unreleased items match what's on roadmap as "shipped"
CHANGELOG="$PROJECT_DIR/CHANGELOG.md"
if [ -f "$CHANGELOG" ]; then
  # Count unreleased items
  unreleased=$(awk '/^## \[Unreleased\]/{found=1;next} /^## \[/{found=0} found && /^- /{count++} END{print count+0}' "$CHANGELOG")
  if [ "$unreleased" -gt 0 ]; then
    echo "ℹ  $unreleased unreleased changelog items (may need roadmap update on ship)"
  fi
fi

# Check for "Coming Soon" items that are actually shipped
if grep -q "soma install" "$ROADMAP" 2>/dev/null; then
  if grep -q "Coming Soon" "$ROADMAP" 2>/dev/null && [ -f "$PROJECT_DIR/core/install.ts" ]; then
    if grep -A5 "Coming Soon" "$ROADMAP" | grep -qi "install" 2>/dev/null; then
      echo "⚠  'soma install' still listed as Coming Soon but is implemented"
      ISSUES=$((ISSUES + 1))
    fi
  fi
fi

if [ $ISSUES -eq 0 ]; then
  echo "✅ Roadmap claims look accurate"
  exit 0
else
  echo ""
  echo "⚠  $ISSUES roadmap claim(s) may be stale"
  exit 1
fi
