# The secret chart room

Open the browser's developer console and look for **AHOY, CAPTAIN!** The menu
is deliberately absent from the helm and player-facing menus. No developer
URL, extension, account or network connection is required.

```js
DeadSlow.help()
```

The welcome is logged at startup, not triggered by trying to detect whether
DevTools is open. The game does not poll your browser or resize itself to detect
console users. If the browser filters informational messages, enter the command
above directly. Opening DevTools can cause the game's usual focus-loss pause;
`DeadSlow.level(...)` or `DeadSlow.watch(...)` starts a new practice attempt.

## Pick an assignment and speed up

```js
DeadSlow.levels()                // List IDs and one-based world / harbor numbers.
DeadSlow.level(3, 4)             // The Floating Sauna, unranked.
DeadSlow.speed(8)                // Eight times the wall-clock pace.
DeadSlow.speed(0)                // Freeze, without opening a pause dialog.
DeadSlow.step(30)                // Advance exactly 30 simulated seconds.
DeadSlow.speed(1)                // Restore speed; THIS attempt stays unranked.
DeadSlow.normal()                // Fresh, ranked individual attempt at normal time.
```

An ID also works: `DeadSlow.level("floating-sauna")`. Speed accepts finite
numbers from 0 through 32, including slow motion. `DeadSlow.speed()` reads the
current rate without changing anything. Manual stepping accepts 0–600 seconds,
rounded to the nearest simulation tick. `DeadSlow.step()` with no argument
advances one tick. Stepping and helm overrides require a running trial; use
speed zero, rather than a pause dialog, when inspecting a frozen scene.

Acceleration schedules more **1/120-second steps**; it does not enlarge the
physics timestep or multiply thrust. Tides, traffic, jobs, tow forces and clocks
all advance together. Animated playback processes at most 480 ticks per frame
and carries leftover work forward. A slow computer can therefore fall short of
32× without silently skipping physics. Rendering and sound remain presentation,
not timing inputs. Existing long-frame and focus-loss pauses still apply.

## Spare keys to the bridge

```js
DeadSlow.controls({throttle: -1, rudder: 0, thruster: 0, winch: 0})
DeadSlow.line()                  // Real make-fast / cast-off action, not auto-hook.
DeadSlow.warp(150, 200, 0)       // Player x/y in metres, heading in degrees.
DeadSlow.repair()                // Restore hull integrity, not contacts or progress.
const snapshot = DeadSlow.state()
```

Throttle is a whole notch from −3 to 4. Rudder, thruster and winch accept −1 to
1. Unspecified controls retain their values; normal keyboard/touch input can
replace them. Positive rudder/thruster is starboard; positive winch pays out.
`line()` still checks the active target, 44-metre attachment range, relative
speed and obstructions. Casualties are not teleported by `warp`; only the player
is repositioned and stopped. Existing tasks remain. Warping outside the chart
still fails on the next tick. Repair cannot resurrect a failed attempt.

`state()` is a detached JSON snapshot, not a reference to the live game. Editing
it does not move the ship. It includes ship motion, local water, job/line state,
splits and counters. Invalid arguments throw before any partial command runs.

## Watch the actual verification runs

```js
DeadSlow.runs()                  // Available recordings, measured times, source files.
DeadSlow.times()                 // All 36: verified author times OR null; medal targets separately.
DeadSlow.timeline("bigger-boat")  // Timestamped helm and line actions.
DeadSlow.watch("bigger-boat", 8)  // Animate those inputs in the normal game at 8×.
DeadSlow.speed(0)                // Freeze the recording.
DeadSlow.step(10)                // Continue ten seconds along that same input timeline.
DeadSlow.speed(8)                // Resume animated playback.
DeadSlow.report()                // Last recording's measured result, or null before finishing.
DeadSlow.verify("all")           // Execute all three now and return measured reports.
DeadSlow.verify("first-crossing")
```

| Recording ID | Stage | Control-only author time |
| --- | --- | --- |
| `crosscurrent` | World 2 · No Lee Shore | 78.641667 s |
| `first-crossing` | World 3 · The First Crossing | 123.950000 s |
| `bigger-boat` | World 3 · A Bigger Boat | 187.900000 s |

These are full clean completions, not optimal times. They use the actual live
state machine and ordinary throttle, rudder, thruster and line commands. They
never assign coordinates, complete objectives directly or relax physics.
A report is verified only when the run finishes cleanly within one simulation
tick of its checked-in time. Divergence is reported, not silently accepted;
a recording still running at its declared end freezes for inspection.
Leave the helm alone while watching a reference run.

`verify` intentionally replaces the current attempt with each recording. It
finishes on the last result, at frozen practice speed. `normal()` returns to a
fresh ranked attempt. Reading a timeline or report alone does not replace a run.
There are **only three published author recordings**. A `null` author time is
honest missing coverage, not an impossible stage. Gold/silver/bronze targets are
level-design goals; their existence is not proof of a successful control run.

The JSON files named by `runs()` are the source of truth. After editing them,
run `npm run replays:sync`, then `npm test`, `npm run verify:runs` and the browser
suite. This regenerates the committed `src/verification.js` used by source play
and the single-file build. No runtime fetch is needed.

## Keep the logbook honest

Reading help, stage lists, state, timelines, times or reports does not mark an
attempt as practice. Using any assist does. Accelerated retries stay unranked;
assisted circuits cannot become ranked merely by returning to 1×. The visible
clock displays the speed and **UNRANKED** status. Assisted completions never
replace PBs, ghosts, splits or circuit records. A console-launched practice
attempt also does not inflate the ranked departure counter.

This is a convenience guard against accidental record pollution, not security.
A local browser game and its storage are inspectable and editable. Cheats are
welcome aboard; keep a separate logbook export when experimenting with imports.
