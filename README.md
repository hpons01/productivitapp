# ProductivitApp ⚔️

A science-backed productivity desktop app — built for people who want to grind their real life like an RPG.

Built with Electron + React + TypeScript + SQLite. Rivals apps like The Fabulous, Habitica, and Forest, but runs entirely offline on your machine.

---

## What's Inside

### Science Layer
Every feature maps to a peer-reviewed behavioral science concept:

| Concept | Author/Source | Feature |
|---|---|---|
| Pomodoro Technique | Cirillo | Focus Timer with drift-corrected countdown |
| Implementation Intentions | Gollwitzer | Morning Ritual ("I will X at Y in Z") |
| Habit Stacking | Clear — *Atomic Habits* | Habit cue-routine-reward editor |
| Variable Reward / Dopamine Loop | Skinner / Nir Eyal | Probability-based loot boxes |
| Progress Principle | Amabile & Kramer | XP popups, streak calendar, level-ups |
| Energy Management | Loehr & Schwartz | Hourly energy check-in + zone recommendations |
| Two-Minute Rule | Allen — *GTD* | Task flag for tasks ≤ 2 minutes |
| Temptation Bundling | Milkman | Pair a reward with each task |
| Commitment Devices | Ariely | Written onboarding commitment + nightly review |
| Time Blocking | Newport — *Deep Work* | Pomodoro session labeling |
| Visualization | Positive Psychology | Daily rotating journal prompts |

### RPG Gamification System

**Character progression**
- Level 1–100 using a √XP curve — early levels come fast for dopamine, later levels require real grinding
- 5 character classes that evolve based on dominant behavior:
  - ⚡ Time Mage (Pomodoro-heavy)
  - ⚔️ Iron Warrior (habit-streak-heavy)
  - 🌿 Zen Master (energy + rituals)
  - 🧙 Arcane Scholar (journaling)
  - 🎯 Grand Tactician (task completion)
- 4 RPG stats shown as a radar chart: Focus Power, Discipline, Vitality, Wisdom

**XP Economy**

| Action | XP |
|---|---|
| Complete a Pomodoro | +30 XP |
| Pomodoro with zero interruptions | +40 XP |
| Complete a habit | +15 XP base + streak bonus |
| Morning ritual | +25 XP |
| Evening reflection | +20 XP |
| Task completed | +10 XP |
| Energy check-in | +5 XP |
| Badge unlocked | +50–5000 XP |

**Streak multipliers** — 1× → 1.5× (7d) → 2× (14d) → **3× Legendary Grind** (30d+)

**Loot boxes** — triggered probabilistically on completions. 5 rarity tiers (Common → Legendary). Contents: XP boosts, cosmetic titles, power-ups, themes.

**Weekly Boss** — a boss spawns every Monday. Deal damage by completing habits, pomodoros, and tasks. Defeat it for epic loot.

**Daily Quests** — 3 randomized objectives regenerated each day. Complete all 3 for bonus XP + loot chance.

**30+ Achievements** — from `First Habit` (common) to `Legendary Grind` (365-day streak, legendary). Includes hidden `???` achievements nobody knows about until they trigger.

### Features

| Feature | Description |
|---|---|
| **Dashboard** | Character card, today's stats, active timer widget, daily quests, weekly boss HP |
| **Habits** | Daily check-off, edit/delete with confirmation, streak counter, legendary flame animation, habit stack cues |
| **Pomodoro** | SVG ring timer, presets (25/5, 50/10, 90/15), interruption tracking, tray countdown, full session history |
| **Tasks** | Priority matrix, two-minute badges, temptation bundles, quick-wins filter |
| **Morning Ritual** | 3-step wizard: energy check → 3 intentions → gratitude |
| **Evening Reflection** | Wins, obstacles, tomorrow's priority |
| **Visualization** | Rotating prompts for future-self journaling |
| **Energy Tracker** | Emoji scale check-in, line chart over 14 days, zone recommendations |
| **Analytics** | Heatmap calendar with styled tooltips, radar chart, XP bar, full trophy room |
| **Inventory** | View and activate earned loot drops — tier-colored cards with XP boosts and power-ups |
| **Gamification Overlay** | Level-up screen, badge unlock, loot box, boss defeat — particle animations + Web Audio sound effects |
| **System Tray** | Countdown visible in menu bar, quick-start pomodoro, quick habit check-in |
| **Notifications** | Morning/evening reminders, energy check-in prompts, streak warnings |
| **Onboarding** | 4-step flow: welcome → science explainers → habit seeds → commitment device |
| **Settings** | Theme toggle, notification times, Pomodoro durations, profile |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 30 |
| Build tool | electron-vite 2 (3 separate targets: main / preload / renderer) |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS 3 + custom dark theme |
| Animations | Framer Motion 11 |
| State | Zustand 4 (one store per feature) |
| Database | SQLite via better-sqlite3 9 (auto-migrates on startup) |
| Charts | Recharts 2 (heatmap, radar, line) |
| Components | Radix UI primitives (Dialog, Tabs, Select, etc.) |
| Routing | React Router 6 with `createHashRouter` (required for `file://` in Electron) |
| Packaging | electron-builder 24 |
| Auto-update | electron-updater → GitHub Releases |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
git clone https://github.com/hpons01/productivitapp
cd productivitapp
npm install
```

> `npm install` automatically rebuilds the `better-sqlite3` native module for your platform via the `postinstall` hook.

### Run in development

```bash
npm run dev
```

- Opens an Electron window with Hot Module Replacement in the renderer
- Changes to `src/renderer/` hot-reload without restart
- Changes to `src/main/` restart Electron automatically

### Build for production

```bash
npm run build
```

Outputs:
```
out/
├── main/index.js        # Electron main process
├── preload/index.js     # IPC bridge
└── renderer/
    ├── index.html
    └── assets/          # CSS + JS bundle
```

### Package distributable binaries

```bash
npm run package          # current platform
npm run package:mac      # macOS .dmg (universal)
npm run package:win      # Windows .exe (NSIS installer)
npm run package:linux    # Linux .AppImage + .deb
```

Packaged apps land in `dist/`.

---

## Project Structure

```
productivitapp/
├── electron-vite.config.ts     # Build: 3 separate Vite targets
├── tailwind.config.js          # Custom dark theme + animations
├── electron-builder.yml        # Packaging + GitHub Releases config
│
├── resources/                  # App icons (bundled by electron-builder)
│   ├── icon.png / .icns / .ico
│   └── tray-icon.png
│
├── src/
│   ├── main/                   # Electron main process (Node.js)
│   │   ├── index.ts            # Window creation, app lifecycle
│   │   ├── tray.ts             # System tray menu
│   │   ├── notifications.ts    # Native notification scheduler
│   │   ├── updater.ts          # electron-updater setup
│   │   ├── ipc/                # IPC handlers (one file per feature)
│   │   └── db/
│   │       ├── index.ts        # SQLite singleton + migration runner
│   │       └── queries/        # Pure SQL query functions (testable)
│   │
│   ├── preload/
│   │   └── index.ts            # contextBridge: exposes typed window.api
│   │
│   └── renderer/               # React application
│       ├── index.html
│       └── src/
│           ├── App.tsx          # HashRouter + routes + theme
│           ├── assets/styles/   # Tailwind + CSS variables
│           ├── components/
│           │   ├── layout/      # Sidebar, TopBar, AppLayout
│           │   ├── ui/          # Button, Card, Input, Modal, Badge...
│           │   └── feedback/    # GamificationOverlay (level-up, loot, badges)
│           ├── pages/           # One folder per feature
│           ├── stores/          # Zustand stores (one per feature)
│           └── lib/
│               └── science/     # XP engine, rewards, achievements, energy zones
```

---

## Database

SQLite database is stored at:
- macOS: `~/Library/Application Support/productivitapp/productivitapp.db`
- Windows: `%APPDATA%\productivitapp\productivitapp.db`
- Linux: `~/.config/productivitapp/productivitapp.db`

Migrations run automatically on startup. Schema includes:
`habits`, `habit_completions`, `pomodoro_sessions`, `tasks`, `journal_entries`, `energy_logs`, `badges`, `xp_log`, `boss_battles`, `daily_quests`, `loot_inventory`, `settings`

---

## Deployment

### GitHub Releases (recommended)

1. Update version in `package.json`
2. Tag and push:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. Set up GitHub Actions (`.github/workflows/release.yml`) — see Next Steps
4. electron-updater will auto-detect new releases on app start

### Manual distribution

After `npm run package`, distribute the files in `dist/`:
- macOS: `dist/ProductivitApp-1.0.0.dmg`
- Windows: `dist/ProductivitApp Setup 1.0.0.exe`
- Linux: `dist/ProductivitApp-1.0.0.AppImage`

---

## Changelog

### v1.1.0 — Feature Completeness Pass
- **Fix** — `damageBoss` now uses a static import (was a silent `require()` inside a try-catch, could silently swallow errors)
- **Habits** — Edit modal (reuses `HabitForm` with `initial` prop) + delete with Radix AlertDialog confirmation
- **Pomodoro** — Detailed session history list: label, timestamp, duration, XP earned, interruption count badge
- **Inventory** — New `/inventory` page: browse and activate earned loot drops; tier-colored cards (Common → Legendary)
- **Analytics** — Heatmap upgraded from HTML `title` to Radix UI `<Tooltip>` with styled date + count display
- **Sounds** — `playSound()` stub replaced with Web Audio API oscillator — rising arpeggio on level-up, chime on badge unlock
- **Tests** — 62 unit tests added (`vitest.config.ts` + tests for `xp.ts`, `rewards.ts`, `achievements.ts`); all passing

### v1.0.0 — Initial Release
Full app: habits, Pomodoro, tasks, morning ritual, evening reflection, energy tracker, analytics, gamification overlay (level-up / loot box / boss battle / badge unlock), system tray, notifications, onboarding.

---

## Next Steps

### Deploy

- [ ] **GitHub Actions CI** — create `.github/workflows/release.yml` to auto-build and publish on version tags (matrix: macOS + Windows + Linux)
- [ ] **App icons** — replace placeholder `resources/icon.png` with a real 512×512 icon; generate `.icns` (macOS) and `.ico` (Windows) from it
- [ ] **Code signing** — macOS requires an Apple Developer certificate + notarization for distribution outside the App Store; Windows benefits from a signed installer

### Features to add next

- [ ] **Streak recovery quest** — when a streak breaks, offer a "redemption quest" to soften the defeat
- [ ] **Ambient sound player** — Web Audio API nodes for rain, café, white noise layers (oscillator foundation is now in place in `GamificationOverlay.tsx`)
- [ ] **Export data** — CSV / JSON export of habits, sessions, and journal entries (Settings page)
- [ ] **Leaderboard** — personal Hall of Fame: best streaks, most XP in a week, highest level reached
- [ ] **Notification snooze** — "Remind me in 30 min" from the system tray context menu
- [ ] **Multiple habit frequencies** — weekday-only habits, custom day schedules (e.g. Mon/Wed/Fri)
- [ ] **Inventory power-up activation effects** — activating an XP boost loot item should write to `settings` and be read by the XP engine

### Polish

- [ ] **E2E tests** — `@playwright/test` with Electron launch; cover onboarding → habit completion → dashboard XP update flow
- [ ] **Accessibility audit** — all interactive elements need `aria-label`; verify keyboard navigation and focus rings
- [ ] **Light theme** — dark theme is complete; light theme CSS variables are defined but need visual QA pass
- [ ] **macOS traffic lights** — when `titleBarStyle: hiddenInset`, position custom window controls correctly

### Architecture improvements

- [ ] **IPC type safety** — generate a shared type map for all IPC channels to enforce payload types end-to-end (Zod schemas are partially in place)
- [ ] **Background sync** (optional) — if cloud sync is ever added, Zustand stores are already designed to be swapped from SQLite-backed to a remote API

---

## Contributing

1. Branch off `main`
2. Run `npm run dev` to start the dev server
3. Make changes — renderer HMR will update the UI instantly
4. Run `npm run build` to confirm the production build passes
5. Run `npm test` to confirm unit tests pass
6. Open a pull request against `main`
