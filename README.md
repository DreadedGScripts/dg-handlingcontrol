<div align="center">

# ⚙️ DG Handling Control

### In-Game Vehicle Handling Editor for FiveM

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Framework](https://img.shields.io/badge/framework-Standalone-brightgreen.svg)

**Live-preview handling editor with guided tuning, smart presets, locking, diffing, and class-aware hints — no framework required**

[Overview](#-overview) • [Features](#-features) • [Installation](#-installation) • [Configuration](#%EF%B8%8F-configuration) • [Events](#-events) • [Ecosystem](#-dg-ecosystem)

---

</div>

## 📋 Overview

**DG Handling Control** is a free, fully standalone in-game vehicle handling editor for FiveM. Authorised players open a responsive full-screen NUI panel that reads live handling values from the vehicle they are sitting in, lets them tune every field in real time, and saves presets permanently to disk — auto-applied every time any player enters that vehicle model.

A built-in **step-by-step tuning guide** walks through all 8 tuning phases in order, highlights the relevant fields on-screen, and explains exactly what each setting does and how it affects the car. Every field also shows a detailed hover **tooltip** with a full description and a quick ↑/↓ effect summary.

The current build adds a much broader quality-of-life workflow: searchable fields, per-field reset and lock controls, undo/redo history, side-by-side diffing, profile-vs-profile comparison, a large built-in preset library, non-blocking import/export and XML tools, live vehicle upgrade readouts, a theme/settings panel with Slate as the default theme, and an AI benchmark course that teleports the vehicle to LSIA for repeatable testing.

| Property | Value |
|----------|-------|
| **Resource Name** | `dg-handlingcontrol` |
| **Version** | `1.0.0` |
| **License** | MIT (Free) |
| **Framework Support** | **100% Standalone** — no QBCore, ESX, Qbox, or ox required |
| **Persistence** | JSON file saved to `data/saved_handlings.json` |
| **Permissions** | FiveM native ace permissions |
| **NUI** | Responsive full-screen multi-theme panel (FiveM NUI / CEF) |

---

## ✨ Features

- **100% standalone** — zero framework dependencies; works on any FiveM server out of the box
- **50 editable handling fields** across 7 categories: Engine, Brakes, Steering, Traction, Suspension, Damage, Misc
- **Live preview** — sliders and inputs apply handling to the vehicle in real time while the panel is open
- **Step-by-step tuning guide** — 8-step wizard (📋 GUIDE button) that walks through every phase in order:
  1. Engine Basics — mass, drive force, top speed
  2. Drivetrain & Gearing — RWD/AWD/FWD bias, gears, inertia, clutch rates
  3. Brakes — brake force, front/rear bias, handbrake
  4. Steering — lock angle and ratio
  5. Traction Curve — grip, slide behaviour, slip angle, wheelspin
  6. Suspension Springs & Ride Height
  7. Dampers & Roll Control — compression/rebound damping, anti-roll bars
  8. Damage Multipliers + Final Save
- **Hover tooltips** — every field shows a full plain-English description + ↑/↓ effect summary on mouse-over
- **Guide highlights** — wizard automatically switches tabs and glows the relevant fields blue with a pulsing animation
- **Clickable field references** in the guide jump directly to the relevant card
- **Search/filter bar** — quickly find fields by name, key, category, description, or tip text
- **Per-field reset + delta** — reset one field to original and instantly see how far each value is from stock
- **Field locking** — lock specific fields so preset loads/imports/resets/refreshes do not overwrite them
- **Undo / Redo history** — walk backward and forward through tuning changes in-session
- **Side-by-side diff view** — compare current tuning against selected preset (or stock/original when none selected)
- **Preset system** — save named handling presets per vehicle model, load and delete from a dropdown
- **Large built-in preset library** — 27 one-click starter profiles covering race, time attack, drag, multiple drift styles, off-road, rally, daily, pursuit, armored, towing, and aircraft tuning
- **Import / Export modal** — non-blocking JSON/Base64 workflow for sharing presets (plus XML export for handling.meta)
- **Profile-vs-profile comparison** — load preset A vs preset B directly into the DIFF panel for side-by-side comparison without applying either one
- **Vehicle class auto-detect** — class label + class-aware tuning focus hint shown in header
- **Upgrade detection in header** — live summary for engine, brakes, transmission, suspension, armor, and turbo state
- **Theme/settings panel** — 14 built-in UI themes with **Slate** as the default, plus persistent theme selection
- **Responsive layout improvements** — settings panel, toolbar, export tools, and modals are adjusted for different resolutions and smaller screens
- **Benchmark mode** — one-click LSIA runway benchmark with AI driving line, hard turns, handbrake turns, route blip, 0-100 timing, and braking-distance results
- **Auto-apply on enter** — saved presets are silently re-applied whenever any player enters that vehicle model (GTA resets handling on stream events)
- **Permission system** — ace-permission gated; toggle `Config.RequirePermission` for open access or locked-down admin-only use
- **Ace deny logging** — server logs permission denials with player name to console
- **Disk persistence** — presets survive server restarts; stored in `data/saved_handlings.json`
- **Broadcast on save** — saved presets are immediately pushed to all connected clients so Auto-Apply works server-wide without a restart
- **Escape / ✕ CLOSE** — panel closes instantly; NUI focus released immediately, not after a server round-trip

---

## 📦 Installation

1. Drop `dg-handlingcontrol` into your resources folder
2. Add to your `server.cfg`:

```cfg
ensure dg-handlingcontrol
```

3. *(Optional)* Grant the ace permission to your admin group:

```cfg
add_ace group.admin dg-handlingcontrol.use allow
```

> By default `Config.RequirePermission = false` so **all players** can open the editor. Set it to `true` once you have ace permissions configured.

That's it — no items, no database, no framework setup required.

---

## ⚙️ Configuration

All behaviour is tunable in `config.lua`. No code changes required.

| Setting | Default | Description |
|---------|---------|-------------|
| `Config.OpenCommand` | `'handlingeditor'` | Chat command to open the editor |
| `Config.AcePermission` | `'dg-handlingcontrol.use'` | Ace node checked when `RequirePermission` is `true` |
| `Config.RequirePermission` | `false` | `false` = open to all players; `true` = ace-gated |
| `Config.SaveFile` | `'data/saved_handlings.json'` | Path to the preset storage file (relative to resource root) |
| `Config.LivePreview` | `true` | Apply changes to the vehicle in real time while tuning |
| `Config.AutoApplyOnEnter` | `true` | Re-apply saved preset when entering a vehicle model |
| `Config.ReapplyInterval` | `2000` | How often (ms) to re-apply handling while in a vehicle |

### Locking to admins only

```lua
-- config.lua
Config.RequirePermission = true
Config.AcePermission     = 'dg-handlingcontrol.use'
```

```cfg
# server.cfg
add_ace group.admin dg-handlingcontrol.use allow
```

---

## 🎮 Usage

1. Get in a vehicle
2. Type `/handlingeditor` in chat (or your configured command)
3. The panel opens showing all live handling values for that vehicle
4. Use the **📋 GUIDE** button for a step-by-step walk-through
5. Use the search bar to jump to the exact field you want
6. Adjust fields using sliders, number inputs, or the **−/+** step buttons
7. Lock fields you want preserved with the lock icon on each card
8. Use **↶ UNDO / ↷ REDO** while tuning to quickly revert mistakes
9. Use **⇆ DIFF** to compare current setup against selected preset or stock values
10. Hover any field for a detailed tooltip explaining what it does
11. Click **💾 SAVE** to persist the preset — it will auto-apply server-wide from then on
12. Use **EXPORT / IMPORT** to share presets, and **XML** for handling.meta export
13. Use **⚙ SETTINGS** to switch themes; Slate is the default theme
14. Use **BENCHMARK** to launch the LSIA runway test and review 0-100 / braking metrics
15. Use **COMPARE PROFILES** to diff two saved or built-in presets against each other
16. Press **Escape** or click **✕ CLOSE** to exit

### Suggested tuning flow

1. Open panel in target vehicle and review class hint in the header
2. Load a built-in baseline closest to your goal from the larger preset library
3. Lock critical fields before testing alternate presets
4. Tune one category at a time using guide steps, upgrade readout, and diff view
5. Use benchmark mode when you want repeatable before/after testing
6. Save with a clear preset name and export if you want to share

### Guide Tabs (manual navigation)

| Tab | What you tune |
|-----|---------------|
| **Engine** | Mass, drag, downforce, drive bias, gears, torque, inertia, clutch, top speed |
| **Brakes** | Brake force, front/rear bias, handbrake |
| **Steering** | Steering lock angle, lock ratio |
| **Traction** | Grip curve, slide behaviour, slip angle, wheelspin, traction bias |
| **Suspension** | Spring force, damping, limits, ride height, anti-roll bars, roll centre |
| **Damage** | Collision, weapon, deformation, engine damage multipliers |
| **Misc** | Fuel tank, oil volume, seat offsets, monetary value |

---

## 📡 Events

### Server → Client

```lua
-- Grants the requesting player permission to open the editor
TriggerClientEvent('dg-handlingcontrol:client:openGranted', src)

-- Broadcasts all saved presets to all clients (fired after every save/delete)
TriggerClientEvent('dg-handlingcontrol:client:loadSaved', -1, savedHandlings)
```

### Client → Server (net events)

```lua
-- Request to open the panel (server checks ace permission)
TriggerServerEvent('dg-handlingcontrol:server:requestOpen')

-- Request current player's saved presets
TriggerServerEvent('dg-handlingcontrol:server:requestSaved')

-- Save a named handling preset for a model key
TriggerServerEvent('dg-handlingcontrol:server:save', presetName, modelKey, handlingTable)

-- Delete a named preset
TriggerServerEvent('dg-handlingcontrol:server:delete', presetName)
```

### NUI Callbacks (client ↔ HTML)

| Callback | Description |
|----------|-------------|
| `applyField` | Live-apply a single field change to the vehicle |
| `applyAll` | Apply a full handling snapshot to the vehicle |
| `readFields` | Read all current live values from the vehicle |
| `getVehicleUpgrades` | Read current installed upgrade levels and turbo state |
| `saveHandling` | Persist a handling preset via server |
| `deleteHandling` | Delete a saved preset via server |
| `resetToDefault` | Re-read GTA default values for the current vehicle |
| `benchmarkStart` | Start the LSIA benchmark course |
| `benchmarkStop` | Stop the active benchmark run |
| `close` | Release NUI focus and close the panel |

---

### Preset storage format

Saved presets are keyed by preset name. Each entry stores `_modelKey` internally so you can keep multiple named presets for the same vehicle model.

```json
{
  "Drift S15": {
    "_modelKey": "-1041692462",
    "fInitialDriveForce": 0.39,
    "fSteeringLock": 62.0
  }
}
```

---

## 🔒 Security

- All saves and deletes are **server-side permission-checked** — clients cannot bypass the ace gate by calling server events directly
- Saved values are **sanitised on the server** — only numeric values with string keys are accepted; anything else is silently dropped
- `IsPlayerAceAllowed` is called **server-side only** (it is a server-only native; calling it client-side causes a script error — this is handled correctly)
- NUI fetch uses the cached `GetParentResourceName()` value to prevent prototype pollution

---

## 💬 Support & Contact

For questions, bug reports, or suggestions, join our Discord:

**[Dreaded Scripts Discord](https://discord.gg/ZNJ7tJ26Sn)**

You can also reach out directly to the author: `DrahMah`

---

## 🧪 Beta Testing

Interested in testing an admin menu currently in development? I need a server with some players to help fine-tune detection thresholds. You'll receive an escrowed version to install, I'll join and make backend fixes live, and you'll keep the package permanently. Join the Discord and PM DrahMah!

**[DG AdminMenu Docs & Beta Info](https://github.com/DreadedGScripts/dg-adminmenu-docs)**

---

## 🌐 DG Ecosystem

DG Handling Control is part of the free DG Scripts ecosystem:

- [`dg-bridge`](https://github.com/DreadedGScripts/dg-bridge) — framework abstraction (QBCore / ESX / standalone payout, notifications, inventory)
- [`dg-notifications`](https://github.com/DreadedGScripts/dg-notifications) — enhanced styled notifications
- [`dg-adminmenu`](https://github.com/DreadedGScripts/dg-adminmenu-docs) — admin panel with reporting and server management tools
- [`dg-discord`](https://github.com/DreadedGScripts/dg-discord) — Discord bot integration for logging and automation
- [`dg-waterRescue`](https://github.com/DreadedGScripts/dg-waterRescue) — realistic AI maritime rescue system
- [`dg-trucking`](https://github.com/DreadedGScripts/dg-trucking) — CDL-gated civilian trucking job
