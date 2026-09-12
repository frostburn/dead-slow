# Changelog

## 3.1.1 — A Quieter Horn, More Watchkeeping

- Lower the horn's final envelope by approximately 6 dB while preserving the
  beating reed chord, saturation, attack/release and engine volume.
- Test the actual full-power engine, horn, engine-order bell and impact cue
  together at 44.1, 48 and 96 kHz, with no stacked horn voices or clipped samples.
- Add nine clean, fixed-control recordings: basic docking, the dogleg,
  timed boom, lock, stern-first parking, tidal crossing, double booms,
  the heavy barge and the island ferry exchange. Twelve runs are now watchable.
- Include harbor names/worlds in the console run list. Discover additional
  fixture files automatically and validate their input-only format in tests.
- Keep all playback unranked and all existing physics, levels and records intact.

## 3.1.0 — Open Water

- Remove all archipelago perimeter coasts; open the west side of every Coast
  and Northwatch harbor, sharing coast geometry between rendering and physics.
- End the attempt when any part of the player or a casualty leaves the chart,
  with a local edge warning, explicit failure reason, stopped clock and retry.
- Start the ten later island assignments with real positioning legs: tugs away
  from their casualties and empty ferries in the fairway. Keep both tutorials.
- Replace the horn's two sine tones with four beating, harmonic-rich reeds,
  saturation and filters; prevent stacked blasts and fade safely on mute.
- Welcome console explorers to `DeadSlow.help()`: 0–32× fixed-step time,
  stepping, level jumps, helm/warp/repair tools and detached state inspection.
- Publish the three real input recordings for animated or immediate console
  verification; distinguish measured author times from authored medal targets.
- Keep assists and playback unranked; do not pollute PBs, ghosts or circuit times.
- Migrate to logbook schema 4, archiving changed departures and island circuits
  while retaining their old records, ghosts and splits in exports.
- Add navigation/console/audio regressions and the console guide.

## 3.0.0 — The Archipelago

- Twelve Nordic-inspired island-service stages; thirty-six stages across three worlds.
- Double-ended vehicle ferry and working tug, with distinct handling and silhouettes.
- Automatic ramp cycles, visible vehicles, partial transfers and mass-changing manifests.
- Independent disabled vessels, unilateral towlines, winches, overload and obstacle chafe.
- Recovery after a parted line; rescue berths, shore crews and separate final mooring.
- Towable-hull collision, grounding and gate safety; attached-tow coast prediction.
- Job splits, work counters, archipelago circuit records and a 36-stage Grand Tour.
- Record schema 3 imports earlier logbooks and archives incompatible circuit lengths.
- Player-facing stage descriptions describe the harbor, not development history.
- Repository documentation, zero-dependency server/build, control-only fixtures,
  Node/browser tests, CI and an opt-in Pages deployment workflow.
