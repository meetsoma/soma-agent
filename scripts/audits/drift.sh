#!/usr/bin/env bash
# Code drift — detect divergence between agent (source of truth) and CLI (distribution)
#
# Compares core/ and extensions/ files between agent and CLI repos.
# Exit: 0=in sync, 1=drift detected

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"
CLI_DIR="$(dirname "$PROJECT_DIR")/cli"

if [ ! -d "$CLI_DIR/core" ]; then
  echo "⚠  CLI repo not found at $CLI_DIR — skipping drift check"
  exit 0
fi

DRIFT=0

# Compare core modules
if [ -d "$PROJECT_DIR/core" ] && [ -d "$CLI_DIR/core" ]; then
  for f in "$PROJECT_DIR/core/"*.ts; do
    name=$(basename "$f")
    cli_file="$CLI_DIR/core/$name"
    if [ ! -f "$cli_file" ]; then
      echo "⚠  Missing in CLI: core/$name"
      DRIFT=$((DRIFT + 1))
    elif ! diff -q "$f" "$cli_file" > /dev/null 2>&1; then
      echo "⚠  Diverged: core/$name"
      diff --stat "$f" "$cli_file" 2>/dev/null | tail -1
      DRIFT=$((DRIFT + 1))
    fi
  done
fi

# Compare extensions
if [ -d "$PROJECT_DIR/extensions" ] && [ -d "$CLI_DIR/extensions" ]; then
  for f in "$PROJECT_DIR/extensions/"*.ts; do
    name=$(basename "$f")
    cli_file="$CLI_DIR/extensions/$name"
    if [ ! -f "$cli_file" ]; then
      echo "⚠  Missing in CLI: extensions/$name"
      DRIFT=$((DRIFT + 1))
    elif ! diff -q "$f" "$cli_file" > /dev/null 2>&1; then
      echo "⚠  Diverged: extensions/$name"
      DRIFT=$((DRIFT + 1))
    fi
  done
fi

# Compare .soma protocols
if [ -d "$PROJECT_DIR/.soma/protocols" ] && [ -d "$CLI_DIR/.soma/protocols" ]; then
  for f in "$PROJECT_DIR/.soma/protocols/"*.md; do
    [ ! -f "$f" ] && continue
    name=$(basename "$f")
    [ "$name" = "_template.md" ] && continue
    cli_file="$CLI_DIR/.soma/protocols/$name"
    if [ ! -f "$cli_file" ]; then
      echo "⚠  Missing in CLI: .soma/protocols/$name"
      DRIFT=$((DRIFT + 1))
    elif ! diff -q "$f" "$cli_file" > /dev/null 2>&1; then
      echo "⚠  Diverged: .soma/protocols/$name"
      DRIFT=$((DRIFT + 1))
    fi
  done
fi

if [ $DRIFT -eq 0 ]; then
  echo "✅ Agent and CLI in sync"
  exit 0
else
  echo ""
  echo "⚠  $DRIFT file(s) drifted — run: bash scripts/sync-from-agent.sh"
  exit 1
fi
