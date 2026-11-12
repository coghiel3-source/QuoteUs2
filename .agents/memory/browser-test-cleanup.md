---
name: Browser test cleanup
description: Prevent stale mocked browser pages from disrupting workflow restarts.
---

Close stale tester browser contexts before restarting a workflow after a
mock-induced runtime failure.

**Why:** A Rep page with an incorrectly shaped collection mock remained open,
reconnected on each Vite restart, and triggered the same frontend runtime error
and workflow shutdown. A fresh test context alone did not stop old contexts.
The repeated connection refusals were not a server port configuration problem.

**How to apply:** Ask the existing tester to close all its old contexts without
navigating, then restart the managed workflow. Scope any recheck to the affected
flow and close contexts at the end. Use valid collection response shapes in
mocks rather than weakening application validation to accommodate test data.
