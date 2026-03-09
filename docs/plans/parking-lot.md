---
type: note
status: active
created: 2026-03-10
updated: 2026-03-09
tags: [decisions, naming, npm, enterprise]
---

# Parking Lot — Quick Decisions to Revisit

## ~~npm Package Naming~~ ✅ (decided 2026-03-09)
- **Public/free:** `meetsoma` — community, open source (`products/soma/cli/`)
- **Enterprise:** `@gravicity.ai/soma` — pro features, may diverge (`products/soma/cli-pro/`)
- Both publish same core dist, enterprise is source of truth
- Publish script: `products/soma/scripts/publish.sh`
