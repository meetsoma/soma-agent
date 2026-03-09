#!/usr/bin/env bash
# frontmatter-date-hook.sh — Pre-commit hook that updates `updated:` in modified .md files
# Install: ln -s $(pwd)/frontmatter-date-hook.sh .git/hooks/pre-commit
#
# Part of the ATLAS protocol — enforces the "updated changes with every meaningful edit" rule.

TODAY=$(date +%Y-%m-%d)

# Get staged .md files that were modified (not just added)
STAGED_MD=$(git diff --cached --name-only --diff-filter=M | grep '\.md$' || true)

if [ -z "$STAGED_MD" ]; then
  exit 0
fi

for file in $STAGED_MD; do
  # Only touch files that have frontmatter (start with ---)
  if ! head -1 "$file" | grep -q '^---'; then
    continue
  fi

  # Check if file has an updated: field
  if grep -q '^updated:' "$file"; then
    CURRENT=$(grep '^updated:' "$file" | head -1 | awk '{print $2}')
    if [ "$CURRENT" != "$TODAY" ]; then
      sed -i '' "s/^updated: .*/updated: $TODAY/" "$file"
      git add "$file"
    fi
  fi
done
