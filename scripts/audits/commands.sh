#!/usr/bin/env bash
# Command consistency — verify documented commands match implementation
#
# Cross-references docs/commands.md against registerCommand() calls in extensions.
# Exit: 0=consistent, 1=mismatches found

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"

COMMANDS_DOC="$PROJECT_DIR/docs/commands.md"
EXTENSIONS_DIR="$PROJECT_DIR/extensions"

if [ ! -f "$COMMANDS_DOC" ]; then
  echo "⚠  commands.md not found — skipping"
  exit 0
fi

if [ ! -d "$EXTENSIONS_DIR" ]; then
  echo "⚠  extensions/ not found — skipping"
  exit 0
fi

ISSUES=0

# Extract registered commands from extensions
IMPL_COMMANDS=$(grep -h 'registerCommand(' "$EXTENSIONS_DIR"/*.ts 2>/dev/null \
  | sed 's/.*registerCommand("\([^"]*\)".*/\1/' | sort -u)

# Extract documented commands from commands.md (multiple formats)
# Matches `/command` or `/command <args>` or `/command |`
ALL_DOC=$(grep -oE '`/[a-z-]+[` ]' "$COMMANDS_DOC" 2>/dev/null \
  | sed 's/`\/\([a-z-]*\).*/\1/' | sort -u | grep -v '^$')
# Also catch table format: | `/command ...` |
ALL_DOC2=$(grep -oE '\| `/[a-z-]+' "$COMMANDS_DOC" 2>/dev/null \
  | sed 's/.*`\/\([a-z-]*\).*/\1/' | sort -u | grep -v '^$')
ALL_DOC=$(echo -e "$ALL_DOC\n$ALL_DOC2" | sort -u | grep -v '^$')

# Commands implemented but not documented
for cmd in $IMPL_COMMANDS; do
  if ! echo "$ALL_DOC" | grep -qx "$cmd"; then
    echo "⚠  Implemented but not documented: /$cmd"
    ISSUES=$((ISSUES + 1))
  fi
done

# Commands documented but not implemented
for cmd in $ALL_DOC; do
  if ! echo "$IMPL_COMMANDS" | grep -qx "$cmd"; then
    echo "⚠  Documented but not implemented: /$cmd"
    ISSUES=$((ISSUES + 1))
  fi
done

if [ $ISSUES -eq 0 ]; then
  echo "✅ Commands consistent ($(echo "$IMPL_COMMANDS" | wc -l | tr -d ' ') commands)"
  exit 0
else
  echo ""
  echo "⚠  $ISSUES command inconsistencies"
  exit 1
fi
