import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";
import { exerciseHud } from "./browser-smoke-hud.mjs";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = await preview({
  configFile: path.join(webDir, "vite.config.ts"),
  root: webDir,
  preview: { host: "127.0.0.1", port: 0, strictPort: false },
});
const address = server.httpServer.address();
if (!address || typeof address === "string") throw new Error("Vite preview did not expose a TCP address.");
const baseUrl = `http://127.0.0.1:${address.port}/`;
const browser = await chromium.launch({ headless: true });
const errors = [];

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const manifestUrl = new URL("manifest.webmanifest", baseUrl);
  const manifestResponse = await page.request.get(manifestUrl.href);
  assert.equal(manifestResponse.status(), 200, "the PWA manifest must be served");
  const manifest = await manifestResponse.json();
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "any");
  assert.equal(new URL(manifest.start_url, manifestUrl).pathname, new URL(baseUrl).pathname);
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"), "the PWA/TWA manifest must provide a 512px icon");
  assert.equal(new URL(manifest.scope, manifestUrl).pathname, new URL(baseUrl).pathname);
  for (const icon of manifest.icons) {
    assert.equal((await page.request.get(new URL(icon.src, manifestUrl).href)).status(), 200, `${icon.src} must be served`);
  }
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.clear());
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#app .screen").waitFor();
  await page.locator('.start-menu[data-page="main"] [aria-label="CAMPAIGN"]').waitFor({ timeout: 30_000 });
  await page.setViewportSize({ width: 844, height: 390 });
  const landscapeScreen = await page.locator("#app .screen").boundingBox();
  assert.ok(landscapeScreen && landscapeScreen.width > 0 && landscapeScreen.height > 0, "the game screen must be laid out in mobile landscape");
  await page.setViewportSize({ width: 390, height: 844 });

  assert.equal(await page.title(), "Prehistoric Tribes Web");
  const initialScreen = await page.locator("#app .screen").boundingBox();
  assert.ok(initialScreen && initialScreen.width > 0 && initialScreen.height > 0, "the game screen must be laid out on mobile");

  await page.locator('.start-menu[data-page="main"] [aria-label="SETTINGS"]').click();
  const settings = page.locator("dialog.settings-dialog");
  await settings.waitFor({ state: "visible" });
  await settings.locator('.settings-tab[data-tab="saves"]').click();
  assert.match(await settings.innerText(), /Export JSON/);
  assert.match(await settings.innerText(), /Import JSON/);
  await settings.locator('[data-act="unlock"]').click();
  const exportReady = page.waitForEvent("download");
  await settings.locator('[data-act="export"]').click();
  const exportedSave = await exportReady;
  assert.equal(exportedSave.suggestedFilename(), "prehistoric-tribes-save.json");
  const exportPath = await exportedSave.path();
  await settings.locator('input[name="importFile"]').setInputFiles(exportPath);
  await settings.locator(".settings-save-status").filter({ hasText: "Save backup restored" }).waitFor();
  await settings.locator(".settings-close-x").click();

  await page.locator('.start-menu[data-page="main"] [aria-label="CUSTOM"]').click();
  if (await page.locator(".start-chapter-unlock").count()) await page.locator(".start-chapter-unlock").click();
  await page.locator('.start-menu[data-page="difficulty"] [aria-label="EASY"]').click();
  await page.locator(".start-map").first().click();
  await exerciseHud(page);

  await page.setViewportSize({ width: 1280, height: 800 });
  const desktopScreen = await page.locator("#app .screen").boundingBox();
  assert.ok(desktopScreen && desktopScreen.width > 0 && desktopScreen.height > 0, "the game screen must remain laid out on desktop");
  assert.deepEqual(errors, [], "browser runtime must not raise uncaught page errors");
  console.log("Browser smoke passed: PWA manifest/icons, startup, settings export/import, custom map, build placement/back, villager panel open/close, rally target selection/confirmation, trophy cabinet filters, pause menu open/close, slot save/load, and mobile/desktop layout.");
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
