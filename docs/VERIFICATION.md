# Release verification — 3.0.0

| Check | Local result |
| --- | --- |
| JavaScript parse / deterministic offline bundle | 20 files, passed |
| Node tests | 103 passed, 0 failed |
| Chromium browser checks | 129 passed, 0 page errors |
| First Crossing control-only replay | Clean, 123.95 seconds |
| A Bigger Boat control-only replay | Clean, 187.90 seconds |
| No Lee Shore control-only regression | Clean, 78.64 seconds |
| All 36 charts | Rendered without a page error |
| All 12 island job sequences | Prerequisites and completion checked |
| GitHub workflow YAML / documentation links | Parsed / resolved locally |

Browser results use inline mounting because this execution environment blocks
page navigation. The HTTP server is separately exercised by the Node suite.
Touch checks use Chromium emulation, not a physical phone. State-machine tests
position hulls explicitly; the three named trajectory replays do not. Remote
GitHub Actions and Pages deployment are configured, not claimed as executed.
See `TESTING.md` for details and commands.

Release archives include `reports/unit-tests.txt` and `reports/browser.json` as
local evidence. `reports/` is gitignored, so these artifacts need not become
repository history. Re-run checks after modifying source or stage layouts.
