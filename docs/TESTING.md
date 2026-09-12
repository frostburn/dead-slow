# Testing and verification

## Core suite

```sh
npm run check
npm run build
npm test
npm run verify:runs
```

Node's built-in test runner is the only core test dependency. The headless
harness runs the actual `game.js` with inert DOM/audio/render stubs; it does not
reimplement navigation, collisions or job rules.

The suite covers acceleration and astern braking, water-relative steering,
hull containment/collisions, deterministic gates/tides/current, shelter,
signed speed, records, migrations, route/circuit boundaries, retry accounting,
convex island geometry, manifests, ramps, interrupted transfer, payload mass,
unilateral rope forces, momentum transfer, winching, break/recovery,
casualty berths, gate protection and local-server/build behavior. Open-water
tests check every starting hull and coast configuration, all four exits,
casualty exits, no rebound, stopped clocks, retries, and ten revised starts.
Console tests cover argument validation, detached inspection, 0–32× fixed-step
execution, bounded frame work, replay divergence and protection of records.
Schema-4 tests cover archive preservation, idempotence and older imports.

Some tests position the ship or casualty directly to isolate **objective state
machines**. All twelve island job sequences are checked that way, including
the requirement to finish the work before final mooring. Such tests do not
prove every navigational approach or medal time is achievable.

## Control-only evidence

The following complete trajectories use actual timed player controls and the
same fixed-step state machine as the game. They do not alter positions,
velocities, physics constants or objective progress:

The twelve published recordings and their measured times are listed in the
[console guide](CONSOLE.md#watch-the-actual-verification-runs). Every fixture is
replayed through both the Node game harness and the production Chromium console,
and checked against its recorded completion time within one 120 Hz tick.

Coverage now includes early reverse-thrust braking, a turning approach around a
breakwater, timed booms, lock cycling, stern-first parking, a tidal crossing,
an exposed cross-current, loading/unloading, a late-stage return ferry service,
and approaching and towing the heavy work barge. The two later island recordings
start at their normal fairway/remote-tug departures, not alongside the job target.
The ferry exchange returns with the new manifest; the barge must settle in its
own berth even after the tug is parked. All twelve finish cleanly: no contacts,
wake violations, groundings or parted lines. They are not claimed optimal.

The other twenty-four levels still lack published control-only completions.
Objective-isolation and spawn-clearance tests must not be mistaken for complete
playthroughs. Console playback is always unranked, so it cannot seed player
records. `DeadSlow.runs()` and `DeadSlow.times()` separate measured runs from
unverified design targets. New fixture tests reject unknown input fields,
non-finite values, invalid controls, unsorted timestamps and duplicate level IDs.
After changing fixture JSON, run `npm run replays:sync` before rebuilding.

## Browser checks

The release was checked locally with Node 22.16.0, Python Playwright 1.57.0 and
system Chromium on Linux, using inline mode. The execution environment blocked
file and HTTP page navigation by policy, so its browser checks did not exercise
a navigated origin. The Node HTTP-server tests did execute locally. Chromium
touch/viewport emulation is not a claim of testing a physical Android device
or iOS Safari.

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/browser_smoke.py --inline --report reports/browser.json
```

`--inline` mounts the built HTML in memory and substitutes in-memory
localStorage, so the suite works where file navigation is restricted. Node tests
cover persistence and migrations. To test a real origin, start `npm run serve`
and use `--url http://127.0.0.1:8080/dist/` instead. With neither option, the suite
navigates to the local built file; browser/OS file policies may disallow that.

The script prefers a system `chromium`, falling back to Playwright's installed
browser. `--chromium /path/to/browser` overrides it. `--screenshots reports/shots`
produces diagnostic captures. Generated reports and diagnostic screenshots are
not source files; curated screenshots live under `docs/images/`.

Browser coverage includes keyboard and pointer input, three simultaneous touch
controls, control release/cancel, mobile layout at multiple sizes, menus,
world selection, job instruments, ferry transfer, winch operations, retry,
all-stage chart rendering, objective guards, clean records and normal launches
without a test harness. `browser_open_water.py` is called by the main browser
suite and exercises the production console without `?test`: discovery,
animated acceleration, freeze/resume, all published replays and out-of-bounds UI.
It renders the actual WebAudio horn offline and checks signal level, sustained
harmonics, attack/release, voice limiting and mute before/during a blast. This
checks the signal, not a claim of measured real-world acoustic fidelity.
`browser_audio_mix.py` additionally renders the production full-ahead/full-astern
engine with a horn, repeated horn presses, engine-order bell and impact cue at
44.1, 48 and 96 kHz. It checks a peak ceiling of 0.15 full scale, finite/unclipped
samples, a genuinely audible engine and exactly one horn. A separate lower
horn ceiling catches accidentally restoring the old envelope. Offline scheduling
is held until the synchronous batch is installed so the renderer cannot race
through seconds between JS calls. This is not a calibrated physical-speaker test.

The standalone build is checked for external assets
and for making no network requests. The page-error listeners must stay empty.

## CI and release boundaries

The included GitHub workflow runs core checks on Node 22 and 24, and browser
checks through an HTTP-served build. That is configured coverage; it is not a
claim that GitHub has executed it before this repository is pushed. Pages
publishing is a separate, manually triggered workflow.

Local multiplayer, online records, physical hydrodynamic calibration, arbitrary
rope wrapping, all browser engines and every human-played medal route are not
covered. Re-run control fixtures when changing physics. A geometry fit or
state-machine test must never be reported as a complete navigational playthrough.
