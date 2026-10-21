# Study Sprint Planner

A simple, responsive study planner built for a class midterm project.

## Features

- **Study tasks**: add, edit, mark complete, and delete tasks
- **Study timer**: choose any length from 5 to 120 minutes in 5-minute steps, then start, pause/resume, and reset
- **Theme switcher**: Light, Dark, or System (follows your device setting)
- **Next 4 Improvement Waves**: a four-item checklist with a progress bar
- **Saves automatically**: tasks, checklist progress, and theme are stored in `localStorage`, so they survive a refresh
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
src/theme.js      Light / dark / system theme
src/waves.js      "Next 4 Improvement Waves" checklist
src/storage.js    Safe localStorage helpers
src/style.css     Styles
```
