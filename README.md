# Screen Time Counter

A browser-based screen time tracker that asks for full-screen capture and classifies the session as active, idle, or away.

## Features

- Full-screen capture through the browser Screen Capture API.
- AFK-style classification using screen-change detection and in-page input.
- Adjustable idle and away thresholds.
- Active, idle, away, and total timers.
- Activity timeline with CSV export.

## Run Locally

```bash
npm start
```

Then open `http://127.0.0.1:5173` and choose **Entire screen** in the browser capture dialog.

## Browser Limits

For privacy, browsers do not let a web page read global keyboard or mouse activity outside the page. This app uses visual screen changes from the shared screen plus input while the page is focused.
