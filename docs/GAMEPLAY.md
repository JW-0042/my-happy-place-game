# Gameplay design — Windoors 11.3 Caretaker

## Premise

You are the caretaker of **Windoors 11.3**, a satirical desktop OS. The machine is always falling apart. Your only job: keep **System Health** above zero by running maintenance tools before notifications expire and passive decay wins.

There is no traditional “level select.” The entire game is one endless desktop session until BSOD or voluntary restart.

## Core loop

```
passive drain + ignored toasts
        ↓
  System Health ↓
        ↓
 open tool → run phases → complete → health restored
        ↓
  (optional) BIOS lowers drain tier
  (optional) Remote Support freezes drain
        ↓
  Health hits 0 → BSOD → Restart
```

## System Health

| State | Approx. range | UI label |
|-------|---------------|----------|
| Healthy | > 75 | **OPTIMAL** (green/cyan) |
| Warning | 40–75 | **NEEDS ATTENTION** (amber) |
| Danger | ≤ 40 | **CRITICAL** (red, pulse styling) |
| Dead | 0 | **BSOD** game-over screen |

### Passive drain

Drain runs roughly once per second while the game is active (unless Remote Support freezes it).

Configured base rates by **drain level** (`src/lib/windoors/config.ts`):

| Drain level | Rate / tick | How you reach it |
|-------------|-------------|------------------|
| **3** (default start) | `0.28` | Fresh boot |
| **2** | `0.18` | Successful BIOS flash (step down) |
| **1** | `0.09` | Another successful BIOS flash |

**Remote Support** adds a permanent **boost** to drain after each call (`SUPPORT_DRAIN_BUMP = 0.035`, stacked, capped). While the support channel is open, passive drain is **paused**.

### Health recovery & penalties

- Completing a maintenance tool restores health (tool-specific timing).
- **Cancelling** a running tool hurts health.
- Ignoring pop-up tasks lets passive drain (and urgency) win.
- **BIOS flash** can BSOD instantly with probability **`BIOS_BSOD_CHANCE = 0.32`**.

## Desktop chrome

Parody of a modern desktop:

- **Wallpaper** — deep blue gradient “Windoors” desktop  
- **Icon grid** — all maintenance apps  
- **Taskbar** — Start-style button, search (“Search maintenance tools…”), pinned app icons, tray (Wi‑Fi, volume, clock, health badge)  
- **System Health card** — top-right (desktop) or top bar (mobile)  
- **Toast notifications** — bottom-right “FIX NOW” prompts  
- **Draggable windows** — z-order, close, cancel, progress phases  

## Tools (apps)

Defined in `TASKS` (`config.ts`):

| Key | Name | Base duration (ms) | Phases (examples) |
|-----|------|--------------------|-------------------|
| `update` | Windoors Update | 52000 | Checking → Downloading → Installing → Finalizing |
| `scan` | Windoors Security | 34000 | Memory → Files → Registry → Threats |
| `defrag` | Optimize Drives | 68000 | Analyzing → Defragmenting → Optimizing → Done |
| `cleanup` | Disk Cleanup | 17000 | Calculating → Cleaning → Removing |
| `chkdsk` | Check Disk | 29000 | Index → Files → Security → Recovery → Complete |
| `sfc` | System File Checker | 43000 | Scanning → Verifying → Repairing |
| `drivers` | Driver Updater | 31000 | Scanning → Downloading → Installing |
| `startup` | Startup Optimizer | 15000 | Analyzing → Disabling → Optimizing |
| `bios` | BIOS (UEFI) Update | 48000 | Validating → Erasing SPI → Flashing → Verifying capsule |
| `support` | Remote Support | instant | Connected / session UI |

Durations get light runtime jitter so runs don’t feel identical.

### Windoors Update

`src/lib/windoors/updates.ts` provides multiple **catalog scenarios** (Patch Tuesday, preview, feature 26H2, .NET stack, Defender defs, out-of-band, etc.) with fake KB IDs and package sizes. UI flow:

1. Needs check / check for updates  
2. Catalog list ready  
3. Download & install packages one by one  
4. Complete  

### Optimize Drives (defrag)

`defrag-map.tsx` renders a **classic cluster grid** (free / data / optimized / system / unmovable / reading / writing) with animated read/write heads during the run.

### Check Disk

Drive picker (3½ Floppy **A:**, Local Disk **C:**, New volume **D:**), standard vs thorough, “Automatically fix errors,” and ScanDisk-style log lines.

### Remote Support

- Freezes passive health drain  
- Credits **Grok AI** and **x.com/thimothybsirius**  
- Each lifetime session recalibrates decay (drain boost)  
- Marketing surface for the creator profile  

### BIOS (UEFI) Update

High-tension tool:

- Long multi-phase flash  
- On success: drain level may improve (3 → 2 → 1)  
- On bad roll: immediate BSOD  

## Game over (BSOD)

When health ≤ 0 (or BIOS fails hard):

- Full-screen blue **“Your PC ran into a problem…”** parody  
- Explains that maintenance was ignored / health hit 0  
- **RESTART PC** button  
- Creator credit: **Created with GROK AI by x.com/thimothybsirius**  
- QR code → creator X profile  
- Stop code e.g. `CRITICAL_PROCESS_DIED`  

## Mobile

Responsive layout (`useIsNarrow`):

- Compact full-width health bar  
- Scrollable icon grid  
- Windows sized for small viewports  
- BSOD credit still shows creator link  

See `screenshots/windoors-mobile.png`, `mobile-*.png`.

## Design goals

1. **Recognition humor** — real Windows maintenance tropes (KB numbers, defrag map, floppy A:, BSOD).  
2. **Light panic** — overlapping windows + toasts without requiring twitch skill.  
3. **Shareability** — BSOD + QR + Remote Support drive follows to X.  
4. **Showcase AI shipping** — complete playable product from Grok workflow.  

## Balancing notes (for modders)

All primary knobs live in `src/lib/windoors/config.ts`:

- `DRAIN_BY_LEVEL`  
- `SUPPORT_DRAIN_BUMP`  
- `BIOS_BSOD_CHANCE`  
- Per-task `duration` and `phases`  
- `CREATOR_X_URL` / `CREATOR_X_HANDLE`  

Update package flavor text: `src/lib/windoors/updates.ts`.
