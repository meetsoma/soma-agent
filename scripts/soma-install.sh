#!/usr/bin/env bash
# soma-install.sh — switch ~/.soma/agent/ between dev and stable (main) branches
#
# Usage:
#   bash scripts/soma-install.sh dev      # point ~/.soma at agent/ (dev branch)
#   bash scripts/soma-install.sh stable   # point ~/.soma at agent-stable/ (main branch)
#   bash scripts/soma-install.sh status   # show current state
#
# The swap is instant — just symlink changes. Restart Pi to pick up the new code.

set -euo pipefail

SOMA_GLOBAL="$HOME/.soma/agent"
GRAVICITY="${GRAVICITY:-$HOME/Gravicity}"
AGENT_DEV="$GRAVICITY/products/soma/agent"
AGENT_STABLE="$GRAVICITY/products/soma/agent-stable"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

current_target() {
    local link
    if [[ -L "$SOMA_GLOBAL/core" ]]; then
        link=$(readlink "$SOMA_GLOBAL/core")
        if [[ "$link" == *"agent-stable"* ]]; then
            echo "stable"
        elif [[ "$link" == *"agent/core"* || "$link" == *"agent/core/"* ]]; then
            echo "dev"
        else
            echo "unknown ($link)"
        fi
    else
        echo "not-symlinked"
    fi
}

show_status() {
    echo -e "${CYAN}Soma Install Status${NC}"
    echo "───────────────────────────"
    echo -e "  Global agent dir:  $SOMA_GLOBAL"
    echo -e "  Core symlink:      $(readlink "$SOMA_GLOBAL/core" 2>/dev/null || echo 'not a symlink')"
    echo -e "  Current mode:      ${GREEN}$(current_target)${NC}"
    echo ""

    # Show extension symlinks
    echo "  Extensions:"
    for ext in "$SOMA_GLOBAL/extensions/"*.ts; do
        [[ -f "$ext" ]] || continue
        local base
        base=$(basename "$ext")
        if [[ -L "$ext" ]]; then
            local target
            target=$(readlink "$ext")
            if [[ "$target" == *"agent-stable"* ]]; then
                echo -e "    ${base} → ${GREEN}stable${NC}"
            else
                echo -e "    ${base} → ${YELLOW}dev${NC}"
            fi
        else
            echo -e "    ${base} → ${RED}not symlinked${NC}"
        fi
    done

    echo ""
    echo "  Dev branch:    $(cd "$AGENT_DEV" && git log --oneline -1)"
    echo "  Stable branch: $(cd "$AGENT_STABLE" && git log --oneline -1 2>/dev/null || echo 'worktree not found')"
}

do_install() {
    local mode="$1"
    local source

    if [[ "$mode" == "dev" ]]; then
        source="$AGENT_DEV"
    elif [[ "$mode" == "stable" ]]; then
        source="$AGENT_STABLE"
    else
        echo -e "${RED}Unknown mode: $mode${NC}"
        echo "Usage: soma-install.sh dev|stable|status"
        exit 1
    fi

    # Validate source exists
    if [[ ! -d "$source/core" ]]; then
        echo -e "${RED}Source not found: $source/core${NC}"
        [[ "$mode" == "stable" ]] && echo "Run: cd products/soma/agent && git worktree add ../agent-stable main"
        exit 1
    fi

    local current
    current=$(current_target)
    if [[ "$current" == "$mode" ]]; then
        echo -e "${YELLOW}Already on $mode${NC}"
        show_status
        exit 0
    fi

    echo -e "${CYAN}Switching to $mode...${NC}"

    # Swap core symlink
    ln -sfn "$source/core" "$SOMA_GLOBAL/core"
    echo -e "  ${GREEN}✓${NC} core → $source/core"

    # Swap extension symlinks
    local ext_dir="$SOMA_GLOBAL/extensions"
    mkdir -p "$ext_dir"

    # Remove old extension symlinks (only symlinks, never real files)
    for ext in "$ext_dir/"*.ts; do
        [[ -L "$ext" ]] && rm "$ext"
    done

    # Create new symlinks
    for ext in "$source/extensions/"soma-*.ts; do
        [[ -f "$ext" ]] || continue
        local base=$(basename "$ext")
        ln -sfn "$ext" "$ext_dir/$base"
        echo -e "  ${GREEN}✓${NC} $base → $ext"
    done

    echo ""
    echo -e "${GREEN}Switched to $mode.${NC} Restart Pi to pick up changes."
    echo ""
    show_status
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

case "${1:-status}" in
    dev|stable) do_install "$1" ;;
    status)     show_status ;;
    *)
        echo "Usage: soma-install.sh dev|stable|status"
        exit 1
        ;;
esac
