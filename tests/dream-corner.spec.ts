import { test, expect } from "@playwright/test";

const corner = (page: import("@playwright/test").Page) => page.locator("#dream-corner");
const btn = (page: import("@playwright/test").Page, name: RegExp) => corner(page).getByRole("button", { name }).first();

test.describe("Pip Dream Corner", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { try { sessionStorage.setItem("pip-intro-seen", "1"); } catch {} }); // returning visitor: no opening scene in the way
    await page.route("**/api/story", (r) => r.fulfill({ json: { unavailable: true } }));
    await page.route("**/api/chat", (r) => r.fulfill({ json: { reply: "*spins* Wheee!", mood: "giggly", act: "spin" } }));
    await page.route("**/api/voice", (r) => r.fulfill({ json: { unavailable: true } }));
    await page.goto("/");
    await corner(page).scrollIntoViewIfNeeded();
  });

  test("shows all eight activities, the idea box and the gallery", async ({ page }) => {
    for (const label of ["Dance", "Sing", "Tell a story", "Show magic", "Sleepy mode", "Change outfit", "Take a photo", "Give a hug"]) {
      await expect(btn(page, new RegExp(label, "i"))).toBeVisible();
    }
    await expect(corner(page).getByLabel("Your idea for Pip")).toBeVisible();
    await expect(corner(page).getByText("Some more fun things you can try")).toBeVisible();
  });

  test("hug updates Pip's message and counts the hug", async ({ page }) => {
    await btn(page, /give a hug/i).click();
    await expect(corner(page).getByText(/Big soft hug, coming right up/i)).toBeVisible();
    await expect(corner(page).getByText(/1 hug given/i)).toBeVisible();
  });

  test("dance moves the Pip in the corner, not the hero", async ({ page }) => {
    await btn(page, /^dance/i).click();
    await expect(corner(page).locator('.stage[data-act="dance"]')).toHaveCount(1);
    await expect(page.locator('.hero .stage[data-act]')).toHaveCount(0);
  });

  test("story opens a readable, pageable story (offline fallback)", async ({ page }) => {
    await btn(page, /tell a story/i).click();
    const panel = corner(page).getByRole("region", { name: /bedtime story/i });
    await expect(panel.getByText(/Page 1 of 3/)).toBeVisible();
    await panel.getByRole("button", { name: /next/i }).click();
    await expect(panel.getByText(/Page 2 of 3/)).toBeVisible();
  });

  test("outfits draw on top of the art and can be removed", async ({ page }) => {
    await btn(page, /change outfit/i).click();
    await corner(page).getByRole("button", { name: /round glasses/i }).click();
    await expect(corner(page).locator("svg.outfit circle")).toHaveCount(2);
    await corner(page).getByRole("button", { name: /original/i }).click();
    await expect(corner(page).locator("svg.outfit circle")).toHaveCount(0);
  });

  test("photo produces a polaroid image", async ({ page }) => {
    await btn(page, /take a photo/i).click();
    await expect(corner(page).getByRole("img", { name: /polaroid of pip/i })).toBeVisible({ timeout: 10_000 });
    await expect(corner(page).getByRole("button", { name: /save photo/i })).toBeVisible();
  });

  test("sleepy mode toggles and wakes", async ({ page }) => {
    await btn(page, /sleepy mode/i).click();
    await expect(page.locator(".dream-corner[data-sleepy]")).toHaveCount(1);
    await expect(corner(page).locator('.stage[data-sleep="true"]')).toHaveCount(1);
    await btn(page, /wake pip up/i).click();
    await expect(btn(page, /sleepy mode/i)).toBeVisible();
  });

  test("drawing pad opens and draws", async ({ page }) => {
    await corner(page).getByRole("button", { name: /draw something/i }).click();
    const pad = corner(page).getByRole("img", { name: /drawing paper/i });
    await expect(pad).toBeVisible();
    const box = (await pad.boundingBox())!;
    await page.mouse.move(box.x + 40, box.y + 40); await page.mouse.down(); await page.mouse.move(box.x + 200, box.y + 120); await page.mouse.up();
    await corner(page).getByRole("button", { name: /i’m done/i }).click();
    await expect(corner(page).getByText(/lovely drawing/i)).toBeVisible();
  });

  test("a typed command runs a move and shows Pip's reply", async ({ page }) => {
    await corner(page).getByLabel("Your idea for Pip").fill("please spin around");
    await corner(page).getByRole("button", { name: /send your idea/i }).click();
    await expect(corner(page).locator('.stage[data-act="spin"]')).toHaveCount(1);
    await expect(corner(page).getByText(/Wheee/)).toBeVisible();
  });

  test("typing 'tell me a story about a dragon' opens the story panel", async ({ page }) => {
    await corner(page).getByLabel("Your idea for Pip").fill("tell me a story about a dragon");
    await corner(page).getByRole("button", { name: /send your idea/i }).click();
    await expect(corner(page).getByRole("region", { name: /bedtime story/i })).toBeVisible();
  });
});
