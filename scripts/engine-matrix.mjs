/**
 * Overlay engine-matrix smoke — drives the built Storybook in real
 * Chromes across the anchor-positioning support matrix:
 *
 *   current Chrome        native engine (CSS anchor positioning)
 *   Chrome 124 (pinned)   genuinely UNSUPPORTED engine — anchor
 *                         positioning shipped in 125, so CSS.supports
 *                         is natively false and the channel fallback
 *                         carries everything (no stubs involved)
 *
 * Checks per engine: tear-off (static target) drags + tears; the
 * Anchored story's top↔bottom re-pin morphs with ZERO direction
 * reversals (the mid-glide position-area flip class of bug).
 *
 * Usage:
 *   pnpm build:storybook
 *   npx @puppeteer/browsers install chrome@124.0.6367.207   # once
 *   pnpm test:engines
 */
import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const PORT = 6099;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = new URL("..", import.meta.url).pathname;
const STATIC = join(ROOT, "storybook", "storybook-static");

const OLD_CHROME = join(
  ROOT,
  "chrome",
  "mac_arm-124.0.6367.207",
  "chrome-mac-arm64",
  "Google Chrome for Testing.app",
  "Contents",
  "MacOS",
  "Google Chrome for Testing",
);
const CURRENT_CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function drive(name, executablePath) {
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-first-run", "--window-size=1280,900"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    await page.goto(`${BASE}/iframe.html?id=ui-overlay--tear-off&viewMode=story`, {
      waitUntil: "networkidle0",
    });
    const support = await page.evaluate(() =>
      CSS.supports("anchor-name: --x") && CSS.supports("position-area: block-end"),
    );
    const tearOff = await page.evaluate(async () => {
      document.querySelector("[popovertarget]").click();
      await new Promise((r) => setTimeout(r, 500));
      const panel = document.querySelector("dialog.x-overlay");
      const a = document.querySelector(".x-overlay-anchor");
      const engine = panel.getAttribute("data-anchor") ?? "channel";
      const opts = (x, y) => ({ clientX: x, clientY: y, button: 0, bubbles: true, pointerId: 1 });
      // Tear-off engages from the move handle (its data-placement="move");
      // the pointer events carry explicit coords, so the drag delta is
      // unchanged from pressing the frame.
      const move = panel.querySelector('.x-handle[data-placement="move"]');
      move.dispatchEvent(new PointerEvent("pointerdown", opts(300, 300)));
      panel.dispatchEvent(new PointerEvent("pointermove", opts(420, 380)));
      panel.dispatchEvent(new PointerEvent("pointerup", opts(420, 380)));
      await new Promise((r) => setTimeout(r, 100));
      return { engine, torn: !a.hasAttribute("data-follow"), left: a.style.left };
    });

    await page.goto(`${BASE}/iframe.html?id=ui-overlay--anchored&viewMode=story`, {
      waitUntil: "networkidle0",
    });
    const anchored = await page.evaluate(async () => {
      const byLabel = (l) =>
        [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === l);
      const pop = document.querySelector("dialog.x-overlay");
      const record = async (from, to) => {
        byLabel(from).click();
        await new Promise((r) => setTimeout(r, 600));
        const frames = [];
        let rec = true;
        const tick = () => {
          frames.push(Math.round(pop.getBoundingClientRect().top));
          if (rec) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        byLabel(to).click();
        await new Promise((r) => setTimeout(r, 800));
        rec = false;
        let reversals = 0;
        for (let i = 2; i < frames.length; i++) {
          const d1 = frames[i - 1] - frames[i - 2];
          const d2 = frames[i] - frames[i - 1];
          if (d1 !== 0 && d2 !== 0 && Math.sign(d1) !== Math.sign(d2) && Math.abs(d2) > 80)
            reversals++;
        }
        return reversals;
      };
      return {
        engine: pop.getAttribute("data-anchor") ?? "channel",
        reversalsTopToBottom: await record("Top start", "Bottom start"),
        reversalsBottomToTop: await record("Bottom start", "Top start"),
      };
    });

    const pass =
      tearOff.torn &&
      tearOff.left === "168px" &&
      anchored.engine === "channel" && // reactive target → channel in EVERY tier
      anchored.reversalsTopToBottom === 0 &&
      anchored.reversalsBottomToTop === 0;
    console.log(`\n[${name}] anchor-positioning support: ${support}`);
    console.log(`  tear-off:  engine=${tearOff.engine} torn=${tearOff.torn} left=${tearOff.left}`);
    console.log(`  anchored:  engine=${anchored.engine} reversals=${anchored.reversalsTopToBottom}/${anchored.reversalsBottomToTop}`);
    console.log(`  ${pass ? "PASS" : "FAIL"}`);
    return pass;
  } finally {
    await browser.close();
  }
}

if (!existsSync(STATIC)) {
  console.error("storybook-static missing — run `pnpm build:storybook` first.");
  process.exit(1);
}

const server = spawn("npx", ["http-server", STATIC, "-p", String(PORT), "--silent"], {
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 2500));

try {
  let ok = true;
  if (existsSync(CURRENT_CHROME)) ok = (await drive("current Chrome (native)", CURRENT_CHROME)) && ok;
  else console.log("current Chrome not found — skipping the native tier");
  if (existsSync(OLD_CHROME)) ok = (await drive("Chrome 124 (unsupported)", OLD_CHROME)) && ok;
  else {
    console.log(
      "\nChrome 124 not installed — for the genuinely-unsupported tier run:\n" +
        "  npx @puppeteer/browsers install chrome@124.0.6367.207",
    );
  }
  process.exitCode = ok ? 0 : 1;
} finally {
  server.kill();
}
