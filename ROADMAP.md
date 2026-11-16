# Ravenmarrow: Roadmap

**Current version:** 1.6.1 · Nov 16 2026
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

## Shipped in 1.3 (Nov 13 2026)
- Onboarding rework (Mot watched her read it: too much small text): cinematic one-line-at-a-time story intro, the Seer as a portrait character with one short line per step, gold keywords, word-by-word reveal, a notch pointing at the target, progress bar. How to Play is 11 swipeable picture cards (mini() in ui.js).

## Shipped in 1.4 (Nov 16 2026)
Her weekend feedback: had a blast, got far, played between Vikingard raids. Combat got repetitive (Vikingard varies animation and timing even on the same strike); village upgrades didn't feel like they did anything; she loved raiding with and against other people. 3 to 4 people now want to play.
- Attack styles per warrior look (HSTYLE) and per enemy shape (FSTYLE) in ui.js: body moves (release), projectiles (orb, arrow, ravens, sound ring, embers), impact variants (stab, cleave, claw marks, bite, slam rings), random variant + timing jitter on every strike.
- Engine: PASSIVES (one per warrior), TRICKS per enemy shape (poison, bleed, blind, all-hit), AFFIXES elites (Armored, Frenzied, Vampiric, Hulking) from realm 2 on, DoT/miss/endure events. Tutorial fight has no tricks. Foe stats raised ~12% to offset passives (sim curve unchanged).
- Village clarity: Now/Next numbers on every building, before/after squad stats on upgrade, bonus chips at the top of every fight, stat annotations on warrior pages.

## Shipped in 1.6 (Nov 16 2026)
Warband online. Firebase project ravenmarrow-99790 (Spark plan, anonymous auth, Firestore nam5). Config is baked into ui.js FIREBASE_CONFIG; SDK 10.12.2 loaded with dynamic import from gstatic only when a player joins.
- Data: groups/g_<code>/players/<uid> (name, defense lineup, power, rating), groups/g_<code>/boss/<isoWeek>/hits/<uid> (weekly wounds), groups/g_<code>/feed (who raided whom). Rules: signed-in read; each player writes only their own docs; feed entries must carry the writer's uid.
- Join screen in War (name + group code). Settings shows exactly what is shared, change name, leave (deletes own player doc).
- Shared Warband Boss: life = 700 wounds per player, wounds = 1000 x damage / that player's boss life (fair across progress). Leaderboard, once-a-week spoils when slain.
- Arena rivals: friends' saved defense lineups (cleaned and clamped by cleanLineup), rating +20/-10, feed lines, raids on you shown in red.
- Offline: fights still count; the absolute weekly totals publish on the next connect. Background refresh at most once a minute.
- Tests: v16check.py runs two phones plus a cheater against a mock store (window.RM_NET_MOCK).

## Shipped in 1.5.1 (Nov 16 2026)
- Close button on building sheets was covered by the building art (its glow filter stacked above the button). .sheet .close now z-index:5, .bart pointer-events:none.

## Shipped in 1.5 (Nov 16 2026)
Mot: villages need to be defended (walls, lookouts, archer towers), spend to recruit troops and grow resources, squad units that defend plus skirmish groups for attacking players and bosses. Friendly visual UI, not blocks of text. Modeled on Clash of Clans (Town Hall gates levels; collect, upgrade, train, attack) and Vikings: War of Clans (infirmary, watchtower, walls).
- Village is a drawn map (ART.villageMap), 12 buildings in engine BUILDINGS: hall (caps all others via bmax), mead/mine/lookout (idle silver/iron/runes, 10 h cap, one Collect), forge, altar, barracks (also troop strength + unlocks), camp (troop room), infirmary (saves 15%/lvl of fallen troops), wall/tower/pits (defense in night raids and Arena).
- Troops: TROOPS spear/bow/berserk; two bands (S.army.skirmish fights with the squad, S.army.garrison defends). Bands are single combat units (makeBand), losses settle after each fight (settleBand).
- Night Raids every 8 h after the first boss: squad + garrison + fort effects vs a horde. Lose = coffers emptied.
- Engine is side-generic now (enemiesOf/alliesOf), fort effects (tower arrows per round, wall damage cut, pits opening damage, lookout speed), round limits (boss 8, arena 15), Battle.dealt.
- War tab: Raid, Warband Boss (weekly rotating boss x40 life, 3 attempts/day, damage = rewards), Arena (fight a defense lineup: squad + garrison + fort; practice vs own shadow, 5/day). FIREBASE_CONFIG = null in ui.js keeps online parts dormant.
- Review pass: Arena uses Battle opt pvp:3 (hero armor is tuned for monsters, so hero vs hero otherwise times out); practice spars have no fort and count in arena.sparW/sparL, not rating. Troops cost 2.5x and band attack scales n^0.7 and drops as men fall. Boss and Spar locked until the first boss. Map slots re-spaced so every tap opens its own building.

## Multiplayer (next)
Options under discussion with Mot: async co-op World Boss (shared HP over a weekend, damage leaderboard), async Arena PvP (fight a friend's saved squad run by the AI), live co-op raid, live PvP. Needs Firebase (accounts or friend codes) and a change to the "nothing leaves your phone" stance.

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
