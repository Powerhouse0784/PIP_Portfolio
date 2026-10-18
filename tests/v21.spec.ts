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

test.describe("Pip's Desktop (retro window)", () => {
  test("tabs, Top 8 friends and the defragmenter work, and finishing earns a sticker", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/#desktop");
    await expect(page.getByRole("heading", { name: "Pip’s Desktop" })).toBeVisible();
    await expect(page.getByRole("tabpanel")).toContainText("goodnight");

    await page.getByRole("tab", { name: "top8.exe" }).click();
    await page.getByRole("button", { name: "Cloud #4" }).click();
    await expect(page.getByText(/A very good pillow/)).toBeVisible();

    await page.getByRole("tab", { name: "defrag.exe" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByText("Done. 0 bad dreams found.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("progressbar", { name: "Defragmenting dreams" })).toHaveAttribute("aria-valuenow", "100");
    await expect(page.locator(".toast")).toContainText("Defragmenter");
    expect(errors).toEqual([]);
  });

  test("arrow keys on the title bar move the window (desktop widths)", async ({ page, isMobile }) => {
    test.skip(isMobile, "dragging is turned off on phones");
    await page.goto("/#desktop");
    const bar = page.getByLabel(/Pip\.exe title bar/);
    await bar.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator(".rd-win")).toHaveCSS("transform", /matrix\(1, 0, 0, 1, 16, 16\)/);
    await page.keyboard.press("Home");
    await expect(page.locator(".rd-win")).toHaveCSS("transform", /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  });

  test("minimise, restore, close and reopen", async ({ page }) => {
    await page.goto("/#desktop");
    await page.getByRole("button", { name: "Minimise Pip.exe" }).click();
    await expect(page.locator(".rd-win")).toHaveCount(0);
    await page.getByRole("button", { name: "PIP.EXE" }).click();
    await expect(page.locator(".rd-win")).toBeVisible();
    await page.getByRole("button", { name: "Close Pip.exe" }).click();
    await expect(page.getByRole("button", { name: "Open PIP.EXE" })).toBeVisible();
    await page.getByRole("button", { name: "Open PIP.EXE" }).click();
    await expect(page.locator(".rd-win")).toBeVisible();
  });

  test("no sideways scroll at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/#desktop");
    await expect(page.locator(".rd-win")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});

test.describe("goodnight secret", () => {
  test("typing goodnight tucks Pip in, Esc wakes him, and it earns a sticker", async ({ page, isMobile }) => {
    test.skip(isMobile, "needs a hardware keyboard; phones use the Jump menu entry");
    await page.goto("/");
    await page.keyboard.type("goodnight");
    const dlg = page.getByRole("dialog", { name: /Goodnight/ });
    await expect(dlg).toBeVisible();
    await expect(page.locator(".toast")).toContainText("Sweet Dreamer");
    await page.keyboard.press("Escape");
    await expect(dlg).toHaveCount(0);
  });

  test("the Jump menu entry works and typing into a text box does not trigger it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Chat with Pip" }).click();
    await page.getByLabel("Message to Pip").pressSequentially("goodnight", { delay: 10 });
    await expect(page.getByRole("dialog", { name: /Goodnight/ })).toHaveCount(0);
    await page.evaluate(() => dispatchEvent(new Event("pip:goodnight")));
    await expect(page.getByRole("dialog", { name: /Goodnight/ })).toBeVisible();
    await page.getByRole("button", { name: "Wake Pip up" }).click();
    await expect(page.getByRole("dialog", { name: /Goodnight/ })).toHaveCount(0);
  });
});

test.describe("footer", () => {
  test("is short and clean: brand, small badges, the two buttons, the odometer and credits, with no links that leave the site", async ({ page }) => {
    await page.route("**/api/visits", (route) => route.fulfill({ json: { count: 37 } }));
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByRole("button", { name: "Chaos mode!" })).toBeVisible();
    await expect(footer.getByRole("button", { name: /Replay the intro/ })).toBeVisible();
    await expect(footer.getByRole("img", { name: "Nursery visits: 37" })).toBeVisible();
    await expect(footer).toContainText("Character & artwork: haX.baby Track 1 official asset pack.");
    await expect(footer.getByText("Credits & thanks")).toBeVisible();
    // The old webring, construction banner and 88x31 badge wall are gone, and nothing in the footer sends visitors off-site.
    await expect(footer.getByRole("navigation", { name: "Baby webring" })).toHaveCount(0);
    await expect(footer.getByRole("note")).toHaveCount(0);
    await expect(footer.locator(".b88")).toHaveCount(0);
    await expect(footer.locator('a[href^="http"]')).toHaveCount(0);
  });

  test("has no sideways scroll at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");
    await page.locator("footer").scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});
