import { test, expect, type Page } from "@playwright/test";

/**
 * The cinematic intro shows once per tab on a first visit. Every test except the "cinematic intro" block below
 * starts as a returning visitor (flag set) so the overlay never sits in front of the page under test.
 * The "t0" marker makes the flag a one-time seed, so reloads inside a test reflect what the app itself saved.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("t0")) sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
});
const firstVisit = (page: Page) =>
  page.addInitScript(() => { try { if (!sessionStorage.getItem("t0")) { sessionStorage.removeItem("pip-intro-seen"); sessionStorage.setItem("t0", "1"); } } catch {} });

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

test.describe("atmosphere", () => {
  test("Pip falls asleep at night and wakes when poked", async ({ page }) => {
    await page.goto("/");
    const pip = page.getByRole("button", { name: /^Pip\. Press to make him giggle/ });
    await expect(pip).toHaveAttribute("data-sleep", "false");
    await page.getByRole("button", { name: "Switch to night mode" }).click();
    const sleeping = page.getByRole("button", { name: /^Pip is sleeping/ });
    await expect(sleeping).toHaveAttribute("data-sleep", "true");
    await sleeping.click();
    await expect(page.getByRole("button", { name: /^Pip\. Press to make him giggle/ })).toBeVisible();
    await expect(page.locator(".pipsay")).toContainText(/I’m up/);
  });

  test("hero stats count up and the footer odometer renders", async ({ page }) => {
    await page.route("**/api/visits", (route) => route.fulfill({ json: { count: 1234 } }));
    await page.goto("/");
    await page.locator(".stats").scrollIntoViewIfNeeded();
    await expect(page.getByText("Dreams delivered")).toBeVisible();
    await expect(page.locator(".stat dd").first()).toContainText("1,248+");
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect(page.getByRole("img", { name: "Nursery visits: 1,234" })).toBeVisible();
  });

  test("a collected receipt adds to Dreams delivered", async ({ page }) => {
    await page.goto("/");
    await page.locator(".stats").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.dispatchEvent(new Event("pip:delivered")));
    await expect(page.locator(".stat dd").first()).toContainText("1,249+");
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

test.describe("Pip chat (AI with a hand-written fallback)", () => {
  test("uses the AI reply and offers a jump link when the API answers", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.fulfill({ json: { reply: "*giggle* Toys are my favourite!", go: "toys" } }));
    await page.goto("/");
    await page.getByRole("button", { name: "Chat with Pip" }).click();
    await page.getByLabel("Message to Pip").fill("what can I play with?");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Toys are my favourite!")).toBeVisible();
    await expect(page.getByRole("button", { name: /Take me to the toys/ })).toBeVisible();
  });

  test("falls back to the rule book when the API is asleep", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.fulfill({ json: { unavailable: true } }));
    await page.goto("/");
    await page.getByRole("button", { name: "Chat with Pip" }).click();
    await page.getByRole("button", { name: "What do you do?" }).click();
    await expect(page.getByText(/dreams, lullabies, nightlights and bedtime stories/)).toBeVisible();
  });

  test("falls back when the network call fails", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.abort());
    await page.goto("/");
    await page.getByRole("button", { name: "Chat with Pip" }).click();
    await page.getByLabel("Message to Pip").fill("hello");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText(/Hello, sleepyhead/)).toBeVisible();
  });
});

test.describe("dream maker", () => {
  test("shows the AI dream, or the recipe book when the API is unavailable", async ({ page }) => {
    await page.route("**/api/dream", (route) => route.fulfill({ json: { title: "Moonlit Pillow Fort", text: "Tonight, Mia floats to a fort of warm clouds and a tiny star waves hello. Sweet dreams. — Pip ✦" } }));
    await page.goto("/");
    await reveal(page, "dreammaker");
    await page.getByLabel("Who is dreaming tonight?").fill("Mia");
    await page.getByRole("button", { name: /Build my dream/ }).click();
    await expect(page.getByRole("heading", { name: "Moonlit Pillow Fort" })).toBeVisible();
    await page.unroute("**/api/dream");
    await page.route("**/api/dream", (route) => route.fulfill({ json: { unavailable: true } }));
    await page.getByRole("button", { name: /Dream another one/ }).click();
    await expect(page.getByText("Made from Pip’s recipe book.")).toBeVisible();
  });
});

test.describe("3D dream mobile", () => {
  test("renders (or falls back cleanly), rings stars with the buttons, no console errors", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await reveal(page, "mobile3d");
    await expect(page.getByRole("heading", { name: "Pip’s Dream Mobile" })).toBeVisible();
    const canvas = page.locator("#mobile3d canvas.gl");
    const fallback = page.locator("#mobile3d .m3-fallback");
    await expect(canvas.or(fallback)).toBeVisible();
    if (await canvas.count()) {
      await page.getByRole("button", { name: "Ring a star ✦" }).click();
      await expect(page.getByText("Stars rung: 1 of 9")).toBeVisible();
      await page.getByRole("button", { name: "Turn the scene right" }).click();
      await page.getByRole("button", { name: "Hold still" }).click();
      await expect(page.getByRole("button", { name: "Let it drift" })).toHaveAttribute("aria-pressed", "true");
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
});

test.describe("cinematic intro", () => {
  test.beforeEach(async ({ page }) => { await firstVisit(page); });

  const intro = (page: Page) => page.getByRole("dialog", { name: /tucking in the stars/ });

  test("plays on a first visit, then Enter opens the site and it does not return on reload", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Skip intro" })).toBeVisible();
    const enter = page.getByRole("button", { name: /Enter the Dream Workshop/ });
    await expect(enter).toBeVisible(); // fades in after ~2.6 s
    await expect(enter).toBeFocused();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await enter.click();
    await expect(intro(page)).toBeHidden();
    await expect(page.locator("html")).not.toHaveAttribute("data-intro", "on");
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    await expect(page.getByRole("button", { name: /^Sound off/ })).toHaveAttribute("aria-pressed", "false"); // silent by default
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(intro(page)).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("Skip intro leaves immediately, without waiting for the button", async ({ page }) => {
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await page.getByRole("button", { name: "Skip intro" }).click();
    await expect(intro(page)).toBeHidden();
    await expect(page.getByRole("button", { name: "Switch to night mode" })).toBeEnabled();
  });

  test("Escape skips, and the page behind is inert while the intro is open", async ({ page }) => {
    await page.goto("/");
    await expect(intro(page)).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("inert", "");
    await page.keyboard.press("Escape");
    await expect(intro(page)).toBeHidden();
    await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  });

  test("Enter with sound is an explicit opt-in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Enter with sound/ }).click();
    await expect(intro(page)).toBeHidden();
    await expect(page.getByRole("button", { name: /^Sound on/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("replay button in the footer brings the intro back", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Skip intro" }).click();
    await expect(intro(page)).toBeHidden();
    await page.getByRole("button", { name: "Replay the intro ✦" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Replay the intro ✦" }).click();
    await expect(intro(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(intro(page)).toBeHidden();
  });

  test("deep links and ?intro=0 skip the intro", async ({ page }) => {
    await page.goto("/#projects");
    await expect(page.locator("#projects")).toBeVisible();
    await expect(intro(page)).toBeHidden();
    await page.evaluate(() => sessionStorage.removeItem("pip-intro-seen"));
    await page.goto("/?intro=0");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(intro(page)).toBeHidden();
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });
    test("shows a calm still frame with the button ready straight away", async ({ page }) => {
      await page.goto("/");
      await expect(intro(page)).toBeVisible();
      await expect(page.getByRole("button", { name: /Enter the Dream Workshop/ })).toBeVisible({ timeout: 1000 });
      const anims = await page.evaluate(() => document.querySelector(".intro")!.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length);
      expect(anims).toBe(0);
      await page.getByRole("button", { name: /Enter the Dream Workshop/ }).click();
      await expect(intro(page)).toBeHidden({ timeout: 1000 });
    });
  });
});
