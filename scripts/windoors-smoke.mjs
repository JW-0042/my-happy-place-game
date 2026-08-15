import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const shot = process.argv[3] || "/workspace/screenshots/windoors-smoke.png";

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(4500);

const go = page.getByRole("button", { name: /Let's go/i });
if (await go.count()) await go.click().catch(() => {});
const cont = page.getByRole("button", { name: "Continue" });
if (await cont.count()) await cont.click().catch(() => {});

await page.getByRole("button", { name: "Start menu" }).click({ force: true });
await page.waitForTimeout(200);
const body = await page.locator("body").innerText();
if (!body.includes("Sleep") || !body.includes("Reset PC")) {
  throw new Error("Start menu missing Sleep/Reset PC");
}
await page.getByRole("button", { name: "Sleep" }).click();
await page.waitForTimeout(300);
if (!(await page.locator("body").innerText()).includes("Sleeping")) {
  throw new Error("Sleep overlay missing");
}
const saved = await page.evaluate(() => !!localStorage.getItem("windoors.sleep.v1"));
if (!saved) throw new Error("Sleep snapshot not written");
await page.getByRole("button", { name: "Wake" }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: shot });
if (errors.length) throw new Error("page errors: " + errors.join(" | "));
console.log("windoors-smoke ok");
await browser.close();
