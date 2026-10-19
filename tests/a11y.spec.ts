import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated accessibility audit with axe-core, in day and night, with every lazy section mounted.
 * Motion is reduced so the page is in its final, static state (axe can't judge colours mid-animation).
 * Serious/critical problems fail the test; colour-contrast is reported separately as a soft check so one tricky overlay can't hide the rest.
 */
test.use({ reducedMotion: "reduce" });

const mountEverything = async (page: Page) => {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h + 2000; y += 700) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
};

for (const theme of ["day", "night"] as const) {
  test.describe(`axe, ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => { try { sessionStorage.setItem("pip-intro-seen", "1"); localStorage.setItem("pip-theme", t === "night" ? "night" : "day"); } catch {} }, theme);
      await page.goto("/");
      await mountEverything(page);
    });

    test("no serious or critical violations (excluding colour contrast)", async ({ page }) => {
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).disableRules(["color-contrast"]).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });

    test("colour contrast (soft check)", async ({ page }) => {
      const r = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
      for (const v of r.violations) expect.soft(v.nodes.map((n) => n.target.join(" ")), `${v.id}: ${v.help}`).toEqual([]);
    });
  });
}

test("the open chat panel is accessible too", async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
  await page.goto("/");
  await page.getByRole("button", { name: "Chat with Pip" }).click();
  const r = await new AxeBuilder({ page }).include(".chat-panel").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});
