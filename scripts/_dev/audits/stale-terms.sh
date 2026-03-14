#!/usr/bin/env bash
# Stale terms — find deprecated/renamed terms still in use
#
# Catches references to old names, removed features, or renamed concepts.
# Exit: 0=clean, 1=stale terms found

set -uo pipefail

PROJECT_DIR="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"

# Term list: term|replacement
TERM_LIST="
continuation-prompt|preload-next
somas-daddy|(removed)
/pulse|/status (pulse not implemented)
openclaw|soma
cherry-pick|squash-merge (dev-first flow)
cherry_pick|squash-merge (dev-first flow)
Edit in.*agent-stable|Edit in agent/ (dev branch)
push.*meetsoma main|soma-ship.sh release (squash-merge)
YYYY-MM-DD.md|YYYY-MM-DD-sNN.md (per-session logs)
soma-audit|soma-verify (soma-audit replaced)
soma-restart|soma-dev restart
soma-self-switch|soma-dev restart
soma-snapshot|soma-verify
"

FOUND=0

echo "$TERM_LIST" | while IFS='|' read -r term replacement; do
  [ -z "$term" ] && continue

  hits=$(grep -rn --include="*.md" --include="*.ts" --include="*.json" \
    -l "$term" "$PROJECT_DIR" \
    --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
    --exclude-dir=archives --exclude-dir=audits 2>/dev/null || true)

  if [ -n "$hits" ]; then
    echo "⚠  \"$term\" → $replacement"
    echo "$hits" | while read -r f; do
      short=$(echo "$f" | sed "s|$PROJECT_DIR/||")
      count=$(grep -c "$term" "$f" 2>/dev/null || echo 0)
      echo "     $short ($count occurrences)"
    done
    echo "FOUND" >> /tmp/soma-stale-terms-flag
  fi
done

if [ -f /tmp/soma-stale-terms-flag ]; then
  FOUND=$(wc -l < /tmp/soma-stale-terms-flag | tr -d ' ')
  rm -f /tmp/soma-stale-terms-flag
  echo ""
  echo "⚠  $FOUND stale term(s) still in use"
  exit 1
else
  echo "✅ No stale terms found"
  exit 0
fi
