#!/usr/bin/env bash
# Soma — Git Identity Pre-Commit Hook
#
# Validates git user.email before allowing commits.
# Two modes:
#   1. If .soma/settings.json has guard.gitIdentity.email → enforces that exact email
#   2. Otherwise → just checks that user.email is set (not empty)
#
# Install: copy to .git/hooks/pre-commit (or use `soma init --hooks`)
# Or symlink: ln -sf ../../.soma/scripts/git-identity-hook.sh .git/hooks/pre-commit

set -euo pipefail

CURRENT_EMAIL=$(git config user.email 2>/dev/null || echo "")
CURRENT_NAME=$(git config user.name 2>/dev/null || echo "")

# --- Check if email is set at all ---
if [ -z "$CURRENT_EMAIL" ]; then
    echo "❌ git user.email is not set!"
    echo ""
    echo "Set it with:"
    echo "  git config user.name \"Your Name\""
    echo "  git config user.email \"you@example.com\""
    echo ""
    echo "Or add an includeIf to ~/.gitconfig for this directory."
    exit 1
fi

# --- Check against .soma/settings.json if it exists ---
SOMA_DIR=""
# Walk up to find .soma/
DIR="$(pwd)"
while [ "$DIR" != "/" ]; do
    if [ -d "$DIR/.soma" ]; then
        SOMA_DIR="$DIR/.soma"
        break
    fi
    DIR="$(dirname "$DIR")"
done

if [ -n "$SOMA_DIR" ] && [ -f "$SOMA_DIR/settings.json" ]; then
    # Extract expected email (lightweight — no jq dependency)
    EXPECTED_EMAIL=$(grep -o '"email"[[:space:]]*:[[:space:]]*"[^"]*"' "$SOMA_DIR/settings.json" 2>/dev/null | head -1 | sed 's/.*: *"\(.*\)"/\1/')

    if [ -n "$EXPECTED_EMAIL" ] && [ "$CURRENT_EMAIL" != "$EXPECTED_EMAIL" ]; then
        echo "⚠️  Git identity mismatch!"
        echo ""
        echo "  Current:  $CURRENT_NAME <$CURRENT_EMAIL>"
        echo "  Expected: <$EXPECTED_EMAIL> (from .soma/settings.json)"
        echo ""
        echo "Fix with:"
        echo "  git config user.email \"$EXPECTED_EMAIL\""
        echo ""
        echo "Or update .soma/settings.json guard.gitIdentity.email"
        echo ""
        echo "To commit anyway: git commit --no-verify"
        exit 1
    fi
fi

# Identity looks good
exit 0
