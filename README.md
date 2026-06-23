# Personal health dashboard

A glanceable, single-page dashboard for building strength, muscle, and tone
(postpartum). Tap foods — the app does the math. No grams to count, no apps to
doom-scroll. Just: am I on track today?

## Use it

Open `index.html` in any browser. No build step, no server, no install.
Everything saves to your device (localStorage), so your taps survive a reload.

## What's on it

- **Today** (the hero) — protein by portions, water, meals, workout, daily
  habits, sleep. Resets at the start of each day and saves the finished day to
  history first.
- **This week** — workouts completed (target 4), bodyweight trend toward
  46–48 kg, top lift check, and a how-the-body-feels note.
- **Body composition** — InBody scan reference with skeletal muscle as the
  headline metric, progressing toward 24.4 kg.
- **Plan reference** — nutrition, training week, strength moves, gentle core,
  and stretch notes (collapsible).

## Editing the food list

Foods live in one place — the `FOODS` array at the top of `app.js`. Each is a
plain object:

```js
{ name: '3 eggs / omelette', protein_grams: 18, emoji: '🥚' }
```

Add, remove, or change values and the protein bar updates automatically.

## Accessibility

Mobile-first, responsive to laptop. Large tap targets (min 44px), high
contrast, keyboard accessible with visible focus, and respects
`prefers-reduced-motion`.

## Files

- `index.html` — structure
- `styles.css` — styling
- `app.js` — state, persistence, daily reset, history
