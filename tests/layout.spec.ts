import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
});

test("Dream Maker's left form keeps normal control sizes even when the dream card beside it is tall", async ({ page }) => {
  await page.route("**/api/dream**", (route) => route.fulfill({
    json: { title: "Starlight Pages On High", text: "Little One, tonight we built a cloud-top library where books float like butterflies. ".repeat(4), feeling: "brave", ai: true },
  }));
  await page.goto("/");
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); } });
  await page.locator("#dreammaker").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.getByRole("button", { name: /Build my dream/ }).click();
  await expect(page.locator(".dm .ticket h3")).toBeVisible();

  const box = async (sel: string) => (await page.locator(sel).first().boundingBox())!;
  const input = await box("#dname");
  const chip = await box(".dm .chips .chip");
  const btn = await box(".dm .gform > button");
  const ticket = await box(".dm .ticket");
  expect(input.height, "name box").toBeLessThan(70);
  expect(chip.height, "mood chip").toBeLessThan(60);
  expect(btn.height, "main button").toBeLessThan(64);
  // sanity: the right card really is much taller than the controls (the situation that used to stretch them)
  expect(ticket.height).toBeGreaterThan(input.height * 3);
});
