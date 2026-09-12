# Release verification — 3.1.1

Prepared against `frostburn/dead-slow` main at
`cdb5998c95145fb893c903adc0fe532c2a793f23`. Physics, level layouts and saved-record
formats are unchanged by this update.

| Check | Local result |
| --- | --- |
| JavaScript parse / deterministic offline bundle | 27 files, passed |
| Node tests | 185 passed, 0 failed |
| Chromium browser checks | 173 passed, 0 page errors |
| Published control-only completions | 12 clean; all reproduced in Node and the production browser console |
| Animated playback | First Crossing and Granite Needle reproduce their times at 32×; freeze/resume checked |
| Replay input validation | Unique known levels, finite ordered timestamps, valid helm/line fields, no state-mutation fields |
| Replay availability | Every checked-in control fixture is included in the offline bundle |
| Leaderboards | Assisted/replayed results never overwrite PBs, ghosts or circuit records |
| Mixed audio | Full ahead/astern + horn + order bell + impact cue, at 44.1/48/96 kHz |
| Mixed output peak | At most 0.1197 full scale in these renders; regression ceiling 0.15 |
| Digital clipping / non-finite samples | None in any mixed render |
| Horn-only body RMS / peak | Approximately 0.02372 / 0.07189 at 44.1 kHz |
| Horn behavior | Four beating reeds retained; no stacked blasts; safe attack/release and mute |

The twelve measured author times are listed in [CONSOLE.md](CONSOLE.md). Nine
new recordings cover Dead Slow, The Long Way Round, Catch the Green,
The Lockkeeper, Stern First, Water Under the Keel, Between Two Greens,
The Granite Needle and Island Exchange. The three established recordings also
still verify. Every published route uses fixed helm/line inputs through the
actual game; no repositioning, objective shortcuts or relaxed physics. These
are successful reference runs, not claimed optimal speedruns. The other
twenty-four stages do not yet have published full control-only completions.

Audio retains the reed waveshaper deliberately: its rough chord is intentional,
but its final envelope is halved (approximately −6 dB) so it sits lower against
the engine. Offline signal tests are not calibrated speaker/headphone tests and
cannot exclude distortion elsewhere in a user's audio chain.

These are local results, separate from GitHub Actions. Browser tests use inline
mounting with a storage shim; HTTP serving is separately tested by the Node
suite. Touch checks use Chromium emulation, not physical devices. Existing
objective-isolation tests do reposition hulls; published trajectory replays do
not. See [TESTING.md](TESTING.md) for methods, reproduction and limitations.

Re-run `npm run check`, `npm run build`, `npm test`, `npm run verify:runs`, and
`python tests/browser_smoke.py --inline --report reports/browser.json` after
changing source, recorded inputs or stage layouts. After adding/editing fixture
JSON, run `npm run replays:sync` first. Reports and diagnostic captures belong in
the gitignored `reports/` directory rather than source history.
