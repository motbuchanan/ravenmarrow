# Ravenmarrow: Roadmap

**Current version:** 1.2 · Nov 13 2026
**Live URL:** https://motbuchanan.github.io/ravenmarrow/ (repo: ravenmarrow, files at the root)
**What it is:** A gothic Norse boss-battle game drawn entirely in code. A gift build inspired by a mobile Viking strategy RPG, built around boss fights, a warrior roster, and a light village. No money, no accounts, no data leaves the phone.

## Files (all flat, repo root)
- index.html: the whole game (engine, art, UI, fonts inlined)
- sw.js: offline cache + update detection. Cache name = `ravenmarrow-v<version>`
- manifest.json, icon-192.png, icon-512.png, apple-touch-icon.png: install
- .nojekyll: keeps GitHub Pages from processing files
- ROADMAP.md: this file

## How updates reach her phone
1. Bump `<meta name="build">` and `<meta name="build-date">` in index.html, the HTML comment on line 2, and `CACHE` in sw.js (same number).
2. Add a new entry at the top of `CHANGELOG` in index.html. It shows once as "A new chapter" after the update lands.
3. Upload index.html and sw.js. Her phone checks on open, when the app comes back to the foreground, and every 30 minutes. A banner says a new chapter arrived; tapping Update reloads with progress kept.

## Save format
- localStorage key `ravenmarrow.save`, `v:1`. `migrate()` fills in any new fields, realms, buildings and settings, so old saves keep working when content is added.
- v1.1 added `ach` (deed id -> time), `daily` {last, total}, `bossKills` per realm, and stats flawless/collects/ultKills. 1.0 saves get bossKills backfilled from cleared realms.
- Backup codes start with `RVM1.` (Settings > Copy backup code / Restore).

## Shipped in 1.0
- 5 realms x 4 stages (3 fights + boss): Barrow-King, Garm, Hel-Maiden, Nidhogg, Jormungandr
- Bosses: signature attack every 3rd turn, enrage below half life, boss intro card
- 8 warriors (3 starters + 5 recruitable with bone runes), each with basic, special (cooldown) and Ultimate (Rage)
- Auto / Manual toggle mid-fight, 1x / 2x / 3x speed, tap-to-target
- Village: Forge, Rune Altar, Barracks, Mead Hall (idle silver up to 10 h)
- Raids: 5 waves, wounds carry over, double loot, keep loot from cleared waves
- Guided walkthrough (first battle teaches basic, special, Ultimate, targeting, Auto; then Warriors, Village, Raid). Replay from Settings.
- How to Play page, What's New, install guide (iPhone Share > Add to Home Screen, Android install prompt)
- Sound effects (WebAudio, on by default, only on taps and fights), ambient music (off by default)
- Balance target: realms 1 and 2 quick, then about 300 to 500 fights to clear realm 5 (simulated)

## Shipped in 1.1 (Nov 13 2026)
- Daily Blessing: first win each local day (saga or raid) pays silver, iron and runes scaled to her furthest realm. No streak penalty.
- Saga Journal (book button, top of camp): realm and boss lore, kill counts, stats.
- 20 Deeds paying bone runes (boss kills, flawless boss, Good Dog, Ultimate finisher, recruits, levels, buildings, full coffers, raids, 100 wins). Raid boss kills count.

## Shipped in 1.2 (Nov 13 2026)
- Relics: 15 (3 per boss), defined in RELICS in the engine. First boss kill always drops one; repeat kills 40%; raid boss 50%. One per warrior, most with a trade-off. Journal Relics tab, deeds Cursed Collector and The Hoard. Save fields `relics` {id: time} and `equip` {warrior: relic}.
- Combat feel pass (her feedback via Mot: too fast, no impact): wind-up before every move with rune flare, slash + spark effects, knockback, red hurt flash, heavier shakes, Android vibration. 1x pacing about 1.2 s per hero action; speed divides pauses by 1 / 1.8 / 3.

## Locked decisions
- Art is drawn in code (approved Sample A look). No image files except the app icons.
- No real money, loot boxes or timers that push paying.
- Version shows in Settings only (gift build, no badge on game screens).
- Nothing suggestive.

## Open queue (expansion ideas, in rough priority)
1. Her feedback after first play
2. Realm VI and beyond (each realm = 1 entry in REALMS + 1 foe shape if new)
3. Warrior stars / ascension past the level cap
4. Weekly hunt: one rotating boss with a modifier
5. More warriors (each = 1 WARRIORS entry + 3 SKILLS + a portrait case)
6. Haptics on hits (Android only; iPhone Safari has no vibration)
