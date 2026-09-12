# DEAD SLOW — Harbor Trials

**Neutral is not a brake.** A top-down ship-handling game about arriving slowly,
with enough room left to stop. Thirty-six stages, three worlds, local speedrun
records, personal-best ghosts, keyboard controls and a multitouch helm.

![The First Crossing, in the Nordic-inspired archipelago](docs/images/archipelago.png)

## Play

Open **`dist/index.html`** from the release archive in a browser. The game is one
self-contained HTML file: no downloads, accounts, server, tracking or external
assets. Some mobile file managers show HTML as a preview rather than opening a
browser; a static web host or the local server below avoids that restriction.

For source development, use Node.js 22 or newer:

```sh
npm run build
npm run serve
```

Open `http://127.0.0.1:8080` for the source version, or
`http://127.0.0.1:8080/dist/` for the standalone build. No npm packages are needed
for the game, build, server or Node tests. `npm ci` is optional and uses the
included dependency-free lockfile. Set `PORT` to change the local port; set
`HOST=0.0.0.0` only when intentionally exposing the server to your local network.

## Three worlds

**World 1 — The Sheltered Coast.** Twelve daylight harbor trials teach braking,
berth alignment, gates, crossing traffic, locks, reverse parking, loading,
tides and no-wake approaches. The current-heavy destinations have marked lee
water and solid wavebreaks. Shelter reduces the water's influence, not the
ship's existing momentum.

**World 2 — Northwatch.** Twelve industrial night-watch challenges: exposed
cross-current berths, a pulsing sluice, double booms, narrower lock approaches,
a heavier hull and a combined harbor examination.

**World 3 — The Archipelago.** A fictional Nordic-inspired island service in a
long summer evening. Granite skerries, pines, red timber cottages, yellow
vehicle ferries and a red working tug. You operate **MS Linnea** or **MT Sisu**.

| Stage | Island work |
| --- | --- |
| The First Crossing | Board four vehicles, cross the sound, unload. |
| A Bigger Boat | Tow a 56-metre yacht with a much smaller tug. |
| The Milk Run | Deliver one manifest to two separate island ramps. |
| The Floating Sauna | Move a broad sauna pontoon around a wooded skerry. |
| Market Day | Carry a full deck through no-wake water and crossing pleasure boats. |
| The Granite Needle | Bring a 66-metre work barge through a rocky passage. |
| The Last Bus Home | Board a bus, cars and a van; catch a swing-bridge window. |
| Slack Water Salvage | Tow a coastal packet through a pulsing cross-set into shelter. |
| Island Exchange | Unload two, board two, then take the changing manifest home. |
| One Line, Two Calls | Recover a yacht and a fishing boat in dispatch order. |
| Cars and a Casualty | Complete ferry duty, then use the empty ferry for a rescue. |
| Midsummer Dispatch | Five vehicles, two village calls, clearance, a bridge and a tow. |

The archipelago has **open water on all four sides**, without a perimeter
seawall. Every Coast and Northwatch harbor has an open western approach. The
chart remains the assignment area: crossing its edge with any part of your
hull or a casualty ends the attempt. A small warning appears only within 30
metres of an open edge; there is no invisible wall to bounce off.

After the two island tutorials, ferries start empty in the fairway and must
reach their first ramp; tugs start outside line-passing range and must approach
the casualty. The positioning leg is part of the clock, not skipped setup.

Every stage is selectable immediately. World circuits each cover twelve stages;
the **Grand Tour** visits all thirty-six. Each route has its own record table.

## At the helm

| Control | Action |
| --- | --- |
| W / S or Up / Down | Move engine telegraph one notch ahead / astern. |
| A / D or Left / Right | Hold port / starboard rudder. |
| Q / E | Hold bow thruster to port / starboard. |
| Space | Order neutral. This does not stop the ship. |
| F | Make fast to the current rescue target, or cast off. |
| J / K | Hold to reel in / pay out the towline. |
| R | Instant retry; avoids opening a menu. |
| Escape | Pause / return. Pausing makes the attempt unranked. |
| Z | Cycle chart zoom. |
| G / V / M / H | Toggle ghost / coast guide / audio; sound horn. |

Buttons provide the same controls on touchscreens. Rudder, thruster and winch
can be held simultaneously; cancelling a touch releases its command. The
telegraph stays at its selected notch.

The speedometer reports signed **ground motion**, not engine direction. AHEAD
can remain positive while the propeller is reversing. ASTERN is negative;
ABEAM identifies almost purely sideways motion. The drift instrument separates
port and starboard motion. LOCAL SET reports the current along your own hull.

### Ferry calls

Fit the entire hull inside the **amber** loading or unloading outline, face its
arrow, slow below approximately **0.4 knots**, and order neutral. After a short
settle hold the ramp opens; vehicles cross one at a time and visibly occupy the
deck. Cars, vans and buses contribute different masses, changing acceleration
and stopping distance. Wait for the ramp to close before departing.

There is no loading button. Ordering thrust interrupts loading, closes the ramp
and preserves vehicles already transferred. Return to the same slip to finish
that call without duplicating or losing its manifest. The engine and thruster
are interlocked while the ramp is down; existing drift is not erased.

### Towing

Place your **stern** within **44 metres of the casualty's bow**, with less than
approximately **1.6 knots** relative attachment-point speed and a clear line
between both towing points. Press F. The casualty leaves its anchor only when
you make fast.

The line pulls but cannot push. Both hulls have their own momentum, rotation,
draft and local water sample. J/K adjust line length between **12 and 64 metres**.
Load is displayed as a percentage of the line's configured working strength,
not as a calibrated real-world force. Sustained overload or dragging the line
across rock can part it. Reconnect to recover the job; a parted line loses the
clean-run category, but does not add a hidden time penalty.

A disabled boat continues coasting when released. Bring its *entire hull* into
its own rescue berth, aligned and slow, for two uninterrupted seconds. Shore
crew then secure it and release your line. **You still have to dock your own
vessel.** Other casualties wait at anchor until their turn; there is no hidden
rescue countdown. Delivered boats remain solid obstacles.

### Finish and race

Complete all clearance and service jobs. Fit your own hull inside the final
**green** berth, face the arrow, slow below its stage-specific limit, reduce yaw,
order neutral, let engine output drop below 15%, and hold for two seconds.

The clock is fixed-step **in-game time (120 Hz)**. Gates, traffic, tides and
current pulses reset to identical phases on retry. Circuit clocks retain failed
attempts and retries, but exclude between-stage menus. Pausing, opening a menu
mid-run, losing focus or a long rendering interruption marks the run as practice.

The logbook retains ten overall times and ten clean times per stage/route (with
overlap removed). A clean run has no contacts, wake violations, groundings or
parted lines. Contacts to towed vessels count too. Your own vessel's fastest
ranked run supplies the personal-best ghost and split comparisons; a ghost is
not a full tow-formation replay. Medals are authored pace targets, not claims of
optimal play. The twelve-second neutral-coast guide includes an attached tow,
but not future collisions or traffic avoidance.

## Save data and upgrades

Records live in browser-local storage and are not an online or tamper-proof
leaderboard. Export the logbook before moving between files, browsers or hosts;
then import it through **Logbook**. Import replaces the current local logbook.
Storage denial or quota failure leaves the session playable and exportable.

Logbooks using schemas 1, 2 and 3 are accepted. Schema 4 preserves the ten
repositioned island stages' previous records, ghosts and splits in an archive,
not on the new departure routes' boards. Earlier World 3 and 36-stage Grand Tour
circuits are also archived because their positioning legs differ. The two
island tutorials and World 1/2 records stay active. A previous 24-stage Grand
Tour remains **archived**, never compared to a 36-stage route. Archived times
are visible in the logbook, and their complete data remains in exports.
The same storage key is retained for same-origin upgrades. Renaming a local HTML file may create a separate storage origin in
some browsers, so export/import is the reliable transfer path.

## Repository layout

```text
index.html                 Source page; loads modules directly
style.css                  Responsive bridge, dialogs and three palettes
src/
  physics.js               Hulls, forces, collisions, water, tide, tow constraint
  navigation.js            Shared open-edge collision, containment and warnings
  archipelago.js           Twelve island-service level definitions
  levels.js                World catalog and harbor level definitions
  jobs.js                  Manifest, ramp, towline and rescue state machines
  storage.js               Records, ghosts, validation and migrations
  renderer.js              Procedural Canvas chart and vessels
  audio.js                 Procedural Web Audio engine and signals
  verification.js          Generated, checked-in control recordings for offline replay
  console.js               Secret chart room, time controls and verification playback
  game.js                  Fixed-step orchestration, rules, input and UI
tools/                    Offline builder, local server and trajectory verifier
tests/                    Node tests, browser checks, fixed-input fixtures
docs/                     Architecture, level design and testing notes
.github/                  CI, optional Pages deployment and contribution forms
dist/index.html           Generated offline game (included in release archives)
```

Edit `src`, `index.html` and `style.css`, not `dist/index.html`. The generated
bundle is ignored by git and rebuilt by the deployment workflow.

## Checks

```sh
npm run check              # Parse every JS module and check reproducible bundling
npm run build
npm test                   # Physics, jobs, records, control replays and local server
npm run verify:runs        # All three published author runs, using timed inputs only
```

Browser checks are optional development dependencies, separate from playing:

```sh
python -m venv .venv
# Activate the virtual environment for your operating system.
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/browser_smoke.py --inline --report reports/browser.json
```

With the local server already running, use
`python tests/browser_smoke.py --url http://127.0.0.1:8080/dist/` to test HTTP
navigation and real local storage instead. `--inline` is for restricted test
environments and uses an in-memory storage shim. See [testing notes](docs/TESTING.md)
for coverage, limitations and reproducible trajectory details.

## The secret chart room

The browser console welcomes curious captains. Type `DeadSlow.help()` for
level jumps, 0–32× time, frozen stepping, helm overrides, warping and the actual
verification recordings. `DeadSlow.watch("bigger-boat", 8)` plays a real
control-only rescue; `DeadSlow.verify("all")` measures the three reference runs.
`DeadSlow.times()` keeps their author times separate from unverified medal
pace targets. Assisted runs cannot replace normal records; `DeadSlow.normal()`
starts fresh at normal speed. See the [console guide](docs/CONSOLE.md).

## Push and publish

For an existing checkout, apply the release patch on a new branch, run the
checks, commit and push that branch for review. The full release archive has no
embedded `.git` or credentials; do not overwrite an existing checkout's history.
To start a separate repository from the archive instead:

```sh
git init -b main
git add .
git commit -m "Add Dead Slow harbor and archipelago trials"
```

Create an empty GitHub repository, add its remote, and push `main`. The
**Checks** workflow runs on pushes and pull requests. It includes Node tests on
22 and 24, plus Chromium browser checks. These workflow files are supplied as
configuration; a local test run is not a claim that remote CI has already run.

For optional hosting, choose **Settings → Pages → Source: GitHub Actions**,
then run **Actions → Deploy Pages → Run workflow**. This is a manual, opt-in
workflow; it publishes only `dist/`. There are no hard-coded account names,
base paths, external services or custom secrets. Future deployments are manual
unless you deliberately add a push trigger. Action versions and Pages permissions
follow the official [upload](https://github.com/actions/upload-pages-artifact)
and [deployment](https://github.com/actions/deploy-pages) documentation.

## Design notes and license

This is a tuned planar simulation, not a calibrated maritime trainer. Masses,
windage, propulsion and drag are relative gameplay units; distances and speeds
use a consistent chart scale. There is no roll, heave, flooding model, rope
wrapping around obstacles or simulated driving ashore. Shore mooring and ramp
operations are abstracted; navigation and braking are not automated.

All scenery is procedural Canvas drawing. Audio is synthesized with Web Audio;
no external image, sound or font assets are bundled. Code and procedural artwork
are under the [MIT license](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md),
[architecture](docs/ARCHITECTURE.md) and [level design](docs/LEVEL_DESIGN.md).
