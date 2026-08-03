# Screenshot gallery

All images are real captures of the running game (desktop and mobile).  
Live play: [https://my-happy-place-game.grok.me/](https://my-happy-place-game.grok.me/)

---

## Desktop experience

### Boot / start branding
| File | Description |
|------|-------------|
| `windoors-logo-start.png` | Start experience with Windoors branding |
| `windoors-start-logo.png` | Start logo variant |
| `windoors-start-white-logo.png` | Light logo on start surface |
| `windoors-logo-boot.png` | Compact boot logo |
| `windoors-boot.png` | Early boot frame |

### Hydrated desktop
| File | Description |
|------|-------------|
| `windoors-hydrated.png` | Full desktop after client hydrate |
| `windoors-desktop.png` | **Windoors Security** ready window + System Health 99 OPTIMAL |
| `windoors-running.png` | Active multi-window / task session |
| `window-center.png` | Centered maintenance window layout |
| `window-resize.png` | Window sizing / stacking |

![Desktop — Security](../screenshots/windoors-desktop.png)

### Maintenance tools
| File | Description |
|------|-------------|
| `windoors-defrag.png` | **Optimize Drives** classic cluster map (Analyzing ~3%) |
| `update-catalog.png` | **Windoors Update** catalog (OOB security packages) |
| `update-install-bug.png` | Update install state (debug capture) |
| `update-install-fixed.png` | Update install state (fixed UI) |
| `chkdsk-scandisk.png` | **Check Disk** with 3½ Floppy (A:) + ScanDisk log |
| `security-blocked.png` | Security tool / blocked threat presentation |
| `bios-and-drain.png` | BIOS tool with drain indicators |
| `remote-support.png` | **Remote Support** session — Grok + creator credit, drain paused |
| `activate-credit.png` | Activation / credit UI capture |

![Defrag map](../screenshots/windoors-defrag.png)

![Update catalog](../screenshots/update-catalog.png)

![Check Disk](../screenshots/chkdsk-scandisk.png)

![Remote Support](../screenshots/remote-support.png)

### Game over
| File | Description |
|------|-------------|
| `bsod-credit.png` | Desktop **BSOD** with QR → @thimothybsirius |
| `bsod-credit-mobile.png` | Mobile BSOD credit layout |

![BSOD](../screenshots/bsod-credit.png)

---

## Mobile

| File | Description |
|------|-------------|
| `windoors-mobile.png` | Mobile full desktop chrome |
| `mobile-desktop.png` | Mobile desktop icons |
| `mobile-icons.png` | Icon grid focus |
| `mobile-window.png` | Open window on small screen |
| `mobile-defrag.png` | Defrag on mobile |
| `mobile-before.png` | Pre-layout comparison capture |

![Mobile](../screenshots/windoors-mobile.png)

---

## How screenshots were produced

Captured during development and QA of the Grok-built game (browser viewport captures of the live UI). Filenames are stable so README and the PowerPoint deck can deep-link them.

To refresh captures locally:

```bash
npm run dev
# open http://localhost:8080
# interact → capture with browser or Playwright
```

Optional automation entry points: `scripts/browser-smoke.mjs`, `scripts/preview-thumbnail.mjs` (workspace tooling).
