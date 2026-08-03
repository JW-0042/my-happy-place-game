/**
 * Generates Windoors 11.3 Caretaker presentation deck with in-game screenshots.
 * Run: node docs/presentation/generate-pptx.mjs
 */
import pptxgen from "pptxgenjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const shot = (name) => path.join(root, "screenshots", name);
const out = path.join(__dirname, "Windoors-11.3-Caretaker.pptx");

const C = {
  bg: "0B1220",
  bgCard: "121A2B",
  bgSoft: "162033",
  white: "FFFFFF",
  muted: "94A3B8",
  cyan: "22D3EE",
  teal: "14B8A6",
  blue: "3B82F6",
  green: "22C55E",
  amber: "F59E0B",
  red: "F43F5E",
  line: "1E293B",
};

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "thimothybsirius";
pres.title = "Windoors 11.3 Caretaker";
pres.subject = "Grok AI browser game — documentation deck";

function bg(slide) {
  slide.background = { color: C.bg };
}

function footer(slide, page, total = 12) {
  slide.addText("Windoors 11.3 Caretaker  ·  Built with Grok AI", {
    x: 0.5,
    y: 5.28,
    w: 7.2,
    h: 0.28,
    fontSize: 10,
    fontFace: "Calibri",
    color: C.muted,
    margin: 0,
  });
  slide.addText(`${page} / ${total}`, {
    x: 8.5,
    y: 5.28,
    w: 1.0,
    h: 0.28,
    fontSize: 10,
    fontFace: "Calibri",
    color: C.muted,
    align: "right",
    margin: 0,
  });
}

function card(slide, x, y, w, h) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x,
    y,
    w,
    h,
    fill: { color: C.bgCard },
    rectRadius: 0.1,
    shadow: { type: "outer", color: "000000", blur: 10, offset: 2, angle: 135, opacity: 0.35 },
  });
}

// ——— 1 Title ———
{
  const s = pres.addSlide();
  bg(s);
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 0.18,
    h: 5.625,
    fill: { color: C.cyan },
  });
  s.addText("WINDOORS 11.3", {
    x: 0.7,
    y: 1.15,
    w: 8.5,
    h: 0.4,
    fontSize: 16,
    fontFace: "Consolas",
    color: C.cyan,
    bold: true,
    charSpacing: 4,
    margin: 0,
  });
  s.addText("Caretaker", {
    x: 0.7,
    y: 1.55,
    w: 8.5,
    h: 0.9,
    fontSize: 48,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  s.addText(
    "A satirical Windows maintenance survival game — built end-to-end with Grok AI.",
    {
      x: 0.7,
      y: 2.55,
      w: 8.2,
      h: 0.7,
      fontSize: 18,
      fontFace: "Calibri",
      color: C.muted,
      margin: 0,
    },
  );
  s.addText(
    [
      { text: "Play  ", options: { color: C.muted } },
      {
        text: "my-happy-place-game.grok.me",
        options: { color: C.cyan, bold: true },
      },
      { text: "   ·   ", options: { color: C.muted } },
      { text: "X  ", options: { color: C.muted } },
      {
        text: "@thimothybsirius",
        options: { color: C.blue, bold: true },
      },
    ],
    { x: 0.7, y: 3.5, w: 8.5, h: 0.4, fontSize: 16, fontFace: "Calibri", margin: 0 },
  );
  s.addText("GitHub  ·  JW-0042/my-happy-place-game", {
    x: 0.7,
    y: 4.7,
    w: 8,
    h: 0.3,
    fontSize: 12,
    fontFace: "Calibri",
    color: C.muted,
    margin: 0,
  });
}

// ——— 2 Agenda ———
{
  const s = pres.addSlide();
  bg(s);
  s.addText("Agenda", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.55,
    fontSize: 32,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  const items = [
    ["01", "Concept & why it exists"],
    ["02", "Gameplay loop & System Health"],
    ["03", "Maintenance tools showcase"],
    ["04", "Screenshots from the live game"],
    ["05", "Tech stack & architecture"],
    ["06", "Creator promotion & next steps"],
  ];
  items.forEach((row, i) => {
    const y = 1.1 + i * 0.62;
    card(s, 0.5, y, 9, 0.52);
    s.addText(row[0], {
      x: 0.7,
      y: y + 0.1,
      w: 0.8,
      h: 0.32,
      fontSize: 16,
      fontFace: "Consolas",
      color: C.cyan,
      bold: true,
      margin: 0,
    });
    s.addText(row[1], {
      x: 1.6,
      y: y + 0.1,
      w: 7.5,
      h: 0.32,
      fontSize: 16,
      fontFace: "Calibri",
      color: C.white,
      margin: 0,
    });
  });
  footer(s, 2);
}

// ——— 3 Concept ———
{
  const s = pres.addSlide();
  bg(s);
  s.addText("Concept", {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.5,
    fontSize: 32,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  s.addText("Windows maintenance trauma — as a game", {
    x: 0.5,
    y: 0.85,
    w: 9,
    h: 0.35,
    fontSize: 16,
    fontFace: "Calibri",
    color: C.cyan,
    margin: 0,
  });

  const boxes = [
    {
      t: "Parody OS",
      d: "Windoors 11.3 nods to Windows 3.11 and modern Win11 UI patterns.",
    },
    {
      t: "Survival loop",
      d: "System Health drains. Run tools or die on a classic BSOD.",
    },
    {
      t: "AI-shipped",
      d: "Full browser game vibe-coded with Grok — playable product, not a mock.",
    },
    {
      t: "Viral hook",
      d: "In-game credits + BSOD QR drive follows to @thimothybsirius.",
    },
  ];
  boxes.forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.7;
    const y = 1.4 + row * 1.55;
    card(s, x, y, 4.4, 1.4);
    s.addText(b.t, {
      x: x + 0.25,
      y: y + 0.25,
      w: 3.9,
      h: 0.35,
      fontSize: 18,
      fontFace: "Arial",
      color: C.white,
      bold: true,
      margin: 0,
    });
    s.addText(b.d, {
      x: x + 0.25,
      y: y + 0.7,
      w: 3.9,
      h: 0.5,
      fontSize: 13,
      fontFace: "Calibri",
      color: C.muted,
      margin: 0,
    });
  });
  footer(s, 3);
}

// ——— 4 How to play ———
{
  const s = pres.addSlide();
  bg(s);
  s.addText("How to play", {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.5,
    fontSize: 32,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  const steps = [
    ["1", "Watch System Health", "Top-right HUD. OPTIMAL → CRITICAL → 0%."],
    ["2", "Answer FIX NOW toasts", "Or open tools from desktop icons / taskbar."],
    ["3", "Run maintenance apps", "Complete phases to restore health."],
    ["4", "Risk the BIOS flash", "Lower drain tier — or roll a BSOD (32%)."],
    ["5", "Call Remote Support", "Pause drain; each call worsens future decay."],
    ["6", "Restart after BSOD", "QR + link → creator X profile."],
  ];
  steps.forEach((st, i) => {
    const y = 0.95 + i * 0.65;
    s.addShape(pres.shapes.OVAL, {
      x: 0.55,
      y: y + 0.05,
      w: 0.42,
      h: 0.42,
      fill: { color: C.cyan },
    });
    s.addText(st[0], {
      x: 0.55,
      y: y + 0.1,
      w: 0.42,
      h: 0.32,
      fontSize: 14,
      fontFace: "Arial",
      color: C.bg,
      bold: true,
      align: "center",
      margin: 0,
    });
    s.addText(st[1], {
      x: 1.2,
      y: y,
      w: 3.5,
      h: 0.5,
      fontSize: 16,
      fontFace: "Arial",
      color: C.white,
      bold: true,
      valign: "middle",
      margin: 0,
    });
    s.addText(st[2], {
      x: 4.8,
      y: y,
      w: 4.7,
      h: 0.5,
      fontSize: 14,
      fontFace: "Calibri",
      color: C.muted,
      valign: "middle",
      margin: 0,
    });
  });
  footer(s, 4);
}

// ——— 5 Desktop screenshot ———
{
  const s = pres.addSlide();
  bg(s);
  s.addText("Live game — Desktop", {
    x: 0.4,
    y: 0.2,
    w: 6,
    h: 0.4,
    fontSize: 24,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  s.addText("Windoors Security ready · System Health OPTIMAL", {
    x: 0.4,
    y: 0.55,
    w: 9,
    h: 0.28,
    fontSize: 12,
    fontFace: "Calibri",
    color: C.muted,
    margin: 0,
  });
  s.addImage({
    path: shot("windoors-desktop.png"),
    x: 0.45,
    y: 0.95,
    w: 9.1,
    h: 4.1,
    sizing: { type: "contain", w: 9.1, h: 4.1 },
  });
  footer(s, 5);
}

// ——— 6 Defrag + Update ———
{
  const s = pres.addSlide();
  bg(s);
  s.addText("Tools — Defrag & Update", {
    x: 0.4,
    y: 0.18,
    w: 9,
    h: 0.38,
    fontSize: 24,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  s.addImage({
    path: shot("windoors-defrag.png"),
    x: 0.35,
    y: 0.7,
    w: 4.6,
    h: 3.9,
    sizing: { type: "contain", w: 4.6, h: 3.9 },
  });
  s.addImage({
    path: shot("update-catalog.png"),
    x: 5.05,
    y: 0.7,
    w: 4.6,
    h: 3.9,
    sizing: { type: "contain", w: 4.6, h: 3.9 },
  });
  s.addText("Classic cluster map", {
    x: 0.35,
    y: 4.65,
    w: 4.6,
    h: 0.28,
    fontSize: 11,
    fontFace: "Calibri",
    color: C.amber,
    align: "center",
    margin: 0,
  });
  s.addText("Fake KB catalog · Patch Tuesday energy", {
    x: 5.05,
    y: 4.65,
    w: 4.6,
    h: 0.28,
    fontSize: 11,
    fontFace: "Calibri",
    color: C.blue,
    align: "center",
    margin: 0,
  });
  footer(s, 6);
}

// ——— 7 Check Disk + Remote Support ———
{
  const s = pres.addSlide();
  bg(s);
  s.addText("Tools — Check Disk & Remote Support", {
    x: 0.4,
    y: 0.18,
    w: 9,
    h: 0.38,
    fontSize: 22,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  s.addImage({
    path: shot("chkdsk-scandisk.png"),
    x: 0.35,
    y: 0.7,
    w: 4.6,
    h: 3.9,
    sizing: { type: "contain", w: 4.6, h: 3.9 },
  });
  s.addImage({
    path: shot("remote-support.png"),
    x: 5.05,
    y: 0.7,
    w: 4.6,
    h: 3.9,
    sizing: { type: "contain", w: 4.6, h: 3.9 },
  });
  s.addText("3½ Floppy (A:) · ScanDisk nostalgia", {
    x: 0.35,
    y: 4.65,
    w: 4.6,
    h: 0.28,
    fontSize: 11,
    fontFace: "Calibri",
    color: C.teal,
    align: "center",
    margin: 0,
  });
  s.addText("Pause drain · Grok + @thimothybsirius credit", {
    x: 5.05,
    y: 4.65,
    w: 4.6,
    h: 0.28,
    fontSize: 11,
    fontFace: "Calibri",
    color: C.cyan,
    align: "center",
    margin: 0,
  });
  footer(s, 7);
}

// ——— 8 BSOD ———
{
  const s = pres.addSlide();
  bg(s);
  s.addText("Game over — BSOD credit screen", {
    x: 0.4,
    y: 0.2,
    w: 9,
    h: 0.4,
    fontSize: 24,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  s.addImage({
    path: shot("bsod-credit.png"),
    x: 1.6,
    y: 0.75,
    w: 6.8,
    h: 3.85,
    sizing: { type: "contain", w: 6.8, h: 3.85 },
  });
  s.addText("QR + link → x.com/thimothybsirius  ·  Stop code: CRITICAL_PROCESS_DIED", {
    x: 0.5,
    y: 4.7,
    w: 9,
    h: 0.3,
    fontSize: 12,
    fontFace: "Calibri",
    color: C.muted,
    align: "center",
    margin: 0,
  });
  footer(s, 8);
}

// ——— 9 Mobile ———
{
  const s = pres.addSlide();
  bg(s);
  s.addText("Mobile-ready", {
    x: 0.5,
    y: 0.3,
    w: 5,
    h: 0.45,
    fontSize: 28,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  s.addText(
    "Responsive desktop: compact health bar, scrollable icons, full-screen windows on narrow viewports. Same survival loop on phone.",
    {
      x: 0.5,
      y: 0.9,
      w: 4.3,
      h: 1.4,
      fontSize: 15,
      fontFace: "Calibri",
      color: C.muted,
      margin: 0,
    },
  );
  const bullets = [
    "Touch-friendly FIX NOW toasts",
    "Taskbar + tray health badge",
    "BSOD credit on mobile too",
  ];
  bullets.forEach((t, i) => {
    s.addText(t, {
      x: 0.5,
      y: 2.5 + i * 0.45,
      w: 4.3,
      h: 0.4,
      fontSize: 14,
      fontFace: "Calibri",
      color: C.white,
      bullet: true,
      margin: 0,
    });
  });
  s.addImage({
    path: shot("windoors-mobile.png"),
    x: 5.1,
    y: 0.7,
    w: 4.4,
    h: 4.2,
    sizing: { type: "contain", w: 4.4, h: 4.2 },
  });
  footer(s, 9);
}

// ——— 10 Tech ———
{
  const s = pres.addSlide();
  bg(s);
  s.addText("Tech stack", {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.5,
    fontSize: 32,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  const tech = [
    ["React 19", "UI & game state"],
    ["TanStack Start", "Router + app shell"],
    ["Vite 8", "Dev & build"],
    ["Tailwind CSS 4", "Desktop chrome styling"],
    ["TypeScript", "Typed config & windows"],
    ["Grok / Vercel", "Hosted on *.grok.me"],
  ];
  tech.forEach((t, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 3.15;
    const y = 1.15 + row * 1.7;
    card(s, x, y, 2.95, 1.45);
    s.addText(t[0], {
      x: x + 0.2,
      y: y + 0.35,
      w: 2.55,
      h: 0.4,
      fontSize: 18,
      fontFace: "Arial",
      color: C.cyan,
      bold: true,
      margin: 0,
    });
    s.addText(t[1], {
      x: x + 0.2,
      y: y + 0.85,
      w: 2.55,
      h: 0.35,
      fontSize: 13,
      fontFace: "Calibri",
      color: C.muted,
      margin: 0,
    });
  });
  footer(s, 10);
}

// ——— 11 Tools table ———
{
  const s = pres.addSlide();
  bg(s);
  s.addText("All 10 maintenance apps", {
    x: 0.5,
    y: 0.25,
    w: 9,
    h: 0.45,
    fontSize: 28,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  const rows = [
    [
      { text: "App", options: { bold: true, color: C.cyan } },
      { text: "What it spoofs", options: { bold: true, color: C.cyan } },
    ],
    ["Windoors Update", "Patch Tuesday / KB catalog install"],
    ["Windoors Security", "Multi-phase threat scan"],
    ["Optimize Drives", "Classic defrag cluster map"],
    ["Disk Cleanup", "Temp file purge"],
    ["Check Disk", "ScanDisk · A:/C:/D:"],
    ["System File Checker", "Corrupt system files fantasy"],
    ["Driver Updater", "GPU / Audio / Chipset / WLAN"],
    ["Startup Optimizer", "Boot bloat cleanup"],
    ["BIOS (UEFI) Update", "High risk firmware · drain tier"],
    ["Remote Support", "Pause drain · creator credit"],
  ];
  s.addTable(rows, {
    x: 0.5,
    y: 0.85,
    w: 9,
    colW: [3.2, 5.8],
    border: [
      { pt: 0, color: C.bg },
      { pt: 0.5, color: C.line },
      { pt: 0, color: C.bg },
      { pt: 0, color: C.bg },
    ],
    fontFace: "Calibri",
    fontSize: 12,
    color: C.white,
    align: "left",
    valign: "middle",
  });
  footer(s, 11);
}

// ——— 12 CTA ———
{
  const s = pres.addSlide();
  bg(s);
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 0.18,
    h: 5.625,
    fill: { color: C.cyan },
  });
  s.addText("Play · Share · Follow", {
    x: 0.7,
    y: 1.2,
    w: 8.5,
    h: 0.7,
    fontSize: 36,
    fontFace: "Arial",
    color: C.white,
    bold: true,
    margin: 0,
  });
  s.addText("Survive the updates. Blame the BIOS. Tag the creator.", {
    x: 0.7,
    y: 2.0,
    w: 8.5,
    h: 0.45,
    fontSize: 16,
    fontFace: "Calibri",
    color: C.muted,
    margin: 0,
  });

  card(s, 0.7, 2.7, 8.5, 1.7);
  s.addText("https://my-happy-place-game.grok.me/", {
    x: 1.0,
    y: 2.95,
    w: 8,
    h: 0.4,
    fontSize: 20,
    fontFace: "Consolas",
    color: C.cyan,
    bold: true,
    margin: 0,
  });
  s.addText("https://x.com/thimothybsirius", {
    x: 1.0,
    y: 3.45,
    w: 8,
    h: 0.35,
    fontSize: 18,
    fontFace: "Consolas",
    color: C.blue,
    margin: 0,
  });
  s.addText("github.com/JW-0042/my-happy-place-game", {
    x: 1.0,
    y: 3.9,
    w: 8,
    h: 0.3,
    fontSize: 14,
    fontFace: "Calibri",
    color: C.muted,
    margin: 0,
  });

  s.addText("Built with Grok AI  ·  Not affiliated with Microsoft", {
    x: 0.7,
    y: 4.85,
    w: 8.5,
    h: 0.3,
    fontSize: 12,
    fontFace: "Calibri",
    color: C.muted,
    margin: 0,
  });
}

await pres.writeFile({ fileName: out });
console.log("Wrote", out);
