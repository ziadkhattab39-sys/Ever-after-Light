# Ever Afterlight

Plain HTML / CSS / JavaScript. No build step, no dependencies, no backend.

**Run it through a local server** (the real content is loaded with `fetch()` from JSON, which browsers block on `file://`):

```
python -m http.server 8000      # then open http://localhost:8000
```
GitHub Pages or any static host works too. If you open `index.html` straight from disk, the pages show a message explaining this.

## Pages
| File | View |
|---|---|
| `index.html` | Home / welcome, with a riddle from the real gems |
| `challenges.html` | The 15 real challenges. Add photos, finish challenges, unlock gems |
| `gems.html` | The 3 hidden gems: three riddles each, Revelio hints, your photo |
| `album.html` | Your album: every saved challenge photo + every collected gem |

## Where the content comes from
```
data/ever_afterlight_challenges.json   REAL challenges CH01-CH15 (the only source of their text)
data/ever_afterlight_hidden_gems.json  REAL gems HG01-HG03 (the only source of their text)
data/game-config.js                    rules the JSON does not carry (see below)
js/data.js                             fetches both JSON files and joins them with the config by id
```
The JSON text is never rewritten or shortened. To change wording, edit the JSON.

## The game loop
```
Challenge: add photos -> slots with a SAVED photo count -> challenge completes
Completed challenges -> unlock hidden gems
Gem: read riddles (Revelio = hint) -> "I've found it" -> add your photo -> album
```

### How a challenge completes (`challengeRules` in `data/game-config.js`)
| type | rule | used by |
|---|---|---|
| `collection` | N slots, each with its own photo. Done when every slot has a saved photo | CH01, CH02 (10 each) |
| `multi` | add photos one by one. Done at `min`, up to `max` | CH03 (min 1), CH04 and CH05 (min 2) |
| `single` | one photo | every other challenge |

A slot counts **only** when its photo is saved in IndexedDB. There are no checkboxes.
The JSON has no item lists, so collection slots are numbered ("Faculty logo 3") and each has an optional "name it" field.
Only CH01/CH02 state a count in their goal; the `min` values for CH03-CH05 are my reading of the plural wording. All are one-line edits in the config.

### Gem unlocking (`gems` in `data/game-config.js`)
The gems JSON has no unlock rules, so these are set in the config: HG01 after CH01–CH05 are completed, HG02 after CH01–CH10, HG03 after CH11–CH15. A gem you already opened never locks again.
The gems JSON has no riddle answers, so there is nothing to type: you tap "I've found it". Real places (HG01, HG02) keep their name and description hidden until found, because they give the riddle away. HG03 is a personal discovery, so it shows its name when unlocked and asks for a photo of "your newest discovery" plus an optional name for it.
Revelio appears only on riddles that have a `hint` in the JSON (HG03's).

## Final Wave theme
`.theme-final` (end of `css/styles.css`) remaps the site's existing colour tokens to the Final Wave palette.
It is applied only to CH11-CH15 (cards, covers, progress), the "final wave" banner, the HG03 card / track item / dialog, and their album polaroids. Everything else keeps the original palette and the original logo.
Branding images used: `assets/final-wave/minimal-logo.webp` (banner) and `master-logo.webp` (HG03 dialog).

## Saving
- `localStorage`: small flags only (`js/store.js`): gem status, which slots have a photo.
- IndexedDB (`js/photos.js`): the photos. One record per slot, so replacing a photo overwrites it and the album never duplicates. Photos are scaled to 1600px JPEG before saving.
- "Reset my progress" on the album page clears both.

## Structure
```
css/styles.css     all styles (tokens at the top; section 11-13 = photo slots, riddles, Final Wave)
data/              the two JSON files + game-config.js
js/data.js         loads + joins the JSON
js/photos.js       IndexedDB photo storage
js/photo-ui.js     the one photo-slot component (used by challenges and gems)
js/store.js        localStorage flags
js/progress.js     THE RULES: completed challenges, which gems are unlocked
js/challenges.js   js/gems.js   js/album.js   js/home.js   page scripts
assets/img/samples/  decorative illustrations (challenge covers, gem art)
assets/final-wave/   Final Wave logos
```
Script order on pages that use progress: `game-config.js`, `data.js`, `photos.js`, `photo-ui.js`, `store.js`, `progress.js`, page script.

## Known limits
- Progress and photos live in this browser only (no accounts, no sync). Clearing site data deletes them.
- Photos the browser cannot decode (for example HEIC outside Safari) are refused with a message.
- Cover and gem artwork are the existing illustrations; swap them in `data/game-config.js`.
