# best-flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/bisabos/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/bisabos/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Island Hopper — Sky Courier: a 2D flight game over an archipelago. Fly the
courier plane through six glowing rings a leg, then land gently on the runway
to refuel and take the next leg. Three legs make a sortie.

- **Flying that rewards discipline:** throttle sets the speed, the wing only
  lifts above stall speed, and fuel burns with the throttle — too slow and
  the nose drops, too fast and the turns get wide.
- **Missions with different goals:** ring runs, runway landings, storm
  clouds that shove the plane, and a clock on every leg.
- **Instruments lit:** altitude, airspeed and heading on the HUD, an
  artificial horizon, altimeter and airspeed dials, fuel and damage bars,
  and a compass strip — all drawn live from the flight model.
- **Original art and sound:** every island, palm, cloud and the plane
  itself are drawn in canvas paths, and the engine, wind, ring chime and
  landing thud are made with WebAudio. No image or audio files, no network.

## Run it

Node 22+, no build step, no network:

```sh
node serve.ts
```

Then open http://localhost:8080 and press Space to fly. Arrow keys or
WASD fly the plane (Up/Down pitch, Left/Right throttle), the mouse steers,
P pauses, M mutes.

## Entry

Built for the make.fun `best-flight-game-20261126-0057` bounty. Screenshots
in `screenshots/` are real renders of the game in a browser
(`?shot=start|play|end&seed=1`).

License: MIT.

---

<sub>Entered on [make.fun](https://make.fun/?ref=xj3aqnc6&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
