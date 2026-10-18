import { test, expect, type Page } from "@playwright/test";

/** Returning visitor by default, so the opening scene never sits in front of the page under test. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("t0")) sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
});
const firstVisit = (page: Page) =>
  page.addInitScript(() => { try { if (!sessionStorage.getItem("t0")) { sessionStorage.removeItem("pip-intro-seen"); sessionStorage.setItem("t0", "1"); } } catch {} });

const send = async (page: Page, text: string) => {
  await page.getByRole("button", { name: "Chat with Pip" }).click();
  await page.getByLabel("Message to Pip").fill(text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
};

test.describe("chat: streamed, context-aware, never the same twice", () => {
  test("replies stream in, tags never show, and the final reply carries mood and links", async ({ page }) => {
    let seen: { ctx?: { part?: string; moon?: string; section?: string }; messages: unknown[] } | null = null;
    await page.route("**/api/chat", async (route) => {
      const req = route.request();
      expect(req.headers()["accept"]).toContain("application/x-ndjson");
      seen = req.postDataJSON();
      await route.fulfill({
        status: 200, headers: { "content-type": "application/x-ndjson; charset=utf-8" },
        body: '{"d":"Hello there, "}\n{"d":"sleepyhead! *giggle*"}\n{"done":true,"reply":"Hello there, sleepyhead! *giggle*","go":"toys","mood":"giggly","act":null}\n',
      });
    });
    await page.goto("/");
    await send(page, "hello");
    await expect(page.getByText("Hello there, sleepyhead! *giggle*")).toBeVisible();
    await expect(page.getByRole("button", { name: /Take me to the toys/ })).toBeVisible();
    await expect(page.locator(".hero .stage")).toHaveAttribute("data-feel", "giggly");
    await expect(page.locator(".chat-log")).not.toContainText("{mood");
    expect(seen!.ctx?.part).toMatch(/^(morning|afternoon|evening|night)$/);
    expect(seen!.ctx?.moon).toMatch(/^[A-Za-z ]+$/);
  });

  test("Pip is told which part of the site you are looking at", async ({ page }) => {
    let section: string | undefined;
    await page.route("**/api/chat", async (route) => {
      section = route.request().postDataJSON().ctx?.section;
      await route.fulfill({ json: { reply: "Nice projects, right?", go: null, mood: "proud", act: null } });
    });
    await page.goto("/");
    await page.locator("#projects").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await send(page, "what is this");
    await expect(page.getByText("Nice projects, right?")).toBeVisible();
    expect(section).toBe("projects");
  });

  test("a half-written stream still ends in a usable reply", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.fulfill({ status: 200, headers: { "content-type": "application/x-ndjson" }, body: '{"d":"I was saying something about star"}\n' }));
    await page.goto("/");
    await send(page, "hi");
    await expect(page.getByText("I was saying something about star")).toBeVisible();
  });

  test("when the AI is asleep the rule book never repeats itself back to back", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.fulfill({ json: { unavailable: true } }));
    await page.goto("/");
    await page.getByRole("button", { name: "Chat with Pip" }).click();
    const last = () => page.locator(".chat-log .pip p").last().innerText();
    const input = page.getByLabel("Message to Pip");
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      await input.fill("hello");
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await expect(page.locator(".chat-log .pip")).toHaveCount(i + 2); // greeting + replies
      seen.push(await last());
      await expect(page.getByRole("button", { name: "Send", exact: true })).toBeEnabled();
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
    expect(new Set(seen).size).toBeGreaterThan(1);
  });
});

test.describe("hero entrance", () => {
  test("returning visitor: the hero plays at once and ends fully visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/hero-go/);
    await expect(page.locator("html")).not.toHaveClass(/hero-wait/);
    await expect(page.locator(".hero h1")).toHaveCSS("opacity", "1");
    await expect(page.locator(".hero .arch")).toHaveCSS("opacity", "1");
  });

  test("first visit: the hero waits behind the opening scene, then plays as it leaves", async ({ page }) => {
    await firstVisit(page);
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/hero-wait/);
    await page.getByRole("button", { name: "Skip intro" }).click();
    await expect(page.locator("html")).toHaveClass(/hero-go/);
    await expect(page.locator("html")).not.toHaveClass(/hero-wait/);
    await expect(page.locator(".hero h1")).toHaveCSS("opacity", "1");
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });
    test("nothing is hidden or animated", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("html")).not.toHaveClass(/hero-(wait|go)/);
      await expect(page.locator(".hero h1")).toHaveCSS("opacity", "1");
    });
  });

  test("a failed script can never leave the hero hidden (safety timer)", async ({ page }) => {
    await firstVisit(page);
    await page.route("**/_next/static/chunks/**", (r) => r.abort()); // no JavaScript at all
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/hero-wait/);
    await expect(page.locator("html")).not.toHaveClass(/hero-wait/, { timeout: 9_000 });
    await expect(page.locator(".hero h1")).toHaveCSS("opacity", "1");
    await expect(page.getByRole("dialog", { name: /tucking in the stars/ })).toBeHidden({ timeout: 9_000 }); // the opening scene can't trap the visitor either
  });
});

test.describe("chapter rail", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, "the rail is a wide-screen feature");

  test("appears after scrolling, follows the chapters, and jumps to one", async ({ page }) => {
    await page.goto("/");
    const rail = page.getByRole("navigation", { name: "Page chapters" });
    await expect(rail).toHaveCSS("opacity", "0"); // top of the page: tucked away
    await page.locator("#projects").evaluate((el) => el.scrollIntoView({ block: "start" }));
    await expect(rail).toHaveCSS("opacity", "1");
    await expect(rail.getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "true");
    await rail.getByRole("link", { name: "Guestbook" }).click();
    await expect(page).toHaveURL(/#guestbook$/);
    await expect(page.getByRole("heading", { name: "Nursery guestbook" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Guestbook" })).toHaveAttribute("aria-current", "true");
  });

  test("is not shown on the moderation page", async ({ page }) => {
    await page.goto("/admin/guestbook");
    await expect(page.getByRole("navigation", { name: "Page chapters" })).toHaveCount(0);
  });
});
