# Architecture

## One simulation, two environments

The physics, navigation, jobs, level, storage, console and verification modules
expose CommonJS exports for Node and named globals for the browser. `archipelago.js` supplies level data to
`levels.js`. The source page loads sixteen scripts in a fixed order; `build.cjs`
inlines the same files, without transforming the mechanics or fetching assets.

`game.js` owns the current level, run, inputs, modal state and optional circuit.
`requestAnimationFrame` advances a 1/120-second accumulator and draws the latest
state. Simulation time, not frame count or wall-clock time, drives every hazard.
Long frame gaps pause into practice rather than granting ranked catch-up time.

`console.js` publishes the small, frozen `DeadSlow` menu on ordinary launches.
Inspection returns detached data; mutations mark the attempt and any circuit as
practice. Animated acceleration feeds the same fixed-step loop, capped at 480
ticks per frame with backlog retained. Manual stepping and replay also go
through `simulationStep()`; there is no alternate fast physics implementation.
`verification.js` is generated from the checked-in JSON input recordings, with
its reproducibility tested. See `CONSOLE.md` for the public commands.

The raw test harness is exposed only with the `?test` query parameter. Normal
launches have no `DeadSlowTest` global. This is not an anti-cheat boundary: local
code and records are intentionally inspectable and editable.

## Tick responsibilities

The orchestrator takes the player’s local water sample, integrates the player,
updates gate state, integrates free towable bodies and applies the tow
constraint, then resolves solid/body contacts. It advances ordered pilot,
lock and island-job objectives, recomputes mooring readiness, adds splits and
samples the player ghost. See `advance()` for the exact ordering.

`navigation.js` supplies the same coast rectangles to physics and rendering.
Levels have explicit `openSides`: all four in the archipelago, west in the
other worlds. Whole-hull containment is checked for the player and all
casualties before and after contact resolution, before objective completion.
An exit immediately fails the attempt; no clamp, collision penalty or rebound
is applied. The renderer shows only a local warning near an open edge.

Menus freeze all hulls, ramps, winches and clocks. Input state is cleared on
pause, lost focus and pointer cancellation. Retry reconstructs the entire run,
including anchored casualties, traffic phase and job manifest. In a circuit,
time and cleanliness costs from the failed attempt carry forward.

## Ship physics

State includes position, heading, ground velocity, yaw rate, engine output,
rudder, hull integrity, length, beam, relative mass and draft. Throttle is a
persistent signed notch; actual engine output approaches its command over time.
Drag uses water-relative longitudinal and transverse motion. Rudder force
responds to the direction of water flow; bow thrust has force and a yaw moment.
No command directly zeroes velocity.

`environmentAt()` samples along a hull. Spatial current zones, deterministic
pulses, wind and feathered shelter are shared by the physics, instruments and
renderer. Irregular islands are convex polygons. Static and dynamic collision
use the same hull geometry; ferry hulls are double-ended. A collision applies
separation and contact impulses rather than merely reducing a score.

The numerical coefficients are designed for readable slow handling, not matched
to a measured real vessel. Relative mass and line force are not tonnes/kN.

## Towline and casualty lifecycle

A casualty begins `moored` at its designated anchor. F attaches only the active
job’s target, within 44 m and low relative attachment-point speed, with an
unobstructed segment. Attachment releases the anchor and sets `wasTowed`.

The stern-to-bow tow constraint is a damped, implicitly stepped unilateral
spring. Extension generates equal-and-opposite impulses at attachment points,
including yaw moments. A slack line generates no compressive push. Winching
changes its rest length at a bounded rate, not the position of either hull.
Large bodies carry their own drag scaling and water sample.

Continuous overload or obstacle chafe parts the line. It can be recovered;
`lineBreaks` marks the run unclean. Releasing a line preserves body velocities.
Towlines do not wrap around land or collide with traffic as physical ropes.
Their straight obstruction segment is authoritative; the curved slack drawing
is visual only. Gates include hulls and the connected segment in safety checks.

A target must have towing history, whole-hull containment, matching heading,
low translation/yaw and an uninterrupted two-second berth hold. Shore crew then
secure it and release the line. This terminal mooring state fixes it in place;
it is the only deliberate transition from a free casualty to a fixed body.
It remains solid. Completing the rescue does not complete the player’s arrival.

## Ferry jobs

`jobs.js` has no DOM access. It maintains the active job index, settle timer,
ramp fraction, transfer timer, committed transfer count, manifest and base mass.
A low-speed, aligned, whole-hull fit in neutral allows the ramp to open. Each
completed transfer moves exactly one manifest entry and updates the ship mass.

An interrupted call resets the transient transfer timer, not the committed
vehicle count. Completed vehicles are never generated again on re-entry. After
the required count is reached, the ramp closes before the next job begins.
The orchestrator inhibits propulsion while the ramp is down, but drag/current
can still move the ferry. There is no magic positional clamp at a vehicle ramp.

Tow and ferry completion emit job events. The orchestrator creates a real split
at each event. Prerequisites require all jobs, an empty deck and no connected
line before the final green-berth hold can finish.

## Presentation and persistence

`renderer.js` draws charts, islands, ferries, deck vehicles, hulls and towlines
from simulation state. Seeded scenery varies by island without consuming any
simulation randomness. The twelve-second neutral guide clones the ship and its
attached tow; it is deliberately not collision prediction. The best-run ghost
tracks the player only. Ghost density is lower in longer archipelago stages;
the retained sample cap is 12,000.

`audio.js` is procedural and optional. Sound does not drive physics or clocks.
The horn uses four detuned, harmonic-rich periodic waves, soft saturation,
high/low-pass filtering and a sustained envelope. Voices cannot stack through
repeated H presses; completed nodes disconnect. Mute fades the current envelope
to zero. The browser suite renders the actual graph in an OfflineAudioContext.

`storage.js` contains all local record filtering and migrations. The unchanged
storage key is `dead-slow.records.v1`, even though the schema is version 5.
Version-2 Grand Tours move to `archivedRaces['grand-tour-24']`. Ten changed island
departures move into `archivedStages`, preserving their ghosts and splits.
Pre-schema-4 World 3/Grand Tour records move to the `archipelago-dock-starts`
and `grand-tour-dock-starts` archives. The tutorials and World 1/2 stay active.
Re-importing older data cannot revive incompatible current PBs, and the
migration is idempotent. Imported text is JSON, not
executable content. The UI rejects files over 5 MiB and renders imported fields
as data. Local logbooks are not trusted evidence of competitive rankings.

## Keeping changes reviewable

Add new world jobs to `archipelago.js`; keep shared physics out of level data.
Change loading/rope behavior in `jobs.js`, not in drawing code. Changes to global
physics can invalidate old times even when geometry remains the same; treat
that as a record-compatibility decision. The fixed-input fixtures detect
unintentional handling drift in both an exposed berth and the island tutorials.

## World 6 separation

`space-levels.js` defines thirteen data-only assignments. `space.js` owns pure
spacecraft physics and mission state; it shares hull/SAT/contact helpers, not
water integration or rudder forces. `space-renderer.js` consumes simulation
state without changing it. `space-ui.js` maps the shared helm to flight labels
and restores marine labels on return. The offline builder now inlines sixteen
modules in explicit source-page order.

The game dispatches each fixed tick to `advanceSpace` for space sectors, keeping
clocks, console playback, result/ranking rules, keyboard and touch input common.
No accumulator fast-forward changes physics step size. Propellant is a scalar
reference-mass impulse reserve; spacecraft mass is held constant rather than
implementing a rocket-equation mass-flow model. Beams conserve pair momentum.
Terminal captures dissipate only the permitted small relative motion.

Time travel records the actual first leg at 30 Hz plus explicit start/end
samples, interpolates its solid echo, and never rewinds the score clock.
Control transfers and the chronogate jump are excluded from travelled distance.
The Century Ship reduces ghost sampling to one second; all simulation still
runs at 120 Hz. `bonus` is data, not an assumed last-array index. Schema 5 adds
Meridian records and archives incompatible 36-stage Grand Tour times while
retaining all established sea-world records.


## Eight-world atlas (5.1)

`HarborLevels` contains only playable stages, ordered by the visible campaign.
`HarborLevels.catalog` additionally contains 36 disabled coming-soon cards.
`HarborWorlds` holds all eight chapters; `comingSoon` gates launching and circuit
availability. Stable stage and campaign IDs, not numeric world positions, key
logbooks and author replays. The complete active route is worlds 1–2–3–4–6.

Restart confirmation owns a temporary `confirming` state and a snapshot of the
previous dialog/status; it does not reset mission data. Only confirmation calls
the internal reset. Cancelling a running attempt invokes the existing practice
policy because the simulation was paused. Readouts use the previous terminal
state when showing a completed circuit stage's clock during confirmation.

Geothermal zones are convex polygons and vent circles shared between field
rendering and whole-ball damage. Their states use fixed in-game time; no timers,
randomness, fluid solver or new dependencies are involved. The translucent
hamster ghost is a single composite of a fully rendered opaque sprite.
