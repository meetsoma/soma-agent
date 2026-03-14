#!/usr/bin/env bash
# PII scan — detect personal information in tracked files
#
# Checks for: email addresses, phone numbers, API keys, names in known patterns.
# Exit: 0=clean, 1=warnings, 2=found PII

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"

ISSUES=0

# Email addresses (excluding known safe patterns)
EMAILS=$(grep -rn --include="*.md" --include="*.ts" --include="*.json" --include="*.sh" \
  -E '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' "$PROJECT_DIR" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  2>/dev/null | grep -v "team@meetsoma" | grep -v "example@" | grep -v "@example\." | grep -v "@company\." | grep -v "user@" | grep -v "noreply@github" | grep -v "@types" || true)

if [ -n "$EMAILS" ]; then
  echo "⚠  Potential email addresses:"
  echo "$EMAILS" | head -10
  ISSUES=$((ISSUES + 1))
fi

# API keys / tokens (common patterns)
KEYS=$(grep -rn --include="*.md" --include="*.ts" --include="*.json" --include="*.sh" \
  -E '(sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36}|npm_[a-zA-Z0-9]{36})' "$PROJECT_DIR" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  2>/dev/null || true)

if [ -n "$KEYS" ]; then
  echo "❌ Potential API keys/tokens:"
  echo "$KEYS" | head -10
  ISSUES=$((ISSUES + 2))
fi

# Phone numbers
PHONES=$(grep -rn --include="*.md" --include="*.ts" --include="*.json" \
  -E '\b[0-9]{3}[-.]?[0-9]{3}[-.]?[0-9]{4}\b' "$PROJECT_DIR" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  2>/dev/null | grep -v "version" | grep -v "port" | grep -v "\.0\." || true)

if [ -n "$PHONES" ]; then
  echo "⚠  Potential phone numbers:"
  echo "$PHONES" | head -5
  ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
  echo "✅ No PII detected"
  exit 0
elif [ $ISSUES -ge 2 ]; then
  exit 2
else
  exit 1
fi
