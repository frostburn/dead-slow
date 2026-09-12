# Verification — Spaceflight feedback

Prepared against `frostburn/dead-slow` main at
`e257b3c26a682a6a2215cca7cb5c924d422ff2df` (tree
`fd7ab14cb1492fc69a2b4550c990b9a8d7d67766`). The merged contact-velocity,
rotating-tender and bonus-progress fixes are preserved. This change touches
sound and presentation, not physics, geometry, records or control recordings.

| Check | Local result |
| --- | --- |
| JavaScript parse / deterministic offline bundle | 36 files; sixteen source modules inlined |
| Node tests | 321 passed, 0 failed |
| Chromium browser checks | 281 passed, 0 page errors |
| Published control-only completions | 25 clean, measured in Node and the production browser console |
| Space coverage | All twelve circuit sectors plus the Century Ship bonus |
| Century Ship complete input replay | 1922.333333 s; three commands, zero contacts |
| Century Ship independent lower bound | Even a point-sized craft needs more than 1800 s |
| Animated 32× playback | Marine references and space arrival match author times |
| Keyboard / pointer control | Rotation, translation, beam holds and cancellation |
| Rendering / responsive layouts | All 49 stages; 320-pixel portrait through desktop |
| Persistence | Schema 4 stage/sea-circuit records retained; 36-stage Grand Tour archived |
| Bonus routes | Century Ship selectable; excluded from Meridian and Grand Tour circuits |
| Safety of assists | Replays/accelerated runs cannot replace PBs, ghosts, splits or circuit records |
| Mixed audio | Sea and flight drive/radar/cue mixes pass at 44.1/48/96 kHz |
| Digital clipping / non-finite samples | None; marine peak < 0.1197, flight peak < 0.10 full scale |
| Flight feedback | All firing axes and beam audible; coasting silent; mute/pause/world changes fade correctly |
| Radar | H and desktop/touch buttons; shared cooldown; visual works muted; no simulation/scoring effects |
| Flight copy | Briefings, capture/PB/practice/circuit screens, pause/blur/hidden, logs/help and accessible labels |

The [space guide](SPACE.md) lists all thirteen new author times. The
[console guide](CONSOLE.md) lists the twelve established marine references.
Recordings contain ordinary timed helm/beam inputs, not coordinate assignments,
fuel edits, objective shortcuts or an alternate simulator. The chronogate's
intentional in-game relocation still happens normally. These routes are clean
reference completions, not claims of optimal play. Twenty-four sea stages still
have no published author recording.

## Reproduction

```sh
npm run replays:sync
npm run check
npm run build
npm test
npm run verify:runs
python tests/browser_smoke.py --inline --report reports/browser.json
```

JSON recordings are authoritative; the generated `src/verification.js` is
checked in so source play and the single-file build need no network fetch.
Objective-isolation tests do place bodies directly to check guards and failure
states. Those tests are distinct from the full input-only trajectory tests.
The long bonus executes every 120 Hz tick; no completion-time shortcut is used.

Local browser checks use inline mounting and a storage shim, with system
Chromium and the available Playwright 1.57.0. The repository requirement remains **1.62.0**, as requested; GitHub Actions installs
that version afresh. Local results are not a claim about remote CI: see the PR's
actual Actions conclusion. HTTP server behavior is also tested by Node; the
remote browser workflow uses HTTP navigation and real local storage.

Touch checks are Chromium emulation, not physical devices. Offline audio checks
measure the game graph, not calibrated speakers/headphones. Space is a planar
local-frame game with compressed star-system distance, not a gravity, orbital,
relativistic or rocket-equation model. The Century Ship lower-bound calculation
is for the implemented force limits and explicitly allows generous capture
tolerance; see [SPACE.md](SPACE.md).

Pages actions use `upload-pages-artifact@v5` and `deploy-pages@v5`. Deployment
remains manual/opt-in and has not been triggered by this work. No permission
expansion is needed; existing workflow scopes are retained.
