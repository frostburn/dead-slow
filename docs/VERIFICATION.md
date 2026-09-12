# Release verification — 3.1.0

| Check | Local result |
| --- | --- |
| JavaScript parse / deterministic offline bundle | 26 files, passed |
| Node tests | 164 passed, 0 failed |
| Chromium browser checks | 158 passed, 0 page errors |
| No Lee Shore control-only replay | Clean, 78.641667 seconds |
| The First Crossing control-only replay | Clean, 123.950000 seconds |
| A Bigger Boat control-only replay | Clean, 187.900000 seconds |
| All 36 charts / starting hulls | Rendered; open approaches and collision-free starts checked |
| Ten later island starts | Required positioning legs checked; no automatic pickup/boarding |
| All 12 island job sequences | Prerequisites and completion checked in isolation |
| Console acceleration | Same 120 Hz physics; freeze/resume and bounded frame batches checked |
| Reference playback | All three execute in production console; assisted results never rank |
| Divergent playback | Reported unverified and halted at the declared end |
| Open-edge failure | Whole-hull exits, casualty exits, stopped clocks and retries checked |
| Horn graph | Actual offline render: sustained harmonics, bounded level, no stacking, safe mute |
| Logbook schema 4 | Old-route records/ghosts archived; re-import and reload checked |

These are local results, not remote GitHub Actions results. The changes were
prepared against `main` at `5ca23997516d6f8a201b80f5b2d39f8ed829d437`.

Browser results use inline mounting because this execution environment blocks
page navigation. The HTTP server is separately exercised by the Node suite.
Touch checks use Chromium emulation, not a physical phone. State-machine tests
position hulls explicitly; the three named trajectory replays do not. Later
island departure geometry checks are not complete control-only playthroughs of
those courses, and medal targets remain unverified design goals. Audio tests
check the actual signal, not calibrated fidelity to a real vessel's horn.
See `TESTING.md` and `CONSOLE.md` for methods and commands.

Release archives include `reports/unit-tests.txt`, `reports/browser.json` and
`reports/control-runs.json` as local evidence. `reports/` is gitignored, so
these artifacts need not become repository history. Re-run checks after
modifying source, recorded inputs or stage layouts.
