import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
});

const warm = async (page: Page) => {
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
  await page.waitForTimeout(800);
};
const centre = async (page: Page, id: string) => {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.locator(`#${id}`).evaluate((el) => el.scrollIntoView({ block: "center" }));
};

test.describe("sticker book", () => {
  test("poking Pip earns a sticker, the toast appears and the book lists it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Pip\. Press to make him giggle/ }).first().click();
    await expect(page.locator(".toast")).toContainText("First Giggle");
    await page.getByRole("button", { name: /Open sticker book\. 1 of \d+ collected/ }).click();
    const dlg = page.locator("dialog.sbk[open]");
    await expect(dlg).toContainText("1 of");
    await expect(dlg.locator("li.got")).toContainText("First Giggle");
    await expect(dlg.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    // Locked stickers show a hint instead of a name.
    await expect(dlg.locator("li.lock").first()).toContainText(/\w/);
    await dlg.getByRole("button", { name: "Close" }).click();
    await expect(page.locator("dialog.sbk[open]")).toHaveCount(0);
  });

  test("delivery receipts unlock project stickers (lantern) and progress survives a reload", async ({ page }) => {
    await page.goto("/");
    await centre(page, "projects");
    await page.getByRole("button", { name: "Rose" }).click();
    await expect(page.locator(".toast")).toContainText("Nightlight");
    await page.reload();
    await page.getByRole("button", { name: /Open sticker book\. \d+ of \d+ collected/ }).click();
    await expect(page.locator("dialog.sbk[open] li.got")).toContainText("Nightlight");
  });

  test("the night streak grows when you come back the next day, and the 3-day sticker unlocks", async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem("pip-progress-v1")) return;
      const k = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const y = new Date(); y.setDate(y.getDate() - 1);
      localStorage.setItem("pip-progress-v1", JSON.stringify({ stickers: {}, streak: { last: k(y), count: 2, best: 2 }, days: [k(y)] }));
    });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Open sticker book\. 1 of \d+ collected/ })).toBeVisible();
    await page.getByRole("button", { name: /Open sticker book/ }).click();
    await expect(page.locator("dialog.sbk[open]")).toContainText("3-night streak");
    await expect(page.locator("dialog.sbk[open] li.got")).toContainText("Three Nights Running");
  });

  test("Start over asks twice, then clears everything", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Pip\. Press to make him giggle/ }).first().click();
    await page.getByRole("button", { name: /Open sticker book/ }).click();
    const dlg = page.locator("dialog.sbk[open]");
    await dlg.getByRole("button", { name: "Start over" }).click();
    await expect(dlg.getByRole("button", { name: "Really start over?" })).toBeVisible();
    await dlg.getByRole("button", { name: "Really start over?" }).click();
    await expect(dlg.locator("li.got")).toHaveCount(0);
  });

  test("the Jump menu opens the book and earns Pocket Navigator", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard shortcut is for mouse devices");
    await page.goto("/");
    await page.keyboard.press("/");
    await page.getByRole("textbox", { name: /Where do you want to jump/ }).fill("sticker");
    await page.keyboard.press("Enter");
    await expect(page.locator("dialog.sbk[open]")).toBeVisible();
    await expect(page.locator("dialog.sbk[open] li.got")).toContainText("Pocket Navigator");
  });
});

test.describe("daily rituals", () => {
  test("bedtime reminder downloads a valid repeating calendar file", async ({ page }) => {
    await page.goto("/");
    await warm(page);
    await centre(page, "daily");
    await page.locator("#bedtime").fill("21:15");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Add to my calendar/ }).click()]);
    expect(dl.suggestedFilename()).toBe("pip-bedtime.ics");
    const text = readFileSync((await dl.path())!, "utf8");
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("RRULE:FREQ=DAILY");
    expect(text).toMatch(/DTSTART:\d{8}T211500/);
    expect(text).toContain("BEGIN:VALARM");
    expect(text.endsWith("END:VCALENDAR\r\n")).toBe(true);
    await expect(page.locator(".toast")).toContainText("Bedtime Ritual");
  });

  test("the hidden star hides in a spot inside the hero and still opens the constellation", async ({ page }) => {
    await page.goto("/");
    const star = page.getByRole("button", { name: /Tiny hidden star/ });
    await expect(star).toBeVisible();
    for (let i = 0; i < 5; i++) await star.click();
    await expect(page.locator("dialog[open]")).toContainText("You found my constellation!");
  });
});

test.describe("navigation polish", () => {
  test("the header highlights lazily mounted sections as you scroll", async ({ page, isMobile }) => {
    test.skip(isMobile, "the inline nav links are hidden on phones");
    await page.goto("/");
    await warm(page);
    await centre(page, "guestbook");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Guestbook" })).toHaveAttribute("aria-current", "true");
  });

  test("the theme switch still flips the whole page (moonrise transition)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to night mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
    await page.getByRole("button", { name: "Switch to day mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  });
});

test.describe("installable and offline", () => {
  test("the manifest describes an installable app", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m.display).toBe("standalone");
    const sizes = m.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose ?? ""}`);
    expect(sizes).toContain("192x192:any");
    expect(sizes).toContain("512x512:maskable");
    expect(m.shortcuts.length).toBe(3);
    for (const i of m.icons) { if (i.src.endsWith(".png")) expect((await request.get(i.src)).ok(), i.src).toBe(true); }
  });

  test("the service worker file is served fresh and is JavaScript", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toMatch(/javascript/);
    expect(res.headers()["cache-control"]).toMatch(/no-cache|no-store/);
  });

  test.describe("offline", () => {
    test.use({ serviceWorkers: "allow" });
    test("after one visit the nursery opens with no connection", async ({ page, context, isMobile }) => {
      test.skip(isMobile, "one browser is enough for the offline check");
      await page.goto("/");
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
      await page.reload(); // now controlled by the worker, so this load is cached
      await page.waitForLoadState("networkidle");
      await context.setOffline(true);
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toContainText("dreams");
      await context.setOffline(false);
    });
  });
});
