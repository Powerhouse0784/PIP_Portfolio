import { test, expect, type Page } from "@playwright/test";
import { chaosFor } from "../src/lib/chaos";

/** Returning visitor by default, so the opening scene never sits in front of the page under test. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("t0")) sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
});

const noSideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("sparkle cursor trail", () => {
  test.skip(({ isMobile }) => isMobile, "needs a mouse: touch screens never get the trail");

  const painted = (page: Page) => page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>("canvas.trail-canvas");
    if (!c) return -1;
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });

  test("stars follow the mouse, never block clicks, and fade away", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("canvas.trail-canvas");
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toHaveCSS("pointer-events", "none");
    await expect(page.locator("html")).toHaveClass(/trail-on/);
    await page.mouse.move(200, 300);
    await page.mouse.move(520, 380, { steps: 12 });
    await expect.poll(() => painted(page)).toBeGreaterThan(0);
    await expect.poll(() => painted(page), { timeout: 5_000 }).toBe(0); // they fade, the canvas does not stay dirty
    expect(await noSideways(page)).toBeLessThanOrEqual(1);
  });

  test("the footer switch turns it off, remembers that, and the Jump menu flips it back", async ({ page }) => {
    await page.goto("/");
    const sw = page.getByRole("button", { name: "Sparkle trail: on" });
    await sw.scrollIntoViewIfNeeded();
    await sw.click();
    await expect(page.getByRole("button", { name: "Sparkle trail: off" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("canvas.trail-canvas")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("canvas.trail-canvas")).toHaveCount(0); // remembered
    await page.keyboard.press("/");
    await page.getByRole("dialog", { name: "Jump menu" }).getByRole("textbox").fill("sparkle");
    await page.keyboard.press("Enter");
    await expect(page.locator("canvas.trail-canvas")).toHaveCount(1);
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });
    test("no trail at all", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("canvas.trail-canvas")).toHaveCount(0);
    });
  });
});

test.describe("responsive chaos mode", () => {
  const turnOn = async (page: Page) => {
    const b = page.getByRole("button", { name: "Chaos mode!" });
    await b.scrollIntoViewIfNeeded();
    await b.click();
    await expect(page.locator("html")).toHaveClass(/chaos/);
  };

  test("it re-scatters to the screen: tier, columns, stickers and the live readout follow the window", async ({ page }) => {
    await page.goto("/");
    await turnOn(page);
    const sizes: [number, number][] = [[390, 844], [768, 1024], [1100, 800], [1440, 900], [1920, 1080]];
    const seen: string[] = [];
    let lastStickers = 0;
    for (const [w, h] of sizes) {
      await page.setViewportSize({ width: w, height: h });
      const want = chaosFor(w, h);
      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-chaos-tier", want.tier);
      await expect(html).toHaveAttribute("data-chaos-orient", want.portrait ? "portrait" : "landscape");
      await expect(page.getByTestId("chaos-hud")).toContainText(`${w}×${h}`);
      await expect(page.getByTestId("chaos-hud")).toContainText(want.label);
      await expect(page.locator(".chs")).toHaveCount(want.stickers);
      expect(await page.evaluate(() => document.documentElement.style.getPropertyValue("--cc"))).toBe(String(want.cols));
      expect(want.stickers).toBeGreaterThanOrEqual(lastStickers);
      lastStickers = want.stickers;
      seen.push(want.tier);
      expect(await noSideways(page), `sideways scroll at ${w}x${h}`).toBeLessThanOrEqual(1);
    }
    expect(new Set(seen).size).toBe(5); // five different personalities for five different screens
  });

  test("rotating a phone changes the orientation readout", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await turnOn(page);
    await expect(page.locator("html")).toHaveAttribute("data-chaos-orient", "portrait");
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator("html")).toHaveAttribute("data-chaos-orient", "landscape");
  });

  test("calming down removes every trace", async ({ page }) => {
    await page.goto("/");
    await turnOn(page);
    await page.getByRole("button", { name: "Calm things down" }).click();
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/chaos/);
    await expect(html).not.toHaveAttribute("data-chaos-tier", /.+/);
    await expect(page.getByTestId("chaos-hud")).toHaveCount(0);
    await expect(page.locator(".chs")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue("--ct"))).toBe("");
  });

  test("the decorations never take clicks", async ({ page }) => {
    await page.goto("/");
    await turnOn(page);
    await expect(page.locator(".chaos-layer")).toHaveCSS("pointer-events", "none");
    await expect(page.getByTestId("chaos-hud")).toHaveCSS("pointer-events", "none");
  });
});

test.describe("Pip answers a guestbook wish", () => {
  const sign = async (page: Page) => {
    await page.route("**/api/guestbook", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 201, json: { entry: { id: 901, display_name: "Mira", message: "Sleep well, little star", created_at: new Date().toISOString(), stars: 0, hearts: 0 } } })
        : route.fulfill({ json: { entries: [] } }));
    await page.goto("/");
    await page.locator("#guestbook").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByLabel("Your name").fill("Mira");
    await page.getByLabel("A kind message").fill("Sleep well, little star");
    await page.getByRole("button", { name: "Send to Pip" }).click();
  };

  test("an AI reply appears under the form, and it reacts with a mood", async ({ page }) => {
    let body: { messages: { content: string }[]; ctx?: { section?: string; name?: string } } | null = null;
    await page.route("**/api/chat", async (route) => { body = route.request().postDataJSON(); await route.fulfill({ json: { reply: "Mira, I’ll hum that to the lanterns tonight.", mood: "shy", go: null, act: null } }); });
    await sign(page);
    await expect(page.locator(".pipreply")).toContainText("I’ll hum that to the lanterns tonight.");
    expect(body!.ctx?.section).toBe("guestbook");
    expect(body!.ctx?.name).toBe("Mira");
    expect(body!.messages[0].content).toContain("Sleep well, little star");
    await expect(page.locator(".hero .stage")).toHaveAttribute("data-feel", "shy");
  });

  test("when the AI is asleep, a hand-written thank-you still names the visitor", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.fulfill({ json: { unavailable: true } }));
    await sign(page);
    await expect(page.locator(".pipreply")).toContainText("Mira");
  });
});
