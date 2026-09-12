# The Black Meridian — flight and mission guide

World 4 has twelve circuit sectors and a thirteenth, optional Century Ship.
All are available immediately. There are 49 selectable stages in the game;
the Grand Tour includes 48 and the Meridian circuit includes twelve.

## Flying something that will not stop by itself

W/S select persistent fore/aft engine notches. Full reverse thrust is as strong
as full forward thrust; changing direction takes a brief actuator ramp, not an
instant velocity reversal. Space cuts the main engine. A/D fire torque jets:
release them and spin persists; counterfire to stop rotation. Q/E translate
sideways without applying torque. Held controls combine on keyboard and touch.

There is no water drag, rotational damping, speed cap, automatic stabilization,
gravitational orbit or relativistic correction. These are two-dimensional local
navigation exercises. Main and lateral forces divide by spacecraft mass;
rotational response is also mass-scaled. The propellant gauge is a scalar
reference-mass impulse reserve (displayed as delta-v), not a calibrated fuel
mass or rocket-equation simulation. Mass is held constant during burns. All
jets and rescue beams consume that reserve. An empty tank cannot produce thrust.

The white arrow shows the bow; the blue vector shows actual velocity. The
coast guide is the position twelve seconds ahead with no further thrust. The
HUD separates signed bow-relative speed, sideways drift, spin, range and
**relative speed against the active target**. Space uses m/s rather than knots.

To dock, fit the entire hull inside a capture cradle, face its arrow, match its
velocity, reduce relative spin below 0.012 rad/s, cut main output below 2% and
release every held jet/beam control. Most cradles allow 0.24 m/s relative drift.
Final capture takes two seconds. A moving cradle does not stop for you.
Contact with any craft counts against clean results. Any free hull crossing a
sector boundary fails immediately; there is no perimeter or invisible bounce.
Onboard audio represents instrument/engine feedback, not sound crossing vacuum.

## Moving cradles and compulsory fuel

Hilda's landing platform follows the asteroid's analytic motion. The rock's
silhouette is solid; its cantilevered survey cradle is the landing zone. The
same ephemeris gives rendering, collision position and cradle velocity.

In **The Last Fill Before Dark**, Faraday Port starts ahead and moves away at
4.2 m/s. The mass-one courier starts at rest with only 4 reference impulse units.
Its velocity gain cannot exceed 4 m/s, regardless of burn timing. Distance
alone would not require fuel in a drag-free world: the *receding target* does.
The accessible tanker moves at 1.1 m/s. Hold relative rest in its amber cradle
for six uninterrupted seconds to refill to 85 units, then intercept Faraday.
An interrupted hold resets progress and never grants partial free fuel.

## Some Assembly Required

Fly Kestrel into Wayfarer's upper cradle, then Wren into the lower cradle.
Each capture requires two seconds of relative rest with all jets cut. Control
transfers to the other actual spacecraft; no fuel or impulse is manufactured
by the handover. Captured tender mass joins the mothership. Terminal clamps
dissipate the small permitted relative motion.

After both captures, fly the 4.7-mass assembly to its final port. Its 102-metre
collision beam conservatively encloses the tenders and support truss, so the
larger cradle matters. Docked craft remain visible and count in the envelope.
Control transfers are not counted as distance travelled.

## The cannon has an opinion

Reach the firing rectangle, rotate toward the hollow lead diamond, stop
translation/spin and cut all jets. A steady, aligned three-second firing
solution causes an automatic shot. Leaving the box, firing a jet or drifting
out of aim resets the charge. There is no manual instant-hit button.

The projectile travels at 115 m/s relative to the firing ship and inherits its
velocity. A swept trajectory must actually intersect the target hull; misses
can be retried. The opposite recoil impulse changes the warship's velocity.
Recover from it and return home only after a confirmed hit. The moving enemy
corvette requires leading its ephemeris, not aiming at its present position.
The lead marker includes projectile travel time and inherited ship velocity.

## Rescue beams

F locks/releases a friendly craft within 170 metres and clear rock line of
sight. J attracts, K repels. The two bodies receive equal and opposite momentum
changes, divided by their individual masses. A beam cannot brake the pair's
centre of mass for free. It cannot push through an asteroid, work beyond range,
or create impulse after fuel exhaustion. Release leaves both velocities intact.

The friendly must settle in its own cradle after the beam has actually been
used. The capture crew secures it and releases the beam. You must still dock
the tug. A secured friendly remains a collision obstacle. Perihelion Dispatch
requires fuel before accepting the beam lock, then combines rescue and flares.

## Light is geometry

Light travels horizontally from the left. Convex asteroid silhouettes cast
shadows; exposed hull vertices and the centre determine illuminated fraction.
Partial cover is partial protection, not an all-or-nothing centre-point test.

During a flare, a fully exposed hull heats at 34 percentage points per second;
full cover cools at 22 points per second. Reaching 100% heat is fatal. Quiet
intervals also cool. Schedule lateral transfers for the quiet period and brake
before drifting out of cover. The dispatch tender is radiation-hardened; the
tug is not. Retry resets all phases deterministically.

**Borrowed Sunlight** reverses the incentive. Every jet draws directly from
solar cells, with no battery; full shadow gives zero thrust and zero propellant
consumption. Motion still persists. In partial light, force and consumption
scale together. The final observatory is in shadow: brake while sunlit and
coast in gently. **Cold Transit** instead inhibits all jets inside a scanner
field; its moving maintenance drones demand a stable, correctly timed coast.

## Yesterday Has Right of Way

The first flight records actual trajectory samples at 30 Hz, with explicit
initial and endpoint poses. Dock at the chronogate and it inserts you into the
return lane with your arrival velocity, orientation and fuel. The score clock
never rewinds. Your recorded first flight now plays as a solid violet craft.
It follows your own path, not a supplied generic obstacle animation. Its final
pose remains occupied after playback ends. A hull overlap causes a paradox and
ends the run; the ordinary PB ghost remains harmless.

The first-leg recording window is fifteen simulated minutes. Retry clears the
history. The gate's intentional in-game relocation is not counted as travel
and is not a test or console positioning shortcut.

## The Century Ship: why thirty minutes cannot suffice

The nearest-system capture centre is 110,592 metres from the departure centre
on this **compressed** interstellar chart. Maximum acceleration magnitude is
0.12 m/s². This craft has no lateral thrusters, beam, cannon, nearby collision
body or other source of momentum. Rotating can redirect the main burn, not
increase its magnitude. The final cradle permits at most 0.24 m/s relative
speed and is stationary.

Give an hypothetical optimal pilot even more freedom: instant engine changes,
unlimited propellant, continuous maximum acceleration in any direction, and a
point-sized craft that may finish anywhere inside the cradle. The closest such
capture point is still **110,550 metres** ahead. For a flight lasting T with
initial x-velocity zero and final x-velocity at most v, its velocity envelope is
bounded by `min(a*t, v + a*(T-t))`. Integrating this best-case envelope gives

```text
maximum distance = a*T²/4 + v*T/2 - v²/(4*a)
with a = 0.12, T = 1800 seconds, v = 0.24:
maximum distance = 97,415.88 metres < 110,550 metres.
```

Even that over-generous ship cannot arrive in thirty minutes. The actual hull,
alignment, finite engine response and two-second capture hold cannot improve
its bound. There is no `time >= 1800` completion gate. The checked-in clean
flight uses just three commands and completes in **1922.333333 seconds**:

```text
   0.000000 s  Full forward
 959.833333 s  Full reverse
1920.000000 s  Neutral
```

`DeadSlow.watch("century-ship", 32)` is roughly a one-minute real-time viewing
when the browser keeps up. Acceleration remains practice and never writes a
ranked voyage. At normal speed the in-game clock and wall time track each other
except for pauses or overloaded rendering. Z includes a full-sector overview;
the regular camera tracks locally with an offscreen bearing and route strip.

## Verified flight library

These are clean reference completions, not claimed optimal times. Every event
is a normal throttle/RCS/beam input applied through the live game at 120 Hz.
No fixture sets coordinates, edits fuel, bypasses objectives or relaxes physics.

| ID for `DeadSlow.watch(id, speed)` | Mission | Measured clean seconds |
| --- | --- | ---: |
| `vacuum` | Nothing to Push Against | 130.608333 |
| `wandering-stone` | A Stone with a Schedule | 128.858333 |
| `last-fill` | The Last Fill Before Dark | 358.358333 |
| `family-reunion` | Some Assembly Required | 367.466667 |
| `newtons-broadside` | Newton’s Broadside | 233.833333 |
| `moving-argument` | A Moving Argument | 242.833333 |
| `equal-and-opposite` | Equal and Opposite | 228.358333 |
| `umbra` | The Safe Side of a Stone | 193.858333 |
| `borrowed-sun` | Borrowed Sunlight | 410.783333 |
| `yesterday` | Yesterday Has Right of Way | 286.608333 |
| `cold-transit` | Cold Transit | 163.108333 |
| `perihelion-dispatch` | Perihelion Dispatch | 393.258333 |
| `century-ship` | The Century Ship (bonus) | 1922.333333 |

`DeadSlow.runs()` lists these and the twelve established marine recordings.
`DeadSlow.timeline(id)` exposes their inputs; `DeadSlow.verify("all")` measures
all 25. Reports flag divergence and never silently label an incomplete attempt
verified. Playback remains unranked and cannot replace PBs, ghosts or splits.
