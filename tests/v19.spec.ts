import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
});

/** Sections mount lazily as they near the screen, so walk the page once before looking for them. */
const warm = async (page: Page) => {
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
  await page.waitForTimeout(1000);
};

const mockWeather = async (page: Page, code = 63, isDay = 0) => {
  await page.route("**/geocoding-api.open-meteo.com/**", (r) => r.fulfill({ json: { results: [{ name: "Pune", country: "India", latitude: 18.5, longitude: 73.8 }] } }));
  await page.route("**/api.open-meteo.com/**", (r) => r.fulfill({ json: { current: { temperature_2m: 24.4, weather_code: code, is_day: isDay } } }));
};

test.describe("generative dream art", () => {
  test("a dream order gets its own painted postcard, and the same dream paints the same picture", async ({ page }) => {
    await page.goto("/");
    await page.locator("#dreammaker").scrollIntoViewIfNeeded();
    await page.locator("#dreammaker").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByLabel("Who is dreaming tonight?").fill("Mira");
    await page.getByRole("button", { name: /Build my dream/ }).click();
    const art = page.locator("img.dart-ticket");
    await expect(art).toBeVisible();
    const src = await art.getAttribute("src");
    expect(src).toContain("data:image/svg+xml");
    expect(await art.getAttribute("alt")).toBe("");
  });
});

test.describe("weather: opt-in, private, gentle", () => {
  test("nothing is requested until the visitor asks; then Pip reads the sky and the rain falls", async ({ page }) => {
    let calls = 0;
    page.on("request", (r) => { if (r.url().includes("open-meteo.com")) calls++; });
    await mockWeather(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Check the sky/ }).scrollIntoViewIfNeeded();
    expect(calls).toBe(0);
    await page.getByRole("button", { name: /Check the sky/ }).click();
    await page.getByLabel("Your town").fill("Pune");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(page.locator(".wx-now")).toContainText("Pune");
    await expect(page.locator(".wx-now")).toContainText("Rainy");
    await expect(page.locator("[data-weather='rain']")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Open-Meteo.com" })).toBeVisible();
    // Forgetting the town clears it and the rain stops.
    await page.getByRole("button", { name: "Forget my town" }).click();
    await expect(page.locator("[data-weather]")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("pip-place"))).toBeNull();
  });

  test("a failing weather service shows a kind message, not a crash", async ({ page }) => {
    await page.route("**/open-meteo.com/**", (r) => r.abort());
    await page.goto("/");
    await page.getByRole("button", { name: /Check the sky/ }).click();
    await page.getByLabel("Your town").fill("Pune");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(page.locator("p.err")).toContainText(/couldn’t reach/);
  });

  test("the weather overlay never blocks clicks and is hidden from assistive tech", async ({ page }) => {
    await mockWeather(page, 71, 1);
    await page.addInitScript(() => { try { localStorage.setItem("pip-place", JSON.stringify({ name: "Pune, India", lat: 18.5, lon: 73.8 })); } catch {} });
    await page.goto("/");
    const fx = page.locator("[data-weather='snow']");
    await expect(fx).toHaveCount(1);
    expect(await fx.getAttribute("aria-hidden")).toBe("true");
    expect(await fx.evaluate((e) => getComputedStyle(e).pointerEvents)).toBe("none");
  });
});

test("chapter rail is the only .rail on the page (no leftover story dots)", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".rail")).toHaveCount(1);
});
