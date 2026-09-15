# The Long Grade: twelve assignments

Version 6 completes World 5. All twelve assignments join the railway circuit
and the 72-stage Grand Tour. Schema 16 archives the earlier tour separately;
records for the first eight railway missions remain active.

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
`DeadSlow.watch("long-grade-1", 8)`. The transformer shuttle is available as
`DeadSlow.watch("long-grade-7", 16)` (3212.208 simulated seconds). Regenerate
that recording with `node tools/record-rail-run.cjs 7` and `node tools/sync-replays.cjs`. The tutorial completes in 590.408 seconds of
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
The cargo assignment now uses a full-load headshunt stop followed by a reverse
push into the export spur. A route ribbon, four spaced silhouettes and one
collision outline replace the dense overlapping preview rectangles.

Head and tail always follow the selected reverser. UI speed is signed against
that direction, so rollback reads negative. Warning entry ignores tiny stopping
vibrations; action buttons require a quiet eligibility interval before relighting.
These display filters do not change physics or relax command validation.

Schema 15 archives the earlier bridge and cargo results. Bridge support pairs
must remain adjacent in the same cut whenever either vehicle occupies the span.
Assembly tasks can require wagon order toward the siding's buffers, ignoring
the locomotive's position within the completed train.

## Assignments 5-09 through 5-12

| Assignment | Route and handling problem |
| --- | --- |
| A Push from Behind | Couple No. 42 at the rear. Share a 24 m climb between front power and rear assistance, then reduce each as its end crosses the crest. Leave the helper in the marked summit berth and deliver the ore freight without it. |
| The Railway Ends Here | Split the rear pair before pushing the first pair aboard with the reach wagon. Retrieve the second pair, use the quay loop to get behind it, and push it onto the other deck. Park the locomotive and reach wagon ashore. |
| The Last Working Line | Retrieve the lowland cut before Low Crossing floods, then enter the dead-end quarry spur, collect its wagons and stop at the crew platform. Reverse clear of the junction and climb to the upland refuge. Every route remains physically usable until its forecast closure. |
| The Long Grade | Couple the helper, cross the mountain, retire it, descend with cool brakes, meet the coastal passenger in Lantern loop, then bring every supply wagon into the terminal. All deliveries and helper retirement remain live requirements. |

The main engine is identified by its persistent `engine` ID, independently of
the group order or other powered vehicles. U / J controls rear assistance;
Space cuts both engines and applies the train brake. Detached helpers cannot
receive power. Brakes still propagate from the main locomotive. A sustained
pull above 120 kN overloads the mountain couplers after eight seconds; excessive
rear compression on restrictive curves has its own visible warning and limit.
The grade strip shows the crest moving through the whole train.

Ferry balance counts each body's fraction actually aboard, including the reach
wagon. A 65 t side-to-side difference uses the full four-degree ramp envelope.
Loading all freight onto one deck overloads it; the locomotive is prohibited
from crossing the shore boundary. The boat and ramp display the current load.

Flood closures use surveyed track intervals and simulation time. Any part of
a vehicle entering a closed interval ends the run. The forecast is visible
from departure; no collection order or revisits are prohibited by script.
The crew boards after a stopped, five-second platform dwell.

`DeadSlow.watch("long-grade-12", 16)` plays the complete finale in about 160
seconds (2557.808 simulated seconds). Regenerate it with
`node tools/record-rail-run.cjs 12`, then `node tools/sync-replays.cjs`.

## Validation

`node --test tests/rail.test.cjs` covers the full control-only route in 5-01,
the complete run-around/delivery sequence in 5-02, and both descent routes in
5-03, including the cooling loop. The feedback driver issues ordinary power,
brake, reverser, coupling and switch commands without moving vehicles directly.
It is a conservative smoke driver, not an authored pace or optimal solution.

`tests/rail-sprint.test.cjs` completes assignments 4–8 using ordinary controls,
including both interception routes, the emergency catch, and the complete
pocket/shuttle/return-loop sequence. `tests/rail-final.test.cjs` completes all
four final missions. `tests/version-six.test.cjs` probes helper command guards,
balanced and unbalanced coupler loading, partial ferry boarding, flood
boundaries, volcanic gravity and record migration.

Separate tests cover tail occupancy, air-brake delay, temperature-dependent
stopping estimates, detached handbrakes, shared records and pause/retry rules.
Those geometry/objective fixtures are explicitly distinguished from routes.
Circuit tests check the railway route and the field-to-rail-to-space transitions.

The actual renderer was inspected through native canvas, and all source scripts
were exercised against a DOM to check controls and stage loading. Full browser
layout and touch QA remain for CI/review: browser access to the cloud preview
was blocked in this Work chat. No localhost permission request was repeated.

`npm run build` produces the complete offline game in `dist/index.html`, with
all 23 modules and the stylesheet inlined. Generated builds are not committed.
