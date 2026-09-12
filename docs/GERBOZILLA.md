# Gerbozilla’s Rampage — six field courses

The courses are standalone; this is not yet a twelve-course campaign. They are
excluded from every circuit, so the 48-stage Grand Tour and its records are
unchanged. Gerbozilla and the exercise ball are 48 metres across.

## Controls and completion

Hold WASD or arrows to push in map directions. Diagonal input is normalized.
Release to coast, counter-push to brake. Space or F gives three seconds of
protection and six more seconds of recharge. Touch supports simultaneous pushes
and shielding. Shielded rams still lose momentum.

Visit the numbered controls in order and flatten every evacuated city core.
Some controls activate only after a named district has fallen; the map labels
these and the mission status points at the next available assignment. Later
city/marker numbers follow that actual order. Small buildings are scenery;
the striped core is the damageable structure.

Settle the whole ball in the recovery circle below 0.8 m/s, paws off, for two
seconds. A clean run means zero shell damage, not zero destruction. Recovery
cannot finish while an off-map retaliation salvo remains pending.

## Different routes

**1. A Small Problem in Seedhaven.** Ridge, crooked lake and a small redirection: the unchanged introduction.

**2. Banks for the Memories.** Closed mountain-ring citadels. Carry speed both into and out of the bowls.

**3. No Grip, No Problem.** Three water-moat islands. Each demolition launches three long-range strikes.

**4. It All Goes Downhill.** A summit descent into a flooded caldera with one heavily armored core.

**5. The Reservoir Hairpin.** Breach Pump House, use the northern saddle to reverse approach, then cross the reservoir.

**6. Fort Pillow.** A double moat with a steep ring between them, followed by a northern satellite fort.

The second course demands entry and exit momentum. Course 3 deliberately
provides dry turning ground after Oatbridge: turning inside its wet moat bleeds
speed exactly when the response battery is lining up a strike. The fourth
course trades starting elevation for crossing energy. The fifth reverses the
main direction of approach halfway through. The sixth nests the defenses:
outer water, steep terrain, inner water, command core, then an extraction leg.

## Terrain model

Ordinary hills are rotated Gaussian summits and offset shoulders. Fortification
rims add an irregular annular Gaussian height profile. Both use analytical
slopes in `terrain()`; the cached contour renderer samples that same field.
Rims are not binary speed gates, walls with special collision shortcuts or
scripted launchers. Counter-pushing, water drag and gradient forces all remain
active. A focused test starts at Cushion Wall's foot: maximum push from rest
cannot reach the crest, while a 30 m/s run-up crosses the bowl.

Irregular lake shores use low-order radial waves. Optional `inner` scales the
same boundary to form an island. Renderer fill and clipping use both paths with
even-odd fill; traction checks exclude the exact same inner area. No cosmetic
road is drawn over a moat, so a white line cannot masquerade as a bridge.

Acceleration remains `grip * playerDrive - 7.007 * terrainGradient - drag * velocity`.
No traction means no player drive, not no gravity. A stationary wet ball on a
slope can move downhill; a flat-water push only spins the shell. The closed
moats cannot be driven across from rest in deep water.

## Long-range response

`retaliation` is optional level data. Each destroyed city queues three strikes
at +10, +18 and +26 seconds. A mark appears 7.5 seconds before each impact and
locks once. It never follows later steering. There is no instantaneous invisible
hitscan: players see the affected circle and countdown for the full warning.

Impact checks the ball's circular footprint against the blast radius once.
A shield blocks it; distance evades it. The finite response continues after
local guns stop. Overlapping salvos are ordered by impact time; retry resets
both queue and statistics. Read the impending strike in the work panel and
mission strip. `salvos`, `strikeHits`, `strikeDodges` and `strikeBlocks` appear
in detached console state/results alongside the existing damage counters.

## Sound and animation

Four rotation-phase boundaries per revolution trigger separate alternating
land creaks. Broad serial high/low-pass filters and short stick/slip pitch bends
replace the previous glottal waveform and vowel formants. There is no sustained
wheel tone. Faster roll gives more strokes and slightly more level. The water
triangle wave, pitch contour, two band-pass colors, envelope, and cadence are
unchanged. Accelerated playback drops missed strokes rather than stacking them.

Hind paws animate contact/reach using the existing effort-driven gait. Hips and
feet are painted before the body, so the belly naturally covers the hips and
the toes peek around it. Coasting paws rest. Wheelspin still paddles in water.

## Reference recordings

| Console ID | Clean time (seconds) |
| --- | ---: |
| `gerbo-first-outing` | 100.258333 |
| `gerbo-banking` | 95.008333 |
| `gerbo-lake-skipping` | 172.758333 |
| `gerbo-downhill` | 71.758333 |
| `gerbo-hairpin` | 189.258333 |
| `gerbo-fort-pillow` | 169.508333 |

Use `DeadSlow.watch(id, 8)` or `DeadSlow.timeline(id)`. The offline
`tools/record-rampage.cjs` controller composes bounded directional and shield
inputs through the live state machine. These are generated input recordings,
not human keyboard captures; no poses, velocities, health, terrain, or objectives
are assigned to obtain their results. The helper is outside the browser bundle,
not an autopilot in ranked play. All replays remain unranked.

Seedhaven's recording is unchanged. Five updated/new recordings are shipped;
the third course evades nine strikes, and the finale evades five and shields
one. Times are reference completions, not optimality claims.

## Records and targeted checks

Schema 8 archives only `gerbo-banking` and `gerbo-lake-skipping` from schema 7.
Their earlier ghosts and splits remain exportable, with archived times in the
field log. Seedhaven, old archives, all other missions and circuits are retained.
The schema-specific Codex migration remains intact.

```sh
npm run build
node --test tests/rampage.test.cjs tests/rampage-audio.test.cjs tests/rampage-fortresses.test.cjs
python tests/browser_rampage.py --screenshots reports/gerbozilla
```

Coverage includes the six input replays, finite-difference slope checks, closed
moats and inner shores, run-up versus standing push, retaliation scheduling,
locking, shields/dodges, objective ordering, non-phonetic dry filters and
unchanged wet parameters, audio waveform headroom/gaps, paw layer order, record
migration, relevant keyboard/touch controls, and transitions out of tow duty.
The unrelated sea/space runs and broad suites are deliberately not part of
this focused iteration.
