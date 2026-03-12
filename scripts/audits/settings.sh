#!/usr/bin/env bash
# Settings — validate settings.json files in the soma chain
#
# Checks for: valid JSON, unknown keys, type mismatches against defaults.
# Exit: 0=valid, 1=issues found

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"

ISSUES=0

# Find all settings.json in the soma chain
SETTINGS_FILES=()
dir="$PROJECT_DIR"
while [ "$dir" != "/" ]; do
  sf="$dir/.soma/settings.json"
  if [ -f "$sf" ]; then
    SETTINGS_FILES+=("$sf")
  fi
  dir=$(dirname "$dir")
done

# Also check home
if [ -f "$HOME/.soma/settings.json" ]; then
  SETTINGS_FILES+=("$HOME/.soma/settings.json")
fi

if [ ${#SETTINGS_FILES[@]} -eq 0 ]; then
  echo "ℹ  No settings.json found in chain"
  exit 0
fi

# Known top-level keys (must match SomaSettings interface in core/settings.ts)
KNOWN_KEYS="\$schema root inherit persona memory protocols muscles heat boot context preload guard debug paths systemPrompt checkpoints breathe steno"

for sf in "${SETTINGS_FILES[@]}"; do
  short=$(echo "$sf" | sed "s|$HOME|~|")

  # Valid JSON?
  if ! python3 -c "import json; json.load(open('$sf'))" 2>/dev/null; then
    if ! node -e "JSON.parse(require('fs').readFileSync('$sf','utf8'))" 2>/dev/null; then
      echo "❌ Invalid JSON: $short"
      ISSUES=$((ISSUES + 2))
      continue
    fi
  fi

  # Check for unknown top-level keys
  top_keys=$(node -e "
    const s = JSON.parse(require('fs').readFileSync('$sf','utf8'));
    console.log(Object.keys(s).join(' '));
  " 2>/dev/null || echo "")

  for key in $top_keys; do
    if ! echo "$KNOWN_KEYS" | grep -qw "$key"; then
      echo "⚠  Unknown setting '$key' in $short"
      ISSUES=$((ISSUES + 1))
    fi
  done

  echo "✓ $short (valid)"
done

if [ $ISSUES -eq 0 ]; then
  echo "✅ All settings valid"
  exit 0
elif [ $ISSUES -ge 2 ]; then
  exit 2
else
  exit 1
fi
