# Architecture

## Runtime and build

The game remains plain JavaScript with CommonJS exports for Node tests and
named browser globals. `index.html` is the ordered source manifest;
`tools/build.cjs` inlines its modules and stylesheet without transpiling physics.
The resulting `dist/index.html` runs offline with no runtime dependencies.
Duplicate modules and external code assets fail the build.

TypeScript is a pinned development dependency. `npm run typecheck` checks JS
with JSDoc under strict settings, without emitting files. The first checked
boundaries are commands, simulation adapters, compatibility and railway level
data. `contracts.d.ts` describes the adapter's ports; `rail-level-types.d.ts`
describes the railway's mission variants. `tsconfig.json` is an explicit list,
so unchecked legacy internals are visible rather than hidden behind `any`.
`tests/contracts.ts` guards against accidentally weakening these contracts.

## Shared shell and domain state

`game.js` owns input lifetime, modal state, the fixed-step clock, circuits,
records and the current adapter. `simulations.js` resolves the level's explicit
`simulation` ID and rejects missing or duplicate registrations.

Every adapter creates its domain state and supplies `step`, `ready` and `clean`.
The railway adapter in `rail-adapter.js` also owns its command/audio integration,
presentation delegates, ghost sampling and result details. It receives narrow
services rather than reaching into the shell's globals. A railway run has a
`rail` state and a camera/ghost `focus`; it has no placeholder ship, marine jobs,
water environment or dock. Its vehicles remain an articulated network object.

Marine, space and rolling registrations still delegate to their established
functions in `game.js`. Their engines are separate modules, but their shell
integration is not yet fully extracted. Move those adapters when their next
substantial change needs it. Do not add a universal vehicle object merely to
make incompatible domains look alike. A future campaign should register an
adapter and declare its own state and commands.

## Time and commands

`requestAnimationFrame` feeds a 1/120-second accumulator. Simulation time drives
hazards, passenger movement, brake propagation and objectives. Manual stepping,
recording playback and accelerated watching use that same path. Acceleration
adds ticks; it never increases the timestep. Long frame gaps and hidden tabs
pause into practice. Window-focus pausing is optional; held inputs are cleared
on focus loss. Shift+R retries immediately without a confirmation dialog.

`rail-commands.js` is the shared definition of railway command payloads, lever
metadata and keyboard mappings. UI buttons, keys, `DeadSlow.rail()` and recorded
commands all reach the adapter and then `Railway.command()`. The engine validates
the payload and current eligibility before applying it. The UI may explain or
disable an action; it cannot authorize one. Numeric lever commands retain their
existing clamping behavior. Invalid commands do not mutate train state beyond
a notice. Uncoupling identifies both neighboring vehicles; old recording strings
remain supported and resolve against the current topology.

Coupling prepares a candidate route and verifies every donor vehicle before
publishing the merged consist, conserved momentum and selection. Uncoupling
publishes both cuts and the selected detached cut in one synchronous transition.
No render, callback or async work runs in the middle. `assertInvariants()` checks
unique vehicle ownership, finite motion, a valid selected cut and attached
helper power. Bounded mixed-command tests exercise those invariants.

The console exposes detached inspection data. Mutations mark attempts and
circuits as practice; replay cannot write ranked records. `?test` exposes the
raw harness only for tests. This is an inspectable local game, not an anti-cheat
system. See [CONSOLE.md](CONSOLE.md).

## Simulation and presentation

`rail.js` owns track sampling, switch occupancy, per-car grade and adhesion,
brake response and heat, coupler forces, coupling and objectives. Rendering uses
the same geometry. `tools/validate-rail.cjs` checks references, switch connections,
passenger route continuity and task dependencies before a release. Structural
types alone cannot detect a misspelled track or vehicle ID.

`rail-presentation.js` produces one HUD snapshot of metrics, warnings, assistance
and action eligibility. Warning holds and action hysteresis live in WeakMaps
outside physics state. Snapshot creation never changes the simulated train.
Topology changes reset action history. Head/tail follow the selected driving end;
speed can be negative during rollback. `rail-view.js` consumes this projection
and draws the chart; procedural audio is another consumer, never a clock source.

The established marine engines retain water-relative drag, whole-hull collision,
open chart boundaries and real tow momentum. Space uses its own forces while
sharing geometry helpers. Rolling terrain and hazards share surveyed geometry
with their renderer. Preserve these domain rules during later extractions.

## Records, courses and recordings

The storage key remains `dead-slow.records.v1`. Schema **18** changes the JSON
format to carry compatibility metadata; schemas 1–17 still pass through their
historical migrations. A frozen schema-17 route manifest supplies legacy signatures,
so future additions and reordered circuits cannot adopt old results. This refactor keeps all current course/rule revisions at
1, so existing version-17 records remain comparable.

`compatibility.js` derives a stage signature from `simulation`, `courseRevision`
and `rulesRevision`. Circuit signatures include the ordered stage IDs and their
signatures. Change a course revision for geometry/start/objective changes; change
rules revisions on affected levels for handling/scoring changes. Neither requires
a new save schema. Text, layout and sound edits normally change neither.

On import/load, incompatible active results, ghosts and splits move into named
archives; compatible records stay active. Full archived signatures accompany
compact archive keys, and hash collisions cannot merge unrelated records. The
logbook exposes archived results and exports preserve them. Sanitizing an already
migrated save is idempotent. Imported data is filtered JSON, never executable.

`verification.js` is generated from checked-in JSON control recordings. Legacy
recordings receive baseline compatibility metadata during synchronization; later
recordings must declare their course signature when it differs. `watch` rejects
incompatible recordings before loading a run. Do not regenerate input sequences
to conceal refactor drift: existing recordings must keep their completion times,
cleanliness and outcomes. See [TESTING.md](TESTING.md).

## Scope of the next campaigns

The atlas has eight worlds, six complete campaigns, 72 circuit missions and one
separate bonus. Stable IDs identify stages and campaigns; world numbers are
presentation. The remaining 24 cards are disabled placeholders.

Build new mechanics inside their domain engine, with a small command contract,
validated level data and a presentation projection. Share the shell's clock,
practice policy, input cleanup, circuits and records. Extract another abstraction
only when two domains need the same behavior; preserve the offline HTML deliverable.

## Pale Reach surface service

`polar-levels.js` declares the first three World 7 charts. `polar.js` owns a
12-metre sheet grid, per-cell opening times and closure rates, physical fleet
ships, drifting solids, cargo states and completion. `polar-adapter.js` plugs
that state into the existing shell; `polar-view.js` draws the same collision
grid and exposes the two captain orders. No marine job state is fabricated.

Sheet fractures require forward momentum and a bow approach, cost speed and
open a narrow shoulder beside the hull. Pressure ridges remain impassable.
Slush is a continuous resistance field after a 20-second grace period; an
opened cell never becomes a solid collider under a vessel. Breaking can leave
mass-bearing floes, spawned only after occupied hulls clear their location.
Icebergs drift independently, collide as solid bodies, and already carry keel
metadata; depth bands and sonar are reserved for later assignments.

Supply captains plan connected cleared water with beam clearance, then apply
the same engine lag, thrust, rudder, drag and collision model as the player.
They brake for ice and traffic. Hold cannot erase velocity. They unload at
rest, await a fresh Proceed for their return, and must get home with their
hulls intact. Navigation may retain its last valid route when a conservative
planning clearance rejects the current grid cell; physics still prevents
crossing intact sheet. Paths are requests, never position constraints.

Partial World 7 assignments have normal individual records and ghosts, with
`polar:1:1` compatibility stamps. `standalone` excludes them from the existing
72-stage Grand Tour until the complete campaign exists; prior circuits keep
their signatures. `tests/polar.test.cjs` covers boundaries and completes all
three missions through ordinary controls at 120 Hz. Browser UI checks run
inside the existing atlas job; there is no additional CI matrix or job.
