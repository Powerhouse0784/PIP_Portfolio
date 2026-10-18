import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
});

const watchErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|\/api\//.test(m.text())) errors.push(m.text()); });
  return errors;
};

test.describe("Everything Pip can do (feature tour)", () => {
  test("shows all fifteen features grouped by tier, with working buttons", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await page.locator("#tour").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Everything Pip can do" })).toBeVisible();
    await expect(page.locator(".tcard")).toHaveCount(15);
    for (const t of ["Tier 1 · Baseline", "Tier 2 · Hard", "Tier 3 · Boss"]) await expect(page.getByText(t)).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Features tried" })).toHaveAttribute("aria-valuemax", "15");

    // every card has a real button
    const buttons = page.locator(".tcard button");
    await expect(buttons).toHaveCount(15);
    for (let i = 0; i < 15; i++) await expect(buttons.nth(i)).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test("the day/night card really switches the theme, and the memory card earns a tick", async ({ page }) => {
    await page.goto("/");
    await page.locator("#tour").scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => document.documentElement.dataset.theme ?? "");
    await page.getByRole("button", { name: /Switch it/ }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme ?? "")).not.toBe(before);

    await page.getByRole("button", { name: /See my stickers/ }).click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".tcard.done", { hasText: "Pip remembers you" })).toBeVisible();
  });

  test("scroll buttons land on their sections", async ({ page }) => {
    await page.goto("/");
    await page.locator("#tour").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Meet 3D Pip/ }).click();
    await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById("pip3d")!.getBoundingClientRect().top)), { timeout: 8000 }).toBeLessThan(400);
  });

  test("hero and header both point to the tour", async ({ page, isMobile }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "See everything Pip can do" })).toHaveAttribute("href", "#tour");
    if (!isMobile) await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Try it all" })).toBeVisible();
  });

  test("no sideways scroll at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/#tour");
    await expect(page.locator(".tcard").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});

test.describe("Pip in 3D", () => {
  test("renders (or falls back cleanly) and every control responds", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/#pip3d");
    await expect(page.getByRole("heading", { name: "Meet Pip in 3D" })).toBeVisible();
    const canvas = page.locator("#pip3d canvas.gl");
    const fallback = page.locator("#pip3d .m3-fallback");
    await expect(canvas.or(fallback)).toBeVisible();

    if (await canvas.count()) {
      const status = page.locator("#pip3d .recipe");
      await page.getByRole("button", { name: "Wave" }).click();
      await expect(status).toContainText("waves hello");
      await page.getByRole("button", { name: "Spin" }).click();
      await expect(status).toContainText("Spinning");
      await page.getByRole("button", { name: "Make him giggle" }).click();
      await expect(page.locator("#pip3d .small", { hasText: "Pokes and tricks so far" })).not.toContainText("so far: 0");
      await expect(page.locator(".toast")).toContainText("Third Dimension");

      await page.getByRole("button", { name: "Sleepy mode" }).click();
      await expect(status).toContainText("Zzz");
      await expect(page.getByRole("button", { name: "Wake Pip" })).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "Wake Pip" }).click();
      await expect(status).toContainText("yawn");

      await page.getByRole("button", { name: "Turn Pip right" }).click();
      await page.getByRole("button", { name: "Hold still" }).click();
      await expect(page.getByRole("button", { name: "Let him move" })).toHaveAttribute("aria-pressed", "true");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });

  test("keyboard: arrows turn him and Enter makes him giggle", async ({ page }) => {
    await page.goto("/#pip3d");
    const stage = page.locator("#pip3d .m3-stage");
    await expect(stage).toBeVisible();
    if (!(await page.locator("#pip3d canvas.gl").count())) test.skip(true, "WebGL unavailable in this browser");
    await stage.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.locator("#pip3d .small", { hasText: "Pokes and tricks so far" })).not.toContainText("so far: 0");
  });
});
