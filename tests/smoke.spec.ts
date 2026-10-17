import { test, expect, type Page } from "@playwright/test";

/** Collects console errors and uncaught exceptions (the rubric asks for zero console errors). */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !/favicon/i.test(m.text())) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

/** Make the download path deterministic: pretend the browser has no native share sheet. */
const noNativeShare = (page: Page) =>
  page.addInitScript(() => { Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true }); });

const reveal = async (page: Page, id: string) => {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.locator(`#${id}`).evaluate((el) => el.scrollIntoView({ block: "center" }));
};

test.describe("first load", () => {
  test("renders the hero with no console errors and no sideways scroll", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("dreams");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("API routes never answer with a 5xx when Supabase is missing or misconfigured", async ({ request }) => {
    for (const path of ["/api/visits", "/api/guestbook"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBeLessThan(500);
    }
  });
});

test.describe("controls", () => {
  test("day/night toggle switches the theme and Pip reacts", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to night mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
    await expect(page.locator(".pipsay")).toContainText(/Goodnight/);
    await page.getByRole("button", { name: "Switch to day mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  });

  test("sound starts muted and the mute switch works", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByRole("button", { name: /^Sound off/ });
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await btn.click();
    const on = page.getByRole("button", { name: /^Sound on/ });
    await expect(on).toHaveAttribute("aria-pressed", "true");
    await on.click();
    await expect(page.getByRole("button", { name: /^Sound off/ })).toHaveAttribute("aria-pressed", "false");
  });

  test("Jump menu opens with / and runs the secret command", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard shortcut and header button are for mouse devices");
    await page.goto("/");
    await page.keyboard.press("/");
    const menu = page.getByRole("dialog", { name: "Jump menu" });
    await expect(menu).toBeVisible();
    await page.getByRole("textbox", { name: /Where do you want to jump/ }).fill("secret");
    await page.keyboard.press("Enter");
    await expect(page.locator("dialog[open]")).toContainText("constellation");
  });

  test("header Jump button opens the menu", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop header only");
    await page.goto("/");
    await page.getByRole("button", { name: /Jump to a place/ }).click();
    await expect(page.getByRole("dialog", { name: "Jump menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Jump menu" })).toBeHidden();
  });

  test("mobile menu reaches the Jump menu", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Jump somewhere…" }).click();
    await expect(page.getByRole("dialog", { name: "Jump menu" })).toBeVisible();
  });

  test("chaos mode toggles", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Chaos mode!" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Chaos mode!" }).click();
    await expect(page.locator("html")).toHaveClass(/chaos/);
    await page.getByRole("button", { name: "Calm things down" }).click();
    await expect(page.locator("html")).not.toHaveClass(/chaos/);
  });
});

test.describe("easter egg", () => {
  test("five pokes on the smallest star reveal the constellation", async ({ page }) => {
    await page.goto("/");
    const star = page.getByRole("button", { name: /Tiny hidden star/ });
    for (let i = 0; i < 5; i++) await star.click();
    const dlg = page.locator("dialog[open]");
    await expect(dlg).toContainText("You found my constellation!");
    await dlg.getByRole("button", { name: "Goodnight, Pip" }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });
});

test.describe("toys", () => {
  test.use({ reducedMotion: "reduce" }); // block tower becomes manual (centred), so drops are deterministic

  test("block tower stacks and the share card downloads as a PNG", async ({ page }) => {
    await noNativeShare(page);
    const errors = watchErrors(page);
    await page.goto("/");
    await reveal(page, "toys");
    const drop = page.getByRole("button", { name: "Drop block" });
    await expect(drop).toBeVisible();
    for (let i = 0; i < 3; i++) await drop.click();
    await expect(page.getByText(/Height: 3/)).toBeVisible();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Share my tower/ }).click()]);
    expect(dl.suggestedFilename()).toMatch(/^pip-tower-3\.png$/);
    expect(errors).toEqual([]);
  });

  test("growth chart mark changes Pip and shares a card", async ({ page }) => {
    await noNativeShare(page);
    await page.goto("/");
    await reveal(page, "growth");
    await page.getByRole("button", { name: /^Giggling, 54 centimetres/ }).click();
    await expect(page.getByRole("heading", { name: "Giggling" })).toBeVisible();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Share this mark/ }).click()]);
    expect(dl.suggestedFilename()).toBe("pip-growth-54cm.png");
  });
});

test.describe("guestbook", () => {
  test("shows success and appends the note", async ({ page }) => {
    await page.route("**/api/guestbook", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 201, json: { entry: { id: 1, display_name: "Tester", message: "Hello Pip", created_at: new Date().toISOString() } } })
        : route.fulfill({ json: { entries: [] } }));
    await page.goto("/");
    await reveal(page, "guestbook");
    await page.getByLabel("Your name").fill("Tester");
    await page.getByLabel("A kind message").fill("Hello Pip");
    await page.getByRole("button", { name: "Send to Pip" }).click();
    await expect(page.getByText(/Thank you!/)).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Hello Pip" })).toBeVisible();
  });

  test("shows the server's error, e.g. rate limiting", async ({ page }) => {
    await page.route("**/api/guestbook", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 429, json: { error: "Slow down a little, sleepyhead." } })
        : route.fulfill({ json: { entries: [] } }));
    await page.goto("/");
    await reveal(page, "guestbook");
    await page.getByLabel("Your name").fill("Tester");
    await page.getByLabel("A kind message").fill("Hello again");
    await page.getByRole("button", { name: "Send to Pip" }).click();
    await expect(page.getByText("Slow down a little, sleepyhead.")).toBeVisible();
  });
});

test.describe("lullaby lab", () => {
  test("play and stop", async ({ page }) => {
    await page.goto("/");
    await reveal(page, "projects");
    const play = page.getByRole("button", { name: "Play lullaby" });
    await play.click();
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByRole("button", { name: "Play lullaby" })).toBeVisible();
  });
});
