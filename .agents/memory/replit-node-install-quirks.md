---
name: Replit Node install quirks
description: Replit package installation can leave runtime compatibility patches unapplied
---

Replit's managed Node package installation may finish without running the project's `postinstall` hook, even though a normal npm install would run it. Runtime compatibility patches should therefore also be safe to invoke before starting the service.

**Why:** The DAVID dependency tree included CommonJS/ESM compatibility repairs that were not applied automatically, causing a restart loop until the repair was run explicitly.

**How to apply:** When a Node service has a postinstall patch script and starts with module-format errors after managed installation, run the patch once, then make the service start path resilient to future reinstalls.