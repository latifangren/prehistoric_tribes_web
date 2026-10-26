import assert from "node:assert/strict";

export async function exerciseTrophyCabinet(page) {
  await page.locator('.hud-menu-item[aria-label="Trophies"]').click();
  const trophies = page.locator("dialog.trophy-dialog");
  await trophies.waitFor({ state: "visible" });
  assert.equal(await trophies.locator(".trophy-card").count(), 14, "the trophy cabinet must render every achievement");
  await trophies.locator('[data-filter="unlocked"]').click();
  const unlockedCount = await trophies.locator(".trophy-card").count();
  assert.ok(unlockedCount > 0 && unlockedCount < 14, "the unlocked filter must show only the achievements earned in this game");
  await trophies.locator('[data-filter="locked"]').click();
  assert.equal(await trophies.locator(".trophy-card").count(), 14 - unlockedCount, "the locked filter must show the remaining achievements");
  await trophies.locator('[data-filter="all"]').click();
  assert.equal(await trophies.locator(".trophy-card").count(), 14, "the all filter must restore every achievement");
  await trophies.locator(".trophy-close-btn").click();
}
