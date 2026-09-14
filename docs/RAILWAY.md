# The Long Grade: eight assignments

World 5 now has eight playable missions. The other four retain their named,
disabled catalog entries. These eight are standalone trials until the full
campaign is ready, so the existing 60-stage Grand Tour and its records retain
their meaning. New stage IDs are the previously unused `long-grade-1` through
`long-grade-8`; existing save schemas and record imports remain compatible.

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

Buffer and track-end impacts count once per contact episode. Stopping at the
buffers does not erase approach speed: an impact over 2 km/h blocks coupling
until the cuts separate beyond 3 m and approach again. Final parking requires
the listed wagons to remain coupled to the locomotive; delivery tasks still
allow the detached, secured cuts needed for shunting.

Stopping distance estimates full service braking with current temperature,
mass-weighted grade and brake response delay. It is an estimate, not a promised
stop point; changing grades ahead and coupler movement still matter. Curve
limits apply to every wagon, with sustained severe overspeed ending a run.

## Sound, warnings and a watchable run

The train has filtered diesel rumble, distance-driven paired bogie clacks, braking
noise, air release and mechanical coupling/point cues. Sound stops on pause,
mute, departure changes and failure. Cue counts are bounded during accelerated
playback. The shared horn remains available with H.

Curve warnings inspect each wagon and a copy of the selected route ahead.
Amber highlights the approaching speed restriction or an overspeed wagon;
red begins at 120% of the limit, before the sustained 135% derailment threshold.
Looking ahead does not reserve points. Junction lamps highlight both the common
track and the selected branch. Reverse is always labeled as an action.

5-01 has a fixed input recording available through the browser console:
`DeadSlow.watch("long-grade-1", 8)`. It completes in 590.408 seconds of
simulation time (about 74 seconds at 8×). No vehicle positions or objectives
are changed during playback. `DeadSlow.normal()` starts a fresh ranked attempt at 1×. Replay controls stay
out of the player UI. Regenerate with `node tools/record-rail-run.cjs`
followed by `node tools/sync-replays.cjs`.

## Assignments 5-04 through 5-08

| Assignment | Handling problem and reusable mechanic |
| --- | --- |
| Meet at Rook’s Hollow | A scheduled passenger follows a surveyed route with acceleration, braking, edge-sized signal blocks and point reservations. The full freight fits Rook’s loop; the short refuge requires splitting. |
| Three Wagons Going Somewhere | Detached cuts may start with speed and empty air reservoirs. Both service connections permit interception; coupling conserves the moving cuts’ longitudinal momentum. The gravel bed adds resistance and counts one rough contact. Secure the caught wagons manually. |
| Leaves on the Line | Low track adhesion limits tractive effort. Excess brake demand slides the wheels and reduces effective grip; brake estimates include that reduction. Rain and shaded ballast show the affected track. |
| One Bridge, Two Loads | Bridge capacity counts the full mass of every vehicle whose body overlaps the span. The locomotive begins between the loads. A receiving pocket and engine return loop allow ordered reassembly without teleporting or trapping the locomotive. |
| The Corners Are the Cargo | A vessel spans two articulated carriers. Its actual swept rectangle is checked against visible platforms and equipment. The preview uses the same geometry along a copy of the selected route; inspection does not reserve points. |

Traffic uses a separate autonomous consist representation with a prescribed
route, bounded acceleration/deceleration, body occupancy and collision checks
against player cuts. Its current route uses whole track edges as signal
blocks. Timetable holds cost elapsed time, without an additional score penalty.
Passenger vehicles do not participate in the player's coupling controls.

Bridge ratings and cargo clearance are physical requirements, not mission
checkpoints. Cargo carrier links cannot be split while the vessel spans them.
Assembly tasks can require wagon order toward the siding's buffers, ignoring
the locomotive's position within the completed train.

Future helper locomotives can build on per-vehicle force, facing and coupler
state. Ferry deck balance can build on body-based edge occupancy and mass
aggregation. Flood closures can extend the existing visible closed-track
boundary. Missions 5-09 through 5-12 remain disabled.

## Validation

`node --test tests/rail.test.cjs` covers the full control-only route in 5-01,
the complete run-around/delivery sequence in 5-02, and both descent routes in
5-03, including the cooling loop. The feedback driver issues ordinary power,
brake, reverser, coupling and switch commands without moving vehicles directly.
It is a conservative smoke driver, not an authored pace or optimal solution.

`tests/rail-sprint.test.cjs` completes all five new assignments using ordinary\ncontrols, including both interception routes, the emergency catch, and the\nfull pocket/shuttle/return-loop sequence. `tests/rail-infrastructure.test.cjs`\nuses isolated geometry and force probes for bridge overlap, sliding, cargo\npreview purity and a passenger held by an uncleared tail.\n\nSeparate tests cover tail occupancy, air-brake delay, temperature-dependent
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
