# cooking-game-01

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/kontenlaris-studio/cooking-game-01/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/kontenlaris-studio/cooking-game-01/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Sizzle Street** is a 120-second cooking rush for the desktop browser, written in vanilla JavaScript and Canvas 2D with no libraries and no network — every picture is drawn in code and every sound is synthesized with WebAudio.

Orders slide onto the board as ingredient stacks: a Classic Burger, a Deluxe Burger, a Garden Salad, a Pancake Stack, a Club Sandwich. Click the ingredient bins to stack the plate layer by layer, exactly as the ticket shows. Patties, eggs and pancakes must cook first — click a bin to put one on the stove, watch its ring, and click the pan in the golden window to plate it cooked; leave it too long and it burns. Serve by clicking the matching ticket (or the SERVE button): fast serves earn tips, and chained serves build a combo multiplier up to ×4. A wrong dish or an expired ticket is a strike — three strikes end the day early. When the 120 seconds run out you get your coins, dishes served, best combo and a 1–3 star rating.

Controls: mouse for everything; number keys 1–0 pick bins, Space serves a matching dish, Backspace clears the plate, P pauses, M mutes. The simulation is deterministic — a fixed timestep and a seeded random source deal the same day for the same seed — and `?shot=cover|kitchen|rush|results&seed=n` renders frozen scenes of the game, which is how the screenshots in `screenshots/` were taken.

## Run it

```sh
node serve.ts            # serves game/ at http://localhost:8080 — open it and play
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # hand-in: copies game/ + screenshots/ to out/ and writes out/dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=e1py682r&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
