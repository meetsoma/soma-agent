#!/usr/bin/env bash
# Tests — check test health across the ecosystem
#
# Verifies test files exist, counts test suites, checks coverage.
# Recognizes both TypeScript (*.test.ts) and bash (tests/test-*.sh) test patterns.
# Exit: 0=healthy, 1=gaps found

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"

ISSUES=0

# Check for bash test suites (our primary test format)
TESTS_DIR="$PROJECT_DIR/tests"
if [ -d "$TESTS_DIR" ]; then
  bash_tests=$(find "$TESTS_DIR" -name "test-*.sh" 2>/dev/null | wc -l | tr -d ' ')
  echo "ℹ  Bash test suites: $bash_tests"

  # Run a quick count of total test cases
  total_pass=0
  total_fail=0
  for t in "$TESTS_DIR"/test-*.sh; do
    [ ! -f "$t" ] && continue
    output=$(bash "$t" 2>&1)
    # Match both formats: "X passed, Y failed" and "X/Y passed, Z failed"
    result=$(echo "$output" | grep -E '[0-9]+ passed' | tail -1)
    passed=$(echo "$result" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo 0)
    failed=$(echo "$result" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo 0)
    total_pass=$((total_pass + passed))
    total_fail=$((total_fail + failed))
  done
  echo "ℹ  Total: $total_pass passed, $total_fail failed"

  if [ "$total_fail" -gt 0 ]; then
    echo "⚠  $total_fail test(s) failing"
    ISSUES=$((ISSUES + 1))
  fi
fi

# Check for TypeScript test files (co-located)
CORE_DIR="$PROJECT_DIR/core"
if [ -d "$CORE_DIR" ]; then
  ts_tests=$(find "$CORE_DIR" -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$ts_tests" -gt 0 ]; then
    echo "ℹ  TypeScript tests: $ts_tests files in core/"
  fi
fi

# Check which core modules have bash test coverage
if [ -d "$TESTS_DIR" ] && [ -d "$CORE_DIR" ]; then
  covered=0
  uncovered=0
  uncovered_list=""
  for f in "$CORE_DIR"/*.ts; do
    [ ! -f "$f" ] && continue
    name=$(basename "$f" .ts)
    [ "$name" = "index" ] && continue
    [ "$name" = "utils" ] && continue

    # Check if any test file references this module
    if grep -rl "$name" "$TESTS_DIR"/test-*.sh > /dev/null 2>&1; then
      covered=$((covered + 1))
    else
      uncovered=$((uncovered + 1))
      uncovered_list="$uncovered_list core/$name.ts"
    fi
  done

  echo "ℹ  Core coverage: $covered/$((covered + uncovered)) modules have test references"
  if [ "$uncovered" -gt 0 ]; then
    for m in $uncovered_list; do
      echo "⚠  No test coverage: $m"
    done
    ISSUES=$((ISSUES + 1))
  fi
fi

# Check extension test coverage
EXT_DIR="$PROJECT_DIR/extensions"
if [ -d "$EXT_DIR" ]; then
  ext_count=$(find "$EXT_DIR" -name "*.ts" -not -name "_*" -not -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
  ext_tested=0
  if [ -d "$TESTS_DIR" ]; then
    for f in "$EXT_DIR"/*.ts; do
      [ ! -f "$f" ] && continue
      name=$(basename "$f" .ts)
      [[ "$name" == _* ]] && continue
      if grep -rl "$name" "$TESTS_DIR"/test-*.sh > /dev/null 2>&1; then
        ext_tested=$((ext_tested + 1))
      fi
    done
  fi
  echo "ℹ  Extensions: $ext_count source, $ext_tested with test references"
fi

if [ $ISSUES -eq 0 ]; then
  echo "✅ Test health looks good"
  exit 0
else
  echo ""
  echo "⚠  $ISSUES testing issue(s)"
  exit 1
fi
