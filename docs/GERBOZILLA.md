# Gerbozilla’s field guide

World 5 has **nine standalone courses**, outside the existing 48-stage Grand
Tour. Every course is immediately selectable. There are no placeholder levels.
The ball is 48 metres across; momentum, rolling resistance and slope—not an
instant direction change—decide where it goes.

## Controls and map

Hold WASD or arrows to push in map directions. Diagonal input is normalized.
Counter-push to brake. Space or F activates a three-second shield with a six-second
recharge after it expires. The touch pad supports simultaneous directions and
shield/fire actions. R retries, Z changes zoom, M mutes.

Brown contours use the actual elevation field. Green forest footprints add
rolling resistance in proportion to their density; take clearings for faster
runs. White ground is open. Blue shores remove paw traction, not gravity or
momentum. Closed moat rings have real dry islands. Black irregular boulders
are indestructible: their faces and corners stop the entire circular ball,
even while shielded. Gray low walls block rolling but admit fire over their tops.
Magenta numbered controls must be visited in order, with a double-ring finish.

Forest and water use the same rounded outlines for queries and rendering.
Rock collision uses the drawn polygon. Retained slopes still apply downhill
acceleration without scaling it by water grip. New features are optional level
data; the five retained courses do not acquire new forest or boulder collisions.

## Course progression

Seedhaven teaches the ridge, lake and city ram. Banking adds mountain bowls;
Lake Skipping introduces complete moats and retaliation. Downhill exchanges
summit height for the speed needed by a heavy city core. **The Black Boulder
Wood** replaces the Reservoir Hairpin with five ordered controls through
woodland and boulder chicanes: no guns, cities or destruction requirement.
Fort Pillow retains the double moat and mountain ring.

**A Very Territorial Guinea Pig** introduces Cavyclasm. A warning line commits
the pet to its charge direction; it cannot perfectly home after that warning.
A finite charge is followed by a rest. The massive pet responds to terrain,
water and rocks, and collisions exchange equal/opposite momentum. Player and
pet both take impact damage. The shield changes only player damage, not the
impulse or the pet's damage. A defeated pet rests harmlessly and no longer attacks.

**Pepperbreath at Marshmallow Keep** begins with a pepper pickup. Hold H or the
BREATH button to fire toward the last push direction; direction and velocity
can differ. The cone has limited range and angular spread. It passes over low
city walls but is blocked by giant boulders. Its three-second reserve recharges
at 0.6 seconds per simulated second only after release. More than half immersion
suppresses firing. Armored cores only take fire damage; a shielded ram is not a
shortcut. The flame can outrange the keep's guns, rewarding careful positioning.

**Nobody Puts Whiskerdoom in a Cage** has two external lock pylons and Sir
Flops-a-Lot, an enlarged rabbit sentry. Breaking both locks opens the gate.
Approach Lady Whiskerdoom to greet her, then lead out of the cage. She waits for
you to begin moving away, follows sampled breadcrumbs from your travelled route,
and brakes with her own inertia. She is not attached by an invisible towline
and never teleports to you. Avoid close rock corners and abrupt reversals; your
shield does not protect her. Clear the guardian and bring both balls into the
recovery meadow. Losing her shell or leading her off-map fails the rescue.
A clean run records no damage to either hamster.

## Retaliation and recovery

Course 3 and Fort Pillow keep their off-map strikes. Each destroyed city queues
three impacts at +10, +18 and +26 seconds. A red target mark locks 7.5 seconds
before impact, then remains fixed. Evade or shield; killing local guns does not
cancel it. Recovery waits for all queued strikes. Finishing any course requires
all controls and special objectives, fitting the ball in the meadow and holding
nearly still for two seconds.

## Sound

Four phase boundaries per shell revolution trigger alternating rubber creaks,
with actual gaps. A quiet second, inharmonic oscillator now colors the dry
bearing sound without adding vocal formants or a continuous whine. The accepted
water oscillator, filters, pitch contour and envelope are unchanged. Muting,
stopping and switching modes clear active voices; accelerated play drops skipped
strokes instead of stacking them. Fire adds a filtered noise hiss. All synthesis
is local and dependency-free. The little hind paws still animate behind the belly.

## Input-only references

| ID | Course | Clean time (seconds) |
| --- | --- | ---: |
| `gerbo-first-outing` | Seedhaven | 100.258333 |
| `gerbo-banking` | Banks for the Memories | 95.008333 |
| `gerbo-lake-skipping` | No Grip, No Problem | 172.758333 |
| `gerbo-downhill` | It All Goes Downhill | 71.758333 |
| `gerbo-forest-slalom` | The Black Boulder Wood | 187.508333 |
| `gerbo-fort-pillow` | Fort Pillow | 169.508333 |
| `gerbo-cavy-clash` | A Very Territorial Guinea Pig | 151.258333 |
| `gerbo-pepperbreath` | Pepperbreath at Marshmallow Keep | 341.758333 |
| `gerbo-whiskerdoom` | Nobody Puts Whiskerdoom in a Cage | 456.491667 |

Run `DeadSlow.watch(id, 8)` one recording at a time. `timeline(id)` exposes its
inputs; `report()` gives the actual result. They are generated reference routes,
not human keyboard captures or optimal-speedrun claims. `tools/record-rampage.cjs`
and `tools/record-wilds.cjs` compose ordinary directional, shield and fire inputs
through the real state machine; neither changes poses, health or objectives.
These authoring helpers are not shipped as a ranked-play autopilot.

The four replacement/new runs were reverified in Node and Chromium in this pass.
The other five recordings are retained unchanged and were not rerun locally.
All playback remains unranked and cannot overwrite normal records.

## Records and focused checks

Schema 9 archives the retired `gerbo-hairpin` record from schema 8, including its
full ghost and split data. The replacement forest course starts fresh and its
field log displays the Hairpin archive. No other course or circuit is reset;
Codex's earlier schema-specific migrations and all existing archives remain.

```sh
npm run build
node --test tests/rampage-wilds.test.cjs tests/rampage-audio.test.cjs tests/rampage-fortresses.test.cjs
python tests/browser_wilds.py
```

The focused browser check writes screenshots and a JSON report under ignored
`screenshots/wilds/` and `reports/`. It uses inline mounting with a storage shim
and system Chromium when available, otherwise Playwright's installed Chromium.
`tests/fixtures/gerbo-wheel-fortresses.js` is a fixed, test-only audio reference,
not shipped game code; it makes the water comparison independent of Git history.
The broader marine/space tests are intentionally not part of this iteration.
