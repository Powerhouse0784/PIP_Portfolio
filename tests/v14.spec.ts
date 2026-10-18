import { test, expect, type Page } from "@playwright/test";

/** Every test starts as a returning visitor so the opening scene never sits in front of the page under test. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("t0")) sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
});

const reveal = async (page: Page, id: string) => {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.locator(`#${id}`).evaluate((el) => el.scrollIntoView({ block: "center" }));
};
const noNativeShare = (page: Page) =>
  page.addInitScript(() => { Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true }); });

const ENTRIES = [
  { id: 11, display_name: "Ada", message: "Sweet dreams, little one", created_at: "2026-10-17T20:00:00Z", stars: 2, hearts: 1 },
  { id: 12, display_name: "Bo", message: "I wish for a cozy night", created_at: "2026-10-17T21:00:00Z", stars: 0, hearts: 0 },
];

test.describe("sound memory", () => {
  test("a returning visitor who left sound on is asked politely, and a click turns it on", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("pip-sound", "on"); } catch {} });
    await page.goto("/");
    const ask = page.getByRole("group", { name: "Welcome back" });
    await expect(ask).toBeVisible();
    await expect(page.getByRole("button", { name: /^Sound off/ })).toHaveAttribute("aria-pressed", "false"); // never auto-plays
    await ask.getByRole("button", { name: /turn sound on/ }).click();
    await expect(ask).toBeHidden();
    await expect(page.getByRole("button", { name: /^Sound on/ })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("group", { name: "Welcome back" })).toBeHidden(); // asked once per tab
  });

  test("'Keep it quiet' is remembered", async ({ page }) => {
    await page.addInitScript(() => { try { if (!sessionStorage.getItem("t0")) localStorage.setItem("pip-sound", "on"); } catch {} });
    await page.goto("/");
    await page.getByRole("button", { name: "Keep it quiet" }).click();
    expect(await page.evaluate(() => localStorage.getItem("pip-sound"))).toBe("off");
  });

  test("turning sound on or off is saved for next time", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Sound off/ }).click();
    expect(await page.evaluate(() => localStorage.getItem("pip-sound"))).toBe("on");
    await page.getByRole("button", { name: /^Sound on/ }).click();
    expect(await page.evaluate(() => localStorage.getItem("pip-sound"))).toBe("off");
  });
});

test.describe("tonight's sky", () => {
  test.use({ timezoneId: "UTC" });
  test("shows the real moon and a time-of-day greeting, computed locally", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-26T21:30:00Z"));
    await page.goto("/");
    const box = page.getByLabel("Tonight’s sky");
    await expect(box).toContainText("Full Moon");
    await expect(box).toContainText(/Midnight Nursery hour/);
    await expect(box.getByRole("img", { name: /Full Moon, \d+ percent lit/ })).toBeVisible();
  });
});

test.describe("daily dream card", () => {
  test("one dream per day: written once, remembered, shareable as a picture", async ({ page }) => {
    await noNativeShare(page);
    let calls = 0;
    await page.route("**/api/dream", async (route) => {
      calls += 1;
      const body = route.request().postDataJSON() as { daily?: boolean; moon?: string };
      expect(body.daily).toBe(true);
      expect(body.moon).toMatch(/^[A-Za-z ]+$/);
      await route.fulfill({ json: { title: "The Lantern Bridge", text: "Tonight, you cross a bridge of warm lanterns while the moon hums along. Sweet dreams. — Pip ✦" } });
    });
    await page.goto("/");
    await reveal(page, "daily");
    await page.getByLabel("Who is dreaming? (optional)").fill("Mira");
    await page.getByRole("button", { name: /Open tonight’s dream/ }).click();
    await expect(page.getByRole("heading", { name: "The Lantern Bridge" })).toBeVisible();
    await expect(page.getByText(/first page of your dream diary/).first()).toBeVisible();
    expect(calls).toBe(1);

    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Save or share as a picture/ }).click()]);
    expect(dl.suggestedFilename()).toMatch(/^pip-dream-\d{4}-\d{2}-\d{2}\.png$/);

    await page.reload();
    await reveal(page, "daily");
    await expect(page.getByRole("heading", { name: "The Lantern Bridge" })).toBeVisible();
    expect(calls).toBe(1); // a refresh never spends another dream
  });

  test("falls back to Pip's recipe book when the AI is asleep", async ({ page }) => {
    await page.route("**/api/dream", (route) => route.fulfill({ json: { unavailable: true } }));
    await page.goto("/");
    await reveal(page, "daily");
    await page.getByRole("button", { name: /Open tonight’s dream/ }).click();
    await expect(page.getByText("Made from Pip’s recipe book.")).toBeVisible();
  });
});

test.describe("guestbook reactions and wish wall", () => {
  test("a star is counted once and the server's count wins", async ({ page }) => {
    let reacts = 0;
    await page.route("**/api/guestbook", (route) => route.fulfill({ json: { entries: ENTRIES } }));
    await page.route("**/api/guestbook/react", async (route) => {
      reacts += 1;
      expect(route.request().postDataJSON()).toEqual({ id: 11, kind: "star" });
      await route.fulfill({ json: { stars: 3, hearts: 1, added: true } });
    });
    await page.goto("/");
    await reveal(page, "guestbook");
    const star = page.getByRole("button", { name: /Send a star to Ada/ });
    await expect(star).toContainText("2");
    await star.click();
    await expect(star).toContainText("3");
    await expect(star).toHaveAttribute("aria-pressed", "true");
    await star.click();
    expect(reacts).toBe(1);
  });

  test("a failed reaction rolls back and says why", async ({ page }) => {
    await page.route("**/api/guestbook", (route) => route.fulfill({ json: { entries: ENTRIES } }));
    await page.route("**/api/guestbook/react", (route) => route.fulfill({ status: 429, json: { error: "Easy, little one." } }));
    await page.goto("/");
    await reveal(page, "guestbook");
    const heart = page.getByRole("button", { name: /Send a heart to Ada/ });
    await heart.click();
    await expect(page.getByText("Easy, little one.")).toBeVisible();
    await expect(heart).toContainText("1");
    await expect(heart).toHaveAttribute("aria-pressed", "false");
  });

  test("guestbook notes float as wishes in the 3D section and can be read", async ({ page }) => {
    await page.route("**/api/guestbook", (route) => route.fulfill({ json: { entries: ENTRIES } }));
    await page.goto("/");
    await reveal(page, "mobile3d");
    await expect(page.getByText("Wish wall · 2 wishes floating")).toBeVisible();
    await page.getByRole("button", { name: "✧ Bo" }).click();
    await expect(page.locator(".wish-card")).toContainText("I wish for a cozy night");
  });

  test("an empty wish wall points to the guestbook", async ({ page }) => {
    await page.route("**/api/guestbook", (route) => route.fulfill({ json: { entries: [] } }));
    await page.goto("/");
    await reveal(page, "mobile3d");
    await expect(page.getByText("Wish wall · 0 wishes floating")).toBeVisible();
    await expect(page.locator(".wishes").getByRole("link", { name: "Leave a note" })).toBeVisible();
  });
});

test.describe("Pip's mood from the chat", () => {
  const send = async (page: Page, text: string) => {
    await page.getByRole("button", { name: "Chat with Pip" }).click();
    await page.getByLabel("Message to Pip").fill(text);
    await page.getByRole("button", { name: "Send", exact: true }).click();
  };

  test("the AI's mood tag drives Pip's expression for a few seconds", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.fulfill({ json: { reply: "*giggle* Hehe, hi!", go: null, mood: "giggly" } }));
    await page.goto("/");
    await send(page, "hello");
    await expect(page.locator(".hero .stage")).toHaveAttribute("data-feel", "giggly");
    await expect(page.getByText("Pip feels giggly")).toBeVisible();
    await expect(page.locator(".hero .stage")).not.toHaveAttribute("data-feel", /.+/, { timeout: 7_000 });
  });

  test("without the AI, the rule book still picks a feeling", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.fulfill({ json: { unavailable: true } }));
    await page.goto("/");
    await send(page, "Tell me a secret");
    await expect(page.locator(".hero .stage")).toHaveAttribute("data-feel", "giggly");
  });

  test("an unknown mood from the server is ignored safely", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.fulfill({ json: { reply: "Hmm, what do you think?", go: null, mood: "furious" } }));
    await page.goto("/");
    await send(page, "ok");
    await expect(page.locator(".hero .stage")).toHaveAttribute("data-feel", "curious"); // inferred from the words instead
  });
});

test.describe("mood-reactive scenery", () => {
  test("choosing a lantern tints the whole page wash", async ({ page }) => {
    await page.goto("/");
    await reveal(page, "projects");
    await page.getByRole("button", { name: "Rose" }).click();
    await expect(page.locator(".mood")).toHaveAttribute("style", /255,\s*130,\s*165/);
    await page.getByRole("button", { name: "Moonlight" }).click();
    await expect(page.locator(".mood")).toHaveAttribute("style", /140,\s*165,\s*255/);
  });

  test("the lullaby tints the page, sends its notes, and hands the colour back when it stops", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __notes: unknown[] }).__notes = [];
      addEventListener("pip:note", (e) => (window as unknown as { __notes: unknown[] }).__notes.push((e as CustomEvent).detail));
    });
    await page.goto("/");
    await reveal(page, "projects");
    await page.getByRole("button", { name: "Rose" }).click();
    await page.getByRole("group", { name: "Lullaby mood" }).getByRole("button", { name: "Brave" }).click();
    await page.getByRole("button", { name: "Play lullaby" }).click();
    await expect(page.locator(".mood")).toHaveAttribute("style", /255,\s*196,\s*80/); // brave gold wins while playing
    await expect.poll(() => page.evaluate(() => (window as unknown as { __notes: unknown[] }).__notes.length)).toBeGreaterThanOrEqual(2);
    const first = await page.evaluate(() => (window as unknown as { __notes: { i: number; f: number; mood: string }[] }).__notes[0]);
    expect(first).toMatchObject({ i: 0, mood: "brave" });
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.locator(".mood")).toHaveAttribute("style", /255,\s*130,\s*165/); // back to the rose lantern
  });
});

test.describe("guestbook moderation", () => {
  const TOKEN = "good-token-1234567890";

  test("is hidden from search engines and skips the opening scene", async ({ page, request }) => {
    await page.addInitScript(() => { try { sessionStorage.removeItem("pip-intro-seen"); } catch {} });
    await page.goto("/admin/guestbook");
    await expect(page.getByRole("heading", { name: "Guestbook moderation" })).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute("data-intro", "on");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
  });

  test("the real API never serves notes without the token, and never reads a token from the URL", async ({ request }) => {
    const none = await request.get("/api/admin/guestbook");
    expect([401, 503]).toContain(none.status());
    const url = await request.get("/api/admin/guestbook?token=good-token-1234567890");
    expect([401, 503]).toContain(url.status());
    const del = await request.delete("/api/admin/guestbook", { data: { id: 1 } });
    expect([401, 503]).toContain(del.status());
  });

  test("unlock, approve a waiting note, hide another, delete needs a second click", async ({ page }) => {
    const db = [
      { id: 1, display_name: "Ada", message: "Please approve me", created_at: "2026-10-18T10:00:00Z", is_approved: false, reviewed_at: null, stars: 0, hearts: 0 },
      { id: 2, display_name: "Bo", message: "Second note", created_at: "2026-10-18T11:00:00Z", is_approved: false, reviewed_at: null, stars: 0, hearts: 0 },
    ];
    const seen: string[] = [];
    await page.route("**/api/admin/guestbook**", async (route) => {
      const req = route.request();
      if (req.headers()["authorization"] !== `Bearer ${TOKEN}`) return route.fulfill({ status: 401, json: { error: "That token doesn’t match." } });
      if (req.method() === "GET") {
        const status = new URL(req.url()).searchParams.get("status");
        const pending = db.filter((r) => !r.is_approved && !r.reviewed_at);
        const approved = db.filter((r) => r.is_approved);
        const hidden = db.filter((r) => !r.is_approved && r.reviewed_at);
        const list = status === "approved" ? approved : status === "hidden" ? hidden : pending;
        return route.fulfill({ json: { entries: list, counts: { pending: pending.length, approved: approved.length, hidden: hidden.length } } });
      }
      const body = req.postDataJSON() as { id: number; action?: string };
      seen.push(`${req.method()} ${body.id} ${body.action ?? ""}`.trim());
      const row = db.find((r) => r.id === body.id)!;
      if (req.method() === "PATCH") { row.is_approved = body.action === "approve"; row.reviewed_at = "2026-10-18T12:00:00Z" as unknown as null; }
      if (req.method() === "DELETE") db.splice(db.indexOf(row), 1);
      return route.fulfill({ json: { ok: true } });
    });

    await page.goto("/admin/guestbook");
    await page.getByLabel("Moderation token").fill("wrong-token");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByText("That token doesn’t match.")).toBeVisible();

    await page.getByLabel("Moderation token").fill(TOKEN);
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByRole("tab", { name: "Waiting · 2" })).toBeVisible();
    const ada = page.locator(".admin-row").filter({ hasText: "Please approve me" });
    await ada.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Approved. It’s on the wall.")).toBeVisible();
    await expect(page.getByRole("tab", { name: "On the wall · 1" })).toBeVisible();

    const bo = page.locator(".admin-row").filter({ hasText: "Second note" });
    await bo.getByRole("button", { name: "Hide" }).click();
    await expect(page.getByRole("tab", { name: "Hidden · 1" })).toBeVisible();

    await page.getByRole("tab", { name: /Hidden/ }).click();
    const hidden = page.locator(".admin-row").filter({ hasText: "Second note" });
    await hidden.getByRole("button", { name: "Delete" }).click();
    expect(seen.some((s) => s.startsWith("DELETE"))).toBe(false); // first click only asks
    await hidden.getByRole("button", { name: "Really delete?" }).click();
    await expect(page.getByText("Deleted for good.")).toBeVisible();
    expect(seen).toEqual(["PATCH 1 approve", "PATCH 2 hide", "DELETE 2"]);

    await page.getByRole("button", { name: "Lock" }).click();
    await expect(page.getByLabel("Moderation token")).toBeVisible();
  });
});
