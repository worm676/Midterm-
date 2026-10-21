# Study Sprint Planner

A simple, responsive study planner built for a class midterm project.

## Features

- **Study tasks**: add, edit, mark complete, and delete tasks
- **Study timer**: iPhone-style scroll wheels for hours (0–12) and minutes (0–59), then start, pause/resume, and reset
- **Ring sound**: a chime plays when a sprint finishes. Open the **Ring** tab on the right edge of the screen to pick Chime, Bell, Ding-dong, Marimba, Harp, Digital alarm, Cowbell, Piano, Flute, or Off, and preview it. Sounds are generated in the browser with the Web Audio API (no audio files)
- **Study break art**: 20 landscape illustrations drawn in the browser as SVG. 10 classics always stay, and 10 new pieces (new styles and new layouts) appear every Monday, marked "New this week". Swipe, scroll, or use the arrow buttons/keys to browse; it changes on its own every 90 seconds (with a Pause button)
- **Theme switcher**: Light, Dark, or System (follows your device setting)
- **Next 4 Improvement Waves**: a four-item checklist with a progress bar
- **Saves automatically**: tasks, checklist progress, theme, and ring choice are stored in `localStorage`, so they survive a refresh
- **Responsive and accessible**: works at iPhone 16 Pro Max width (440px), has 44px touch targets, labelled controls, visible focus rings, a skip link, and full keyboard support (Enter saves an edit, Escape cancels it)

No login, database, or external API. All data stays in the browser.

## Tech stack

- [Vite](https://vite.dev/) (build tool and dev server)
- Plain HTML, CSS, and JavaScript (no framework)

## Run locally

Requires [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm run dev       # start the dev server at http://localhost:5173
npm run build     # build the production site into dist/
npm run preview   # serve the built dist/ folder at http://localhost:4173
```

## Deploy to Netlify

The repo includes a `netlify.toml`, so Netlify picks up the settings automatically.

1. Log in to [Netlify](https://app.netlify.com/) and choose **Add new site → Import an existing project**.
2. Connect GitHub and pick this repository.
3. Choose the branch to deploy (for example `main`).
4. Confirm the build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 22 (set in `netlify.toml`)
5. Click **Deploy**. Netlify gives you a public URL when the build finishes.

### Drag-and-drop alternative

Run `npm run build` locally, then drag the `dist/` folder onto
[app.netlify.com/drop](https://app.netlify.com/drop).

## Project structure

```
index.html        Page markup
netlify.toml      Netlify build settings
public/           Static files (favicon)
src/main.js       Entry point
src/tasks.js      Task list: add, edit, complete, delete
src/timer.js      Study timer
src/wheel.js      iPhone-style scroll wheel picker
src/theme.js      Light / dark / system theme
src/art.js        Study break art carousel
src/artGen.js     Weekly artwork generator (SVG)
src/sound.js      Synthesized ring sounds
src/ringMenu.js   Ring picker tab
src/waves.js      "Next 4 Improvement Waves" checklist
src/storage.js    Safe localStorage helpers
src/style.css     Styles
```
