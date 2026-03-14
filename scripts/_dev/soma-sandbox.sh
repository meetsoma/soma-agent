#!/usr/bin/env bash
# soma-sandbox.sh — create, reset, or destroy isolated test sandboxes
#
# Usage:
#   bash scripts/soma-sandbox.sh create [--signals]  # new sandbox (optionally seed project signals)
#   bash scripts/soma-sandbox.sh reset <path>         # wipe .soma/, keep project files
#   bash scripts/soma-sandbox.sh destroy <path>       # delete entire sandbox
#   bash scripts/soma-sandbox.sh list                 # show active sandboxes
#
# Sandboxes live in /tmp/soma-sandbox-* — completely isolated from Gravicity tree.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

cmd_create() {
    local with_signals=false
    [[ "${1:-}" == "--signals" ]] && with_signals=true

    local sandbox
    sandbox=$(mktemp -d /tmp/soma-sandbox-XXXXXX)

    if [[ "$with_signals" == "true" ]]; then
        echo '{ "name": "test-project", "version": "1.0.0" }' > "$sandbox/package.json"
        echo '{ "compilerOptions": { "target": "ES2022" } }' > "$sandbox/tsconfig.json"
        git -C "$sandbox" init --quiet
        echo -e "${GREEN}Created sandbox with project signals:${NC} $sandbox"
    else
        echo -e "${GREEN}Created empty sandbox:${NC} $sandbox"
    fi

    echo "$sandbox"
}

cmd_reset() {
    local sandbox="${1:-}"
    if [[ -z "$sandbox" || ! -d "$sandbox" ]]; then
        echo -e "${RED}Usage: soma-sandbox.sh reset <path>${NC}"
        exit 1
    fi

    if [[ "$sandbox" != /tmp/soma-sandbox-* ]]; then
        echo -e "${RED}Refusing to reset non-sandbox path: $sandbox${NC}"
        exit 1
    fi

    # Wipe .soma/ entirely
    if [[ -d "$sandbox/.soma" ]]; then
        rm -rf "$sandbox/.soma"
        echo -e "${GREEN}Wiped .soma/ in $sandbox${NC}"
    else
        echo -e "${YELLOW}No .soma/ found in $sandbox${NC}"
    fi

    # Note: project files (package.json, etc.) are preserved.
    # Only .soma/ is wiped. Re-seed with soma-sandbox.sh create --signals if needed.

    echo -e "${GREEN}Sandbox reset. Ready for fresh soma init.${NC}"
}

cmd_destroy() {
    local sandbox="${1:-}"
    if [[ -z "$sandbox" || ! -d "$sandbox" ]]; then
        echo -e "${RED}Usage: soma-sandbox.sh destroy <path>${NC}"
        exit 1
    fi

    if [[ "$sandbox" != /tmp/soma-sandbox-* ]]; then
        echo -e "${RED}Refusing to destroy non-sandbox path: $sandbox${NC}"
        exit 1
    fi

    rm -rf "$sandbox"
    echo -e "${GREEN}Destroyed: $sandbox${NC}"
}

cmd_list() {
    echo -e "${CYAN}Active sandboxes:${NC}"
    local found=false
    for d in /tmp/soma-sandbox-*; do
        [[ -d "$d" ]] || continue
        found=true
        local has_soma="no"
        [[ -d "$d/.soma" ]] && has_soma="yes"
        local age
        age=$(( ($(date +%s) - $(stat -f %m "$d")) / 60 ))
        echo -e "  $d  ${YELLOW}(.soma: $has_soma, age: ${age}m)${NC}"
    done
    [[ "$found" == "false" ]] && echo "  (none)"
}

case "${1:-list}" in
    create)  cmd_create "${2:-}" ;;
    reset)   cmd_reset "${2:-}" ;;
    destroy) cmd_destroy "${2:-}" ;;
    list)    cmd_list ;;
    *)       echo "Usage: soma-sandbox.sh create|reset|destroy|list"; exit 1 ;;
esac
