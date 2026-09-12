# Gerbozilla’s Rampage — opening preview

This release introduces the World 5 theme and **one** assignment, `gerbo-first-outing`.
It is not a twelve-stage campaign. It is selectable as World 5 / course 1 and has
normal local stage records and a PB ghost, but is excluded from every marathon.

## The course

A run-up carries the 48-metre ball over the west ridge. Visit control 1, coast
across Blue Lake, and visit control 2. Smash Seedworks, redirect toward North
Ward, then counter-push to stop in the recovery meadow. Both districts must be
flattened, both controls visited in order, and the entire ball inside the meadow
below 0.8 m/s with all pushes released for two seconds.

The striped city cores are the solid targets. Nearby houses are decorative.
Enemy pets and fire-breathing systems are deliberately left for later work.

## Controls and physics

WASD/arrows apply cardinal map-direction pushes, not heading commands. Touch
buttons permit simultaneous directions. Diagonal input is normalized so it does
not provide a stronger motor. Releasing a key leaves momentum; counter-pushing
is required for timely braking. There is no instant brake or velocity cap.

A smooth sum of Gaussian hills defines elevation. The brown 5 m contours and the
physics sample this same field. Downhill acceleration uses `-(5/7) g grad(h)`;
linear rolling resistance provides a slow loss of speed. This is a tuned planar
rolling approximation, not a full rigid sphere/airborne simulation. There is no
ballistic jump, monster AI or building-by-building structural simulation.

Five footprint probes determine lake immersion. Fully wet ground has no useful
player traction: running spins the shell and makes wheel noise without applying
translational force. Existing momentum still carries the ball through water
resistance. A failed run-up can leave the ball stranded; retry is intentionally
available rather than an automatic rescue or free water steering.

Ramming damage scales with closing speed squared. The district and shell both
take damage; a destroyed core removes some forward momentum. Defensive guns
have a 1.2 s marked aiming interval and fire finite-speed rounds. Destroying a
district stops new shots; previously fired rounds continue.

Space / F activates a 3 s shield, then requires a further 6 s recharge. Protection
blocks damage, not collision dynamics. Clean means **zero shell damage**; the
separate impact/district/shield counters still describe the destruction.

## Presentation and audio

The renderer caches the terrain/contour map once per level and draws the ball,
active city cores, rounds and shield on top. Its transparent shell ribs rotate
by travelled distance divided by radius, plus slipping rotation while running
in water. The wheel audio uses that same angular phase for its alternating
formants; it is not a free-running sound loop. Idle, pause, mute and leaving the
world silence it. Existing marine and spacecraft sound modes are unchanged.

## Integration and reference

- `src/rampage.js`: level data and DOM-free deterministic mechanics.
- `src/rampage-view.js`: cached chart renderer, ball UI and dialogs.
- `src/rampage-audio.js`: bounded wheel-bearing audio graph.
- `standalone: true` keeps the course outside existing circuits, without a save
  migration or reset. Codex’s schema-specific World 4 migration remains intact.
- Shared game dispatch, input, audio and rendering route to these modules only
  for a rampage level. All earlier level configurations are unchanged.

`DeadSlow.watch("gerbo-first-outing", 8)` replays the 89.508333-second clean
reference. It uses 212 recorded events containing fractional directional pushes
(the existing console supports [-1, 1]) and two timed shield activations. The
published fixture has no position/velocity assignments, automatic objectives or
physics overrides. Keyboard players obtain fractional average effort by tapping
or alternating directions; this reference is not presented as a keyboard-recorded
human speedrun. Paused/accelerated playback remains unranked.

## Focused checks

```sh
npm run build
node --test tests/rampage.test.cjs
python tests/browser_rampage.py --screenshots screenshots/rampage
```

The mechanics checks cover the single-course catalog, unchanged Grand Tour,
normalized pushes, counter-pushing, slope derivatives, lake coasting/wheelspin,
shield duration/recharge, mutual damage, rounds, boundaries, objective guards,
record preservation and the new reference. Browser checks cover the control pad,
keyboard, multitouch, UI, viewport sizes, production playback, muted/active audio
and transitions back to the existing sound/control worlds. The regular CI also
runs this focused browser entrypoint. Unrelated long navigation recordings were
not rerun locally for this change.
