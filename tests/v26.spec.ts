import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
});

/** Sections mount lazily as they near the screen, so walk the page once before looking for them. */
const warm = async (page: Page) => {
  for (let i = 0; i < 2; i++) {
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
    await page.waitForTimeout(700);
  }
};

test.describe("the origin story is a 3D flight you can play with", () => {
  test("scrolling moves the camera, swaps the chapter, and the page never scrolls sideways", async ({ page }) => {
    test.setTimeout(120000);
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto("/");
    await warm(page);
    const aim = async (f: number) => {
      await page.evaluate((f) => {
        const t = document.querySelector(".st-track")!, st = document.querySelector(".st-sticky") as HTMLElement;
        const r = t.getBoundingClientRect(); scrollTo(0, r.top + scrollY - 72 + (r.height - st.offsetHeight) * f);
      }, f);
      await page.waitForTimeout(800);
      return Number(await page.locator(".st-vp").evaluate((e) => (e as HTMLElement).style.getPropertyValue("--p") || "0"));
    };
    const a = await aim(0.1);
    await expect(page.locator(".st-card[data-on='true'] h3")).toHaveText("A star fell into the nursery");
    const b = await aim(0.9);
    expect(b).toBeGreaterThan(a + 0.4);
    await expect(page.locator(".st-card[data-on='true'] h3")).toHaveText("And so, I began to build");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    expect(errs).toEqual([]);
  });

  test("the Next button flies to the next chapter, and sleepy houses wake when tapped", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/");
    await warm(page);
    await page.evaluate(() => { const t = document.querySelector(".st-track")!; scrollTo(0, t.getBoundingClientRect().top + scrollY - 72 + 40); });
    await page.waitForTimeout(500);
    await page.locator("#story").getByRole("button", { name: /Next/ }).click();
    await expect(page.locator(".st-card[data-on='true'] h3")).toHaveText("Every melody held a dream", { timeout: 6000 });
    await expect(page.getByText(/Sleepy windows lit: 0 of 3/)).toBeVisible();
    const house = page.getByRole("button", { name: /Sleepy house 1 of 3/ });
    await house.click();
    await expect(page.getByText(/Sleepy windows lit: 1 of 3/)).toBeVisible();
    await expect(house).toHaveAttribute("aria-pressed", "true");
    for (const n of [2, 3]) await page.getByRole("button", { name: new RegExp(`Sleepy house ${n} of 3`) }).click();
    await expect(page.getByText(/Every window is glowing/)).toBeVisible();
  });

  test("with reduced motion all three chapters are simply there, stacked and readable", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
    await page.goto("/");
    await warm(page);
    for (const t of ["A star fell into the nursery", "Every melody held a dream", "And so, I began to build"]) await expect(page.getByRole("heading", { name: t })).toBeVisible();
    expect(await page.locator("#story.live").count()).toBe(0);
    await ctx.close();
  });
});

test.describe("the Dark Room", () => {
  test("turning the light on shows every secret, fully inside the room, and turning it off hides them again", async ({ page }) => {
    await page.goto("/");
    await warm(page);
    const room = page.locator(".dr");
    await room.evaluate((e) => e.scrollIntoView({ block: "center" }));
    const sw = page.getByRole("button", { name: "Turn the room light on" });
    await sw.click();
    await expect(page.getByRole("button", { name: "Turn the room light off" })).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(1200);
    const box = await room.boundingBox();
    for (const t of [/first nightcap was a sock/, /lullaby for every window/, /dark hums back/, /smallest star in the hero/]) {
      const li = page.locator(".dr-lit li", { hasText: t });
      await expect(li).toBeVisible();
      const b = (await li.boundingBox())!;
      expect(b.y).toBeGreaterThanOrEqual(box!.y - 1);
      expect(b.y + b.height).toBeLessThanOrEqual(box!.y + box!.height + 1);
      expect(b.x + b.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
    }
    expect(await page.locator(".dr-base").evaluate((e) => getComputedStyle(e).opacity)).toBe("0");
    await page.getByRole("button", { name: "Turn the room light off" }).click();
    await expect(page.getByRole("button", { name: "Turn the room light on" })).toBeVisible();
  });
});

test.describe("soft corners and depth", () => {
  test("the retro desktop window and badges have rounded corners", async ({ page }) => {
    await page.goto("/");
    await warm(page);
    for (const sel of [".rd-win", ".badge"]) {
      const r = await page.locator(sel).first().evaluate((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius));
      expect(r, sel).toBeGreaterThanOrEqual(6);
    }
  });

  test("hovering a picture leans it toward the pointer and leaving puts it back", async ({ page, isMobile }) => {
    test.skip(isMobile, "pointer hover is a desktop thing");
    await page.goto("/");
    const arch = page.locator(".about .arch").first();
    await arch.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(900);
    const b = (await arch.boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.9, b.y + b.height * 0.2, { steps: 4 });
    await expect.poll(() => arch.evaluate((e) => (e as HTMLElement).style.rotate)).not.toBe("");
    await page.mouse.move(5, 5, { steps: 4 });
    await expect.poll(() => arch.evaluate((e) => (e as HTMLElement).style.rotate), { timeout: 4000 }).toBe("");
  });
});
