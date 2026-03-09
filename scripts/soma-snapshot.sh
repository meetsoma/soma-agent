#!/usr/bin/env bash
# soma-snapshot.sh — Rolling zip snapshots of project directories
#
# Usage:
#   soma-snapshot.sh <project-dir> [label]
#   soma-snapshot.sh /path/to/project "pre-reorg"
#   soma-snapshot.sh .                         # current dir, auto-labeled
#
# Features:
#   - Respects .zipignore (like .gitignore but for snapshots)
#   - Falls back to .gitignore if no .zipignore
#   - Rolling window: keeps last 3 snapshots per project
#   - Syncs to external drive if mounted
#   - Excludes node_modules, .git, dist, build by default

set -euo pipefail

# --- Config ---
SNAPSHOT_DIR="${SOMA_SNAPSHOT_DIR:-$HOME/.soma/snapshots}"
EXTERNAL_MOUNT="${SOMA_EXTERNAL_DRIVE:-/Volumes/Backup}"  # macOS external drive
MAX_SNAPSHOTS=3
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Default excludes (always skip these)
DEFAULT_EXCLUDES=(
  "node_modules/*"
  ".git/*"
  "dist/*"
  "build/*"
  ".next/*"
  ".astro/*"
  ".vercel/*"
  "__pycache__/*"
  "*.pyc"
  ".DS_Store"
  "Thumbs.db"
  "vendor/*"
  ".cache/*"
  "coverage/*"
  "*.log"
)

# --- Args ---
PROJECT_DIR="${1:-.}"
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
LABEL="${2:-auto}"

# --- Build exclude list ---
EXCLUDE_FILE=$(mktemp)
trap 'rm -f "$EXCLUDE_FILE"' EXIT

# Start with defaults
for pattern in "${DEFAULT_EXCLUDES[@]}"; do
  echo "$pattern" >> "$EXCLUDE_FILE"
done

# Add .zipignore if it exists
if [ -f "$PROJECT_DIR/.zipignore" ]; then
  echo "  📋 Using .zipignore"
  # Filter out comments and blank lines
  grep -v '^#' "$PROJECT_DIR/.zipignore" | grep -v '^$' >> "$EXCLUDE_FILE"
elif [ -f "$PROJECT_DIR/.gitignore" ]; then
  echo "  📋 Falling back to .gitignore"
  grep -v '^#' "$PROJECT_DIR/.gitignore" | grep -v '^$' | grep -v '^!' >> "$EXCLUDE_FILE"
fi

# --- Create snapshot ---
mkdir -p "$SNAPSHOT_DIR/$PROJECT_NAME"

SNAPSHOT_FILE="$SNAPSHOT_DIR/$PROJECT_NAME/${PROJECT_NAME}_${TIMESTAMP}_${LABEL}.zip"

echo "σ  Snapshotting: $PROJECT_NAME ($LABEL)"
echo "  📁 Source: $PROJECT_DIR"

cd "$PROJECT_DIR"
zip -r -q "$SNAPSHOT_FILE" . -x@"$EXCLUDE_FILE" 2>/dev/null

SIZE=$(du -sh "$SNAPSHOT_FILE" | awk '{print $1}')
echo "  ✓ Snapshot: $(basename "$SNAPSHOT_FILE") ($SIZE)"

# --- Rolling cleanup ---
SNAPSHOTS=($(ls -t "$SNAPSHOT_DIR/$PROJECT_NAME/"*.zip 2>/dev/null))
TOTAL=${#SNAPSHOTS[@]}

if [ "$TOTAL" -gt "$MAX_SNAPSHOTS" ]; then
  REMOVED=$((TOTAL - MAX_SNAPSHOTS))
  for ((i=MAX_SNAPSHOTS; i<TOTAL; i++)); do
    rm -f "${SNAPSHOTS[$i]}"
    echo "  🗑 Removed old: $(basename "${SNAPSHOTS[$i]}")"
  done
fi

echo "  📊 Snapshots kept: $(( TOTAL < MAX_SNAPSHOTS ? TOTAL : MAX_SNAPSHOTS ))/$MAX_SNAPSHOTS"

# --- External drive sync ---
if [ -d "$EXTERNAL_MOUNT" ]; then
  EXT_DIR="$EXTERNAL_MOUNT/soma-snapshots/$PROJECT_NAME"
  mkdir -p "$EXT_DIR"
  cp "$SNAPSHOT_FILE" "$EXT_DIR/"
  
  # Extended history on external (keep 10)
  EXT_SNAPSHOTS=($(ls -t "$EXT_DIR/"*.zip 2>/dev/null))
  EXT_TOTAL=${#EXT_SNAPSHOTS[@]}
  if [ "$EXT_TOTAL" -gt 10 ]; then
    for ((i=10; i<EXT_TOTAL; i++)); do
      rm -f "${EXT_SNAPSHOTS[$i]}"
    done
  fi
  
  echo "  💾 Synced to external: $EXTERNAL_MOUNT (${EXT_TOTAL} kept)"
else
  echo "  ℹ No external drive at $EXTERNAL_MOUNT"
fi

echo ""
echo "  Restore: unzip $SNAPSHOT_FILE -d /target/dir"
