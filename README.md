# October

A private two-person habit tracker for 1–31 October 2026. Nine goals, two phones, one quiet mirror.
Vanilla HTML/CSS/JS PWA, Firebase for sync, GitHub Pages for hosting. No build step.

## Files
- `index.html`, `app.css`, `app.js`: the app (Today, Calendar, Day sheet, countdown, finish, sign-in)
- `store.js`: data layer: local-first cache, Firebase sync, demo scenarios
- `config.js`: Firebase config and the two emails. With `firebase: null` the app runs on one phone with no sync.
- `sw.js`: offline cache. **Bump `V` on every release.**
- `firestore.rules`: security rules (only the two emails; each person writes only their own days)
- `design/handoff/`: the Claude Design handoff (spec + prototypes). `design/claude-early-prototype/`: early concepts, not used.

## Run locally
```
python -m http.server 8790
```
Open http://localhost:8790

## Test URLs
- `?demo=normal|dayOne|otherNotLogged|allDone|cheatsUsed|night|lastDay|offline` sample data, nothing saved
- `&phone=hers` her perspective
- `?now=2026-10-15T21:40` pretend it's that time (uses real saved data)
- `?nosw=1` skip registering the service worker
- `?practice=1` practice day (Oct 15 at the real time of day, sample history, synced in a separate `practice` space). Reached from the countdown's "Try a practice day" button.
- `?local=1` skip Firebase entirely (local-only, for testing on a dev machine)

## Design changes after the handoff
- Home tiles are read-only; tapping a tile grows it into an edit sheet (FLIP from the tile's rect) with drag controls, ± buttons and big pills. Fixes scrolling over drag tiles.
- Week 1 (Thu 1 to Sun 4) is a warm-up: weekly gym/runs/pages show plain counts, not targets.

## Data
`couples/{coupleId}/entries/{a|b}_{day}`: one doc per person per day:
`{ water, sleep, outside, steps, pages, gym, run, junk, meals[3], grat[3], note, noteAt, updatedAt }`.
`couples/{coupleId}`: `{ swapColors }`. Writes are debounced 600 ms (never per pointermove).
Weeks run Monday–Sunday; cheat meals are counted over the month.

## Firebase setup (once)
1. console.firebase.google.com: Add project, "october" (Analytics off).
2. Build → Authentication → Get started → Google → Enable.
3. Authentication → Settings → Authorized domains → add `<github-user>.github.io`.
4. Build → Firestore Database → Create database (production mode, nearest region).
5. Firestore → Rules: paste `firestore.rules` with the two emails filled in → Publish.
6. Project settings → Your apps → Web (`</>`) → register → copy the config into `config.js`. Fill `people.a` (him) and `people.b` (her) with the SHA-256 hex of each lowercase email: `python -c "import hashlib;print(hashlib.sha256(b'name@gmail.com').hexdigest())"`. The repo is public, so never commit the plain emails.

The web API key in `config.js` is meant to be public; access is controlled by the rules.
