# Gerbozilla’s Rampage — three field courses

World 5 is a standalone, topographic hamster-ball playground. It is not a
finished twelve-course campaign: the 48-stage Grand Tour and its records are
unchanged. The giant pet is 48 metres across including its exercise ball.

## Controls and course rules

Hold WASD or the arrows to apply a push in map directions. Diagonal pushes have
the same total strength. Releasing the controls leaves momentum; counter-push to
brake. Space or F starts a three-second shield, with six further seconds before
another activation. Mobile supports simultaneous directional holds and shielding.

Visit the numbered magenta controls in order, flatten all district cores, and
settle the entire ball inside the double-ring recovery meadow below 0.8 m/s for
two seconds with paws off. A clean run means no shell damage. Districts lose
health according to impact speed. Ramming deals mutual damage; shields prevent
only the shell's share. Surviving cores deflect the ball, and destruction costs
momentum. Defensive guns show their aim before firing real projectiles. Towns
are evacuated; small surrounding buildings are scenery, not extra targets.

## The courses

**A Small Problem in Seedhaven.** The opening run-up clears a ridge and Blue
Lake. Redirect from Seedworks to North Ward, then brake into the meadow.

**Banks for the Memories.** Descend toward Cushion Ridge and use its sloping
flank to bend the ball south into Sunflower Valley. The hill is a real gravity
field, not a scripted deflector. Clear the two controls and the Sunflower and
Hayloft cores. The southern bank also turns overshoots back toward the valley.

**No Grip, No Problem.** Cross Eeh Lake, rebuild speed on the dry isthmus, then
coast over Ooh Lake. Three controls lead to Reedworks, Oatbridge and Pipsqueak
Point. Time three separate shields, then brake before the southern meadow.

## Terrain, sound and paws

The height field is a sum of rotated Gaussian hills and offset shoulder lobes;
its analytical gradient accelerates the ball. The contour renderer samples
that exact field once per map. Low-frequency radial waves make rounded lake
bays and headlands. Both visible shores and footprint probes use the same
parametric boundary; trees and roads are decorative.

Acceleration is `grip * playerDrive - 7.007 * terrainGradient - drag * velocity`.
Water reduces paw traction to zero, but **never removes gravity**. Existing
momentum faces water resistance. A wet, stationary ball on a slope can still
slide downhill; on flat deep water, pushing only spins the shell.

The shell's rotation crosses four sound-stroke boundaries per revolution.
Each crossing starts a finite, alternately voiced eeh/ooh sound with an attack,
release and a real silent gap. Volume increases gently with rolling speed.
Wet wheelspin selects short, quieter, high-pitched cartoon chirps. Accelerated
play drops missed strokes rather than accumulating audio or playing a burst.
There is no continuously sounding wheel oscillator. Stop, mute and disposal
silence pending voices; wet controls still animate the futile spinning shell.

The hind-paw gait uses a separate effort-driven phase derived from the shell's
travel and wet slip. Left and right paws alternate contact and reach. They rest
while coasting; they paddle in water. The ball's ribs still use actual roll.

## Records and authoring

All three live-game recordings are clean and input-only:

| Console ID | Time (seconds) | Shields | Blocked hits |
| --- | ---: | ---: | ---: |
| `gerbo-first-outing` | 100.258333 | 2 | 4 |
| `gerbo-banking` | 101.258333 | 2 | 4 |
| `gerbo-lake-skipping` | 123.258333 | 3 | 6 |

Use `DeadSlow.watch(id, 8)` or `DeadSlow.timeline(id)`. No poses, velocities or
objectives are assigned in the published recordings. They are reference
completions, not optimal routes. The offline `tools/record-rampage.cjs` helper
composes these inputs through the actual state machine. It is not part of the
browser bundle and does not add an autopilot to ranked play.

Schema 7 archives only the first course's obsolete schema-6 terrain record,
ghost and splits. The field log displays those archived times. Other missions,
circuits and Codex's schema-specific older migrations are preserved.

## Focused verification

```sh
npm run build
node --test tests/rampage.test.cjs tests/rampage-audio.test.cjs
python tests/browser_rampage.py --screenshots reports/gerbozilla
```

The tests include wet gravity at partial/full immersion, analytical gradients,
shoreline consistency, shield and collision rules, all three recorded runs,
state migration, per-stroke audio scheduling, actual offline waveform gaps and
levels, visible counters after tow duty, and keyboard/touch mode changes.
Unrelated sea/space recordings and the full browser suite need not be run while
iterating on these field courses. Rival pets and fire breath remain future work.
