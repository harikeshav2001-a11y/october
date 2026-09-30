# Handoff: Project October tracker (PWA)

## Overview
A private two-person habit tracker for 1–31 October 2026. Two partners each log the same 9 goals on their own phone and see each other's day. It should feel like a "quiet mirror": no score and no competition. The app has two main panes, **Today** and **Calendar**. You move between them by swiping horizontally or with a button. Tapping a past day opens a **Day detail** bottom sheet.

Product brief: `reference/DESIGN-BRIEF.md`. Planned stack: vanilla HTML/CSS/JS PWA, Firebase (Google sign-in, 2 whitelisted accounts, Firestore offline persistence), hosted on GitHub Pages.

## About the design files
The `.dc.html` files in this bundle are **design references built in HTML**. They are working prototypes of the intended look and behaviour, not production code. Rebuild them in the target stack (vanilla JS + Firebase per the brief) using that environment's patterns. To view a prototype, open `October App.dc.html` in a browser, with `support.js` next to it. The tweak props (see below) are passed as attributes, or you can edit the `default` values in the file's `data-props`.

- `October App.dc.html`: **the primary spec.** Split-tile Today, Calendar, Day sheet, swipe, and all edge cases.
- `October Tracker.dc.html` + `Today.dc.html`: an exploration canvas comparing split, toggle and swipe views of the other person's data. **Split (1a) was chosen.** Keep it for reference only.
- `reference/`: the original lo-fi frames and the brief.

## Fidelity
**High fidelity.** Colours, type, spacing, radii and motion are final. Recreate them pixel-accurately at a 390 px wide viewport. Layout is fluid in width (tiles use `minmax(0,1fr)` grids).

---

## Core model: people, perspective, colour
- There are two people: **A** (him) and **B** (her). Colour belongs to the **person**, not to the role: A = coral, B = teal. This holds on both phones, so each person always sees the same colour for the same human.
- **Perspective:** on A's phone, A is "You" (editable) and B is "her" (read-only). On B's phone, B is "You" and A is "him". All copy uses pronouns: `her/him`, `She/He`, `her/his`.
- **Swap colours:** a user setting that flips the A/B colour assignment. Store it per couple, not per device, so both phones stay consistent.
- The UI is otherwise pure mono. Accent colour appears only on data: fills, ticks, active pills, dots, note tints and the other person's text rows.

## Design tokens
Colours:
- Background `#0b0b0c`; sheet `#111113`; tile `#161618`; calendar future-cell `#0f0f11`; strip cell `#1a1a1d`
- Hairlines `#222226`, `#26262a`, `#2a2a2e`; inactive ticks and pill borders `#333337`; muted dots `#2c2c30`, `#3a3a3e`, `#44444a`
- Text: primary `#f2f2f0`; secondary `#c8c8cc`, `#a0a0a6`; label `#8a8a90`; dim `#6b6b70`; faint `#55555a`; ghost numeral `#34343a`
- Coral (A default) `oklch(0.74 0.13 40)` ≈ `#EE8A62`
- Teal (B default) `oklch(0.76 0.1 190)` ≈ `#57C4C4`
- Note tint: `color-mix(in oklch, <accent> 14%, #141416)`
- Water fill: `color-mix(in oklch, <accent> 24%, #161618)` with a 2 px accent top border
- Backdrop `rgba(0,0,0,.6)`

Type:
- **Geist** (400/500/600): numerals and body. **Geist Mono** (400/500): labels and meta. Both are on Google Fonts.
- Day numeral: 58 / 500 / letter-spacing −0.045em / line-height .9; "/31" in `#34343a`
- "October": 44 / 500 / −0.045em
- Summary sentence: 21 / 500 / lh 1.28 / −0.015em, with muted words in `#6b6b70` and values in white or accent
- Tile big numbers: water 48, outside 40, sleep/steps 30, reading wheel centre 42. All 500, −0.04 to −0.045em, `tabular-nums`. Units 14–17 in `#6b6b70`.
- Tile labels: Geist Mono 10.5 / letter-spacing .1em / uppercase / `#8a8a90`
- Other-person row: Geist Mono 11, accent colour, preceded by a 6 px dot
- Pills: 14 / 600 / −0.01em

Spacing and shape:
- Screen padding 16; tile gap 10; tile padding 14 (16 on full-width tiles); top safe area 60
- Radii: tiles 22, notes and cards 18, calendar cells 10, strip cells 4, pills and buttons 999, sheet top 28
- Pill height 40; header button height 34; calendar cell height 54

---

## Screens

### 1. Today (pane 0)
Top to bottom:
1. **Header.** Left: `15` plus a ghosted `/31` (the day number is zero-padded, e.g. `01`). Right: a **CALENDAR** pill button (3×3 dot icon made of 3 px dots; Geist Mono 11; border `#2a2a2e`; background `#161618`) and below it the date tag `THU · OCT 15`.
2. **Offline banner** (conditional): a pill reading `OFFLINE · SAVED ON THIS PHONE, SYNCS WHEN BACK`.
3. **Summary sentence.** A generated, warm, factual sentence (rules below).
4. **Post-it "From her/him"**: tinted in the other person's colour, read-only, with a timestamp. Empty state: "No note from her yet today." in `#6b6b70`.
5. **Post-it "Your note for her/him"**: tinted in your colour, a 3-row textarea, **one note per day, hard cap of 100 words** (input past 100 is rejected). The counter turns accent at ≥90 words and reads `100/100 · limit` at the cap.
6. **Tile grid** (split tiles). Each tile shows your value large, plus the other person's value in their colour below it.
   - Row 1, a 2-column grid:
     - **Water**: left column, spans 2 rows, min height 250. Vertical drag fills the tile. Range 0–3.5 L, step 0.1, goal 2.5 L (a 28 px dashed tick at 71.4% height, right-aligned). Includes the other person's thin bar.
     - **No junk**: pills `Clean` / `Cheat`. Meta `cheats n/3` counts the **month** total.
     - **Sleep**: horizontal tick ruler, 25 ticks, range 4–10 h, step 0.25, goal 7 h (the target tick is taller and lighter).
   - **Outside**: full width. Ruler with 41 ticks, 0–40 min, step 1, goal 20. Includes the other person's bar.
   - A 1.15fr / 1fr row:
     - **Gym**: pills `Gym` / `Run`. Meta `n/4 this wk`, subline `runs n/3 this wk`.
     - **Steps**: ruler with 16 ticks, 0–15,000, step 100, goal 10k, displayed as `6.2k`.
   - **Phone-free meals**: full width, pills `Breakfast` / `Lunch` / `Dinner`, meta `n/3`.
   - A .8fr / 1.2fr row:
     - **Read**: a vertical-drag **number wheel** of 5 rows. Centre 42 px; ±1 at 20 px and 35% opacity; ±2 at 14 px, 12% opacity, 1 px blur. Range 0–60, 14 px of drag per page, goal 10 per day, with a weekly fallback of 50 shown in meta (`n/50 wk`). The centre number turns accent at ≥10.
     - **Gratitude**: 3 inputs numbered `01`–`03`, max 80 characters each, meta `n/3`.
7. **October strip.** 31 cells in a row with a 3 px gap. Each cell has two 3 px bars: your share of 9 goals met in your colour, theirs in their colour. Today has a 1 px white outline; future cells are darker. Tapping the strip opens Calendar.
8. **Pane indicator.** Two dots at the bottom centre; the active one stretches to 16 px wide.

Goal definitions (used for "met", dots and counts):
- water ≥ 2.5
- junk = clean
- sleep ≥ 7
- gym logged
- steps ≥ 10,000
- outside ≥ 20
- all 3 meals phone-free
- all 3 gratitude lines filled
- pages ≥ 10

Pill logic:
- Turning on `Run` also turns on `Gym`; turning off `Gym` also turns off `Run`.
- `Cheat` is **disabled** (35% opacity, `not-allowed`) when 3 cheats have already been used this month and today isn't a cheat. Meta then reads `no cheats left`.
- Weekly states: `week done` at 4/4 gym; `runs 3/3 · done`.

### 2. Calendar (pane 1)
- Header: "October" plus a `← TODAY` pill button.
- A summary sentence (see copy rules).
- A 7-column grid (M–S). October 2026 starts on Thursday, so there are 3 hidden leading cells.
- Each cell: day number (Mono 10.5), then **two 3×3 dot matrices** side by side. Dots are 4 px with a 1.5 px gap; left = you, right = them. The 9 dots follow goal order (Water, No junk, Sleep / Gym, Steps, Outside / Phone-free, Gratitude, Read). A lit dot is accent, a missed dot `#2c2c30`, a future dot is a hollow ring `#26262a`.
- Today has a `#8a8a90` border; the selected day a white border; future cells are disabled.
- Tapping a past day opens the Day sheet. Tapping today returns to the Today pane.
- A legend card explains the 3×3 order.
- A counters card with columns YOU and HER/HIM: Gym this week, Runs this week, Pages this week, Cheat meals (month).

### 3. Day detail (bottom sheet, read-only)
- The sheet is `#111113`, max height 88%, top radius 28, with a 38×4 grab handle. The backdrop dims the screen, and tapping the backdrop or ✕ closes the sheet.
- Header: big day number plus the weekday in `#55555a`. A line shows `● you n/9 · ● her n/9 · READ-ONLY`.
- A goal table: 9 rows with columns name / you / them. Each value shows a 6 px dot, filled if the goal was met and hollow if not; met values are accent, missed values `#6b6b70`.
- Notes side by side: "YOU WROTE" and "SHE/HE WROTE", each tinted in its owner's colour.
- Gratitude in two columns, each line with a 2 px left rule in the owner's colour.

---

## Copy rules for the summary sentence (warm, a bit playful, factual)
Build the sentence from segments. Muted words are `#6b6b70`, your values white, their values in their colour.
- Openers: `Day one. ` (day 1), `Last day. ` (day 31), `Evening check-in. ` (after about 9 pm).
- If you've met all 9: "All 9 closed, go be smug somewhere quiet".
- Otherwise: "You've closed **n of 9**". At night, add ". Still open: **gratitude, reading**". During the day, if water is short, add ", with **0.7 L** of water to go".
- The other person, if they haven't logged yet: ". She hasn't logged yet today, a note might help."
- Otherwise: ". She's on **n of 9** and has already **read her 10 pages / had her 20 minutes of sun / finished her water**." Include the "has already" part only if one of those is true.
- Calendar sentence: "You both kept water on **n days**, and there are **n cheat meals** left between you." There are special versions for day 1 and day 31.

---

## Interactions and micro-animations (implement all of these)
| Element | Trigger | Behaviour |
|---|---|---|
| Pane swipe | Pointer drag anywhere except scrub tiles, buttons and inputs | The track (200% wide) follows the finger with `translateX(calc(-pane*50% + dx px))`. The axis locks after 8 px; vertical wins, so normal scrolling still works. There is 25% rubber-band resistance at the edges. On release, it snaps to the next pane if \|dx\| > 60 px, else springs back, using `transform .5s cubic-bezier(.2,.8,.2,1)`. No transition while dragging. The track uses `touch-action: pan-y`. |
| Calendar / Today buttons, strip tap | Tap | Same snap animation. The pill scales to .95 while pressed. |
| Pane dots | Pane change | The active dot grows from 6 to 16 px wide and white, `all .3s ease`. |
| Ruler tiles (sleep, outside, steps) | Pointer down, drag horizontally anywhere on the tile | The value comes from the pointer x over the ruler element (`[data-ruler]`), snapped to the step. Ticks left of the value turn accent (`background .12s`). A 2×30 px white playhead follows the pointer with no transition while dragging, and eases with `left .3s` on programmatic changes. The tiles use `touch-action: none`. |
| Water tile | Vertical drag | The fill height follows the pointer y (top = 3.5 L), with no transition while dragging and `height .45s cubic-bezier(.2,.8,.2,1)` otherwise. |
| Reading wheel | Vertical drag | 14 px per page; the wheel rows re-render around the value. |
| **Drag glow** (only while dragging) | During any scrub or wheel drag | A radial gradient is centred on the pointer inside the tile: accent at 70% → 22% at 30% → transparent at 65%. It fades in with `opacity .15s ease-out` and out with `.7s ease-out`, and follows the pointer. |
| Pills | Tap | Background, colour and border transition `.18s`; press scale .95. When active: filled with the accent colour and text `#0b0b0c`. When inactive: transparent with a `#333337` border. |
| Calendar cell | Press | Scale .94 (`transform .12s`); border colour change `.2s`. |
| Day sheet | Open | Mount, then on the next 2 animation frames animate `translateY(100%)` → `0` over `.42s cubic-bezier(.2,.8,.2,1)`; the backdrop fades 0 → 1 over `.35s`. Close reverses this, then unmounts after 380 ms. |
| Other-person bars, strip bars | Data change | `width .4s ease`. |
| Night highlight | After about 9 pm | The Gratitude and Read tiles get a 1 px inset accent ring (`box-shadow .3s`) until they're done. |
| Note tints | Colour swap | `background .3s`. |

Respect `prefers-reduced-motion`: drop the glow and the transform animations, and keep the opacity fades.

## Edge cases (all prototyped; switch between them with the `scenario` prop)
- `normal`: day 15, mid-week.
- `dayOne`: day 01. Empty history, the other person hasn't logged, no note from them, weekly counters at 0, and the calendar mostly shows future rings.
- `otherNotLogged`: their rows show `—` in `#55555a` with a hollow dot, their bars are at 0%, the sentence nudges toward leaving a note, and the "From her" card shows its empty state.
- `allDone`: all 9 met, celebratory sentence, full strip bar.
- `cheatsUsed`: 3/3 cheats used, `Cheat` pill disabled, meta `no cheats left`.
- `night`: 9:40 pm. The sentence lists the goals still open, and the unfinished Gratitude and Read tiles get accent rings.
- `lastDay`: day 31, finish-line copy on Today and Calendar.
- `offline`: shows the banner. All writes are local-first; Firestore offline persistence syncs them later.

Also handle:
- Water over target: the fill caps at 3.5 L and the value can exceed 2.5.
- The 100-word note cap.
- Gratitude inputs capped at 80 characters.
- Future calendar days aren't tappable.
- Past days are read-only.
- Weekly counters reset on Monday; the cheat counter is monthly.
- Before 1 Oct or after 31 Oct: show a countdown screen or a finish screen (not designed; ask the designer).
- Sign-in allows only the 2 whitelisted Google accounts (not designed).

## State
- Per person per day: `{ water, sleep, outside, steps, pages, gym, run, junk: 'clean'|'cheat'|null, meals:[b,l,d], grat:[3 strings], note, updatedAt }`
- Derived: goals met (9 booleans), weekly gym/run/pages counts (Monday–Sunday), monthly cheats.
- UI: `pane` (0|1), `dragX`, `drag` (key of the tile being scrubbed), glow position `gx`/`gy`, `sheetDay`, `sheetOpen`.
- Settings: `swapColors`, which user is A or B (from the auth uid).
- Firestore suggestion: `couples/{id}/days/{yyyy-mm-dd}/people/{uid}`. Write on drag end, not on every pointermove.

## Tweak props in the prototype
- `phone`: `mine` | `hers` (perspective)
- `swapColors`: boolean
- `scenario`: see Edge cases

## Assets
No image assets. Icons are CSS dots. Fonts: Geist and Geist Mono (Google Fonts).

## Files
- `October App.dc.html`: the primary prototype (open this one)
- `support.js`: the runtime needed to open the `.dc.html` files locally
- `October Tracker.dc.html`, `Today.dc.html`: the exploration canvas (split / toggle / swipe)
- `reference/`: lo-fi Figma frames and `DESIGN-BRIEF.md`
