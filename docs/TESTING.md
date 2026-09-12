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
casualty berths, gate protection and local-server/build behavior.

Some tests position the ship or casualty directly to isolate **objective state
machines**. All twelve island job sequences are checked that way, including
the requirement to finish the work before final mooring. Such tests do not
prove every navigational approach or medal time is achievable.

## Control-only evidence

The following complete trajectories use actual timed player controls and the
same fixed-step state machine as the game. They do not alter positions,
velocities, physics constants or objective progress:

| Stage | Ranked clean completion | Fixture |
| --- | --- | --- |
| World 2: No Lee Shore | About 78.64 s | `tests/exposed-crosscurrent-controls.json` |
| World 3: The First Crossing | 123.95 s | `tests/fixtures/first-crossing-controls.json` |
| World 3: A Bigger Boat | 187.90 s | `tests/fixtures/bigger-boat-controls.json` |

The two island fixtures are replayed in both Node and Chromium and checked
against their recorded completion times to within one 120 Hz simulation tick.
The ferry boards, sails, brakes, unloads and moors. The tug makes fast, tows,
casts off, brakes and moors while the yacht settles into its own rescue berth.
The browser suite also completes World 1's first harbor through real thrust
and braking. It does not claim optimal times or complete control-only coverage
of all thirty-six levels.

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
without a test harness. The standalone build is checked for external assets
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
