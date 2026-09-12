# Level design

## Coordinates and identity

The chart uses metres: x increases right/east and y increases down/south.
Heading zero points east; positive angles turn clockwise. Level headings are in
radians; the UI converts them to compass bearings. Give each course a stable,
unique kebab-case ID. IDs are record keys, not display names.

`levels.js` owns the three-world catalog and the first two sets of twelve.
`archipelago.js` supplies the third set. Common arrays are defaulted to empty in
`levels.js`. World/stage numbering currently groups the catalog in sets of
twelve; adding a differently sized world also requires changing that assignment
and the menu progress labels. Do not silently assume it is fully data-driven.

## Core data

A level defines `id`, `name`, `kind`, `brief`, `tip`, `world: [width, height]`,
`start: [x, y, heading]`, `spec`, final `berth` and three `pace` times in seconds.
Optional systems include rectangle `obstacles`, convex `islands`, ordered
`buoys`, timed/keyed `gates`, `lock`, `traffic`, `current`, `currentZones`, `wind`,
`tide`, `shelters` and `speedZones`. Copy a nearby working level rather than
inventing a parallel geometry format.

Static obstacle rectangles use x/y as their **top-left** corner and w/h as
extents. Berths, job slips and hulls use a **center** x/y, longitudinal length
`l`, lateral width `w` and heading `a`. That distinction is important when
placing a quay beside, rather than through, a target.

A berth also has angular tolerance `angle` (degrees), a speed threshold in m/s
and optional hold duration for rescue work. Own-ship final mooring always uses
a two-second hold in the orchestrator. Pilot buoy speed limits are m/s too.

## Vehicle-ferry example

```js
{
    id: 'island-service-example',
    name: 'The Island Service',
    world: [520, 310],
    start: [88, 156, 0],
    spec: { length: 34, beam: 13, mass: 1.15, draft: 2.8,
        vessel: 'ferry', propulsion: 1.15, capacity: 6, name: 'MS LINNEA' },
    berth: { x: 432, y: 156, a: 0, l: 48, w: 27, angle: 12, speed: 0.2 },
    jobs: [
        { type: 'load', name: 'Mainland · board 3', x: 88, y: 156, a: 0,
            l: 48, w: 27, angle: 12, speed: 0.2,
            vehicles: ['car', 'van', 'car'], rampEnd: -1 },
        { type: 'unload', name: 'Island · unload 3', x: 432, y: 156, a: 0,
            l: 48, w: 27, angle: 12, speed: 0.2, count: 3, rampEnd: 1 }
    ]
}
```

This is a schema sketch, not an automatically registered stage; supply the
brief, tip, pace, terrain and remaining fields as in existing levels. `rampEnd`
selects the stern (-1) or bow (+1) animation. Both ramp types still require the
specified hull orientation. A return trip may unload and load at the same slip;
the renderer groups overlapping calls and highlights the active one.

Vehicles are `car`, `van` and `bus`. Capacity currently counts vehicles, not
lane-metres. The visible deck is illustrative; this is not a vehicle packing
solver. Ensure every intermediate manifest is nonnegative, never exceeds
capacity, and finishes empty. Do not order an unload of vehicles never boarded.

## Tow work

Add a `towables` entry with unique `id`, display `name`, `start`, `length`,
`beam`, `mass`, `draft` and render `vessel` type. The job references its target ID:

```js
{ type: 'tow', target: 'yacht', name: 'Yacht · rescue berth',
  x: 326, y: 156, a: 0, l: 80, w: 36, angle: 20, speed: 0.42, hold: 2 }
```

Every casualty should have one corresponding tow job. They remain anchored
until the active job allows pickup. Begin a tutorial with the stern and bow
attachment points close enough for F; later levels can require approach work.
A player berth must fit the actual ferry or tug, not just the default cargo ship.

The tug needs room **beyond the casualty's target**: it cannot tow from inside
its own hull or stop the load on demand. Allow the casualty to coast into its
berth while the tug clears the approach. Keep enough turning radius for the
whole formation. A line drawn through land is not a shortcut. Wider berths and
sheltered final water are useful ways to teach towing without weakening inertia.

## Validation and balance

Run the geometry/manifest tests after each change. Every island must be convex;
represent a concave island as several non-overlapping convex parts instead of
feeding concavity to the separating-axis solver. Check both starting hulls and
all job/final goal poses against every obstacle. This proves geometric fit,
**not** the existence of a route.

Exercise job prerequisites separately from navigation. Then record real-control
runs for representative levels. Put fixed event fixtures in `tests/fixtures/`
and replay them through `tests/headless.cjs`. A fixture may contain input events,
not position/velocity edits or directly completed objectives. The supplied
island verifier shows the pattern.

Pace times are design targets, not verified optimal times. Begin permissively;
use observed human routes to tune later medals. Current puzzles should preserve
room for correction and clearly mark their sheltered arrival water. Avoid
project-history language such as “the original level” or “moved from World 1”
in the player's brief, kind and tip: describe the situation and the task.
