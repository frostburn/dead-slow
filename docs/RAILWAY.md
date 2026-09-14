# The Long Grade: first three assignments

World 5 now has three playable missions. The other nine retain their named,
disabled catalog entries. These three are standalone trials until the full
campaign is ready, so the existing 60-stage Grand Tour and its records retain
their meaning. New stage IDs are the previously unused `long-grade-1` through
`long-grade-3`; existing save schemas and record imports remain compatible.

## Engine boundaries

`src/rail-levels.js` contains the track surveys, initial vehicles, switches,
destination zones and objective dependencies. `src/rail.js` has no DOM,
renderer, clock or dependency on the ship simulation. Its units are metres,
seconds, kilograms and newtons. The shared game loop advances it at 120 Hz.
`src/rail-view.js` owns train controls and canvas presentation.

Each connected cut owns an oriented, arc-length route history. Each vehicle
has its own coordinate and velocity along that history, mass, length, facing,
air pressure, brake temperature and handbrake state. Vehicles follow the
route actually traversed by the head. History is discarded only after the
whole cut clears; reversals can then take newly selected points. Occupancy
includes bodies, coupler gaps and a 12 m point-clearance margin.

Forces sum per vehicle: surveyed grade, resistance, adhesion-limited traction,
braking and adjacent coupler forces with free slack and damping. Brake orders
travel through the train with a delay and pressure response. Heat follows brake
work and cooling; fade begins at 180°C. Detached cuts retain air temporarily;
handbrakes hold them indefinitely. Gentle coupling merges routes, reverses
vehicle facing when needed and conserves longitudinal momentum. A route check
prevents coupling across adjacent parallel tracks.

Stopping distance estimates full service braking with current temperature,
mass-weighted grade and brake response delay. It is an estimate, not a promised
stop point; changing grades ahead and coupler movement still matter. Curve
limits apply to every wagon, with sustained severe overspeed ending a run.

## Sound, warnings and a watchable run

The train has filtered diesel rumble, distance-driven wheel joints, braking
noise, air release and mechanical coupling/point cues. Sound stops on pause,
mute, departure changes and failure. Cue counts are bounded during accelerated
playback. The shared horn remains available with H.

Curve warnings inspect each wagon and a copy of the selected route ahead.
Amber highlights the approaching speed restriction or an overspeed wagon;
red begins at 120% of the limit, before the sustained 135% derailment threshold.
Looking ahead does not reserve points. Junction lamps highlight both the common
track and the selected branch. Reverse is always labeled as an action.

5-01 has a fixed input recording available from **Watch run** in the briefing
or `DeadSlow.watch("long-grade-1", 8)`. It completes in 590.408 seconds of
simulation time (about 74 seconds at 8×). No vehicle positions or objectives
are changed during playback. **Take controls**, or retrying the demonstration,
starts a fresh ranked attempt at 1×. Console playback keeps the existing
console speed behavior. Regenerate with `node tools/record-rail-run.cjs`
followed by `node tools/sync-replays.cjs`.

## Space for the remaining missions

The graph, separate cuts and per-vehicle state are shared foundations, not
mission-specific movement scripts. Later mechanics should attach here:

| Missions | Extension point |
| --- | --- |
| 5-04, 5-12 | Add dispatcher-controlled consists and visible signal blocks using route occupancy. |
| 5-05 | Moving detached cuts and momentum-preserving coupling already exist; add interception objectives and catch-siding outcomes. |
| 5-06 | Track adhesion already limits traction/braking; add weather and explicit sliding feedback. |
| 5-07 | Aggregate vehicles occupying a bridge edge for load limits; destinations can require cargo order. |
| 5-08 | Derive carrier overhang and swept clearance from sampled front/rear positions along candidate routes. |
| 5-09 | Split powered-vehicle commands into front/helper groups; retain individual grades and coupler loads. |
| 5-10 | Attach a mass/balance model to ferry deck edges and ramp availability. |
| 5-11 | Close edges according to a visible flood forecast; collection remains ordinary coupling. |

These extensions are not shipped mechanics yet. In particular, collision
handling currently covers the player’s train approaching detached cuts;
multiple autonomous trains will need general pairwise collision and block
reservation handling. Route history is not a full signaling system.

## Validation

`node --test tests/rail.test.cjs` covers the full control-only route in 5-01,
the complete run-around/delivery sequence in 5-02, and both descent routes in
5-03, including the cooling loop. The feedback driver issues ordinary power,
brake, reverser, coupling and switch commands without moving vehicles directly.
It is a conservative smoke driver, not an authored pace or optimal solution.

Separate tests cover tail occupancy, air-brake delay, temperature-dependent
stopping estimates, detached handbrakes, shared records and pause/retry rules.
Those geometry/objective fixtures are explicitly distinguished from routes.
The existing suite was run; its marine-only spawn filter was updated to exclude
railway assignments. No existing circuit or physics recording changes.

The actual renderer was inspected through native canvas, and all source scripts
were exercised against a DOM to check controls and stage loading. Full browser
layout and touch QA remain for CI/review: browser access to the cloud preview
was blocked in this Work chat. No localhost permission request was repeated.

`npm run build` produces the complete offline game in `dist/index.html`, with
all 23 modules and the stylesheet inlined. Generated builds are not committed.
