#!/usr/bin/env bash
# Sync agent-stable → CLI repo (distribution)
# Run from agent-stable/ after changes
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"
CLI_DIR="$(dirname "$AGENT_DIR")/cli"

if [ ! -d "$CLI_DIR" ]; then
  echo "ERROR: CLI repo not found at $CLI_DIR"
  exit 1
fi

echo "Syncing $AGENT_DIR → $CLI_DIR"

# Use the CLI's own sync script (source of truth for what ships)
AGENT_DIR="$AGENT_DIR" bash "$CLI_DIR/scripts/sync-from-agent.sh"

# Show what changed
cd "$CLI_DIR"
changes=$(git diff --stat 2>/dev/null)
if [ -z "$changes" ]; then
  echo "✅ Already in sync — no changes"
else
  echo ""
  echo "Changes:"
  echo "$changes"
  echo ""
  echo "Run: cd $CLI_DIR && git add -A && git commit -m 'sync: from agent-stable' && git push"
fi
