# Habits — Daily Habit Tracker

A Notion-inspired habit tracker with streak tracking, weekly statistics, progress charts, and dark mode. Runs entirely in the browser — no server required.

## Features

- **Today view** — check off habits with a single click, circular progress ring
- **Streak tracking** — current streak and best streak per habit, with animated flame for hot streaks (3+ days)
- **Statistics view** — best streak, weekly completion rate, all-time count, perfect days
- **Weekly bar chart** — visual progress for the last 7 days
- **Per-habit breakdown** — 7-day completion rate + streak per habit
- **History view** — 30-day heatmap + daily log with perfect-day markers
- **Dark mode** — toggle in the sidebar, persisted to Local Storage
- **Add / Edit / Delete habits** — emoji picker, color picker, name
- **Local Storage** — all data persists across sessions, zero backend

## Usage

Open `index.html` in any modern browser. No build step, no dependencies (only Google Fonts loaded from CDN).

```
Habit-Tracker/
├── index.html   — markup & layout
├── style.css    — design tokens, components, dark mode
├── script.js    — state management, rendering, Local Storage
└── README.md    — this file
```

## Data format (Local Storage)

Key: `habitTracker_v2`

```json
{
  "habits": [
    { "id": "abc123", "name": "Morning Run", "icon": "🏃", "color": "#4A7CF7", "createdAt": "2025-06-01" }
  ],
  "completions": {
    "2025-06-09": { "abc123": true }
  },
  "theme": "light"
}
```

## Design

Palette: `#F7F7F5` light / `#191919` dark, `#4A7CF7` accent, `#F5A623` amber streaks.  
Typography: Inter (300–900).  
Signature element: animated flame on streaks ≥ 3 days.
