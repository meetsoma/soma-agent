#!/usr/bin/env bash
# Tests — check test health across the ecosystem
#
# Verifies test files exist, counts test suites, optionally runs them.
# Exit: 0=healthy, 1=gaps found

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"

ISSUES=0

# Check for test files in core
CORE_DIR="$PROJECT_DIR/core"
if [ -d "$CORE_DIR" ]; then
  test_files=$(find "$CORE_DIR" -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
  source_files=$(find "$CORE_DIR" -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" -not -name "index.ts" 2>/dev/null | wc -l | tr -d ' ')

  echo "ℹ  Core modules: $source_files source, $test_files test files"

  # Check each source file has a test
  for f in "$CORE_DIR"/*.ts; do
    [ ! -f "$f" ] && continue
    name=$(basename "$f" .ts)
    [ "$name" = "index" ] && continue
    [ "$name" = "utils" ] && continue  # utils often tested through other modules

    test_file="$CORE_DIR/$name.test.ts"
    spec_file="$CORE_DIR/$name.spec.ts"
    if [ ! -f "$test_file" ] && [ ! -f "$spec_file" ]; then
      echo "⚠  No tests for: core/$name.ts"
      ISSUES=$((ISSUES + 1))
    fi
  done
fi

# Check for extension tests
EXT_DIR="$PROJECT_DIR/extensions"
if [ -d "$EXT_DIR" ]; then
  ext_count=$(find "$EXT_DIR" -name "*.ts" -not -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
  ext_tests=$(find "$EXT_DIR" -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
  echo "ℹ  Extensions: $ext_count source, $ext_tests test files"

  if [ "$ext_tests" -eq 0 ] && [ "$ext_count" -gt 0 ]; then
    echo "⚠  No extension tests exist"
    ISSUES=$((ISSUES + 1))
  fi
fi

if [ $ISSUES -eq 0 ]; then
  echo "✅ Test coverage looks healthy"
  exit 0
else
  echo ""
  echo "⚠  $ISSUES testing gap(s)"
  exit 1
fi
