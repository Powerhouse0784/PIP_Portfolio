import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
});

const open = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); } });
  await page.locator("#guestbook").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.getByLabel("Your name").fill("Mia");
  await page.getByLabel("A kind message").fill("Pip, I love you.Sweet dreams");
};

test.describe("guestbook never shows a technical error to a visitor", () => {
  test("offline / unreachable server: a kind message, and the note stays in the box", async ({ page }) => {
    await page.route("**/api/guestbook", (route) => (route.request().method() === "POST" ? route.abort("failed") : route.fulfill({ json: { entries: [] } })));
    await open(page);
    await page.getByRole("button", { name: "Send to Pip" }).click();
    await expect(page.getByText(/couldn’t be reached/)).toBeVisible();
    await expect(page.getByText(/Failed to fetch|NetworkError|Unexpected token/i)).toHaveCount(0);
    await expect(page.getByLabel("A kind message")).toHaveValue("Pip, I love you.Sweet dreams");
  });

  test("a non-JSON error page (proxy timeout) becomes a friendly message", async ({ page }) => {
    await page.route("**/api/guestbook", (route) => (route.request().method() === "POST"
      ? route.fulfill({ status: 504, contentType: "text/html", body: "<h1>Gateway Timeout</h1>" })
      : route.fulfill({ json: { entries: [] } })));
    await open(page);
    await page.getByRole("button", { name: "Send to Pip" }).click();
    await expect(page.getByText("Something went wrong. Please try again.")).toBeVisible();
    await expect(page.getByText(/Unexpected token|JSON/i)).toHaveCount(0);
  });

  test("a note with a full stop and no space after it is accepted by the page (it is not a link)", async ({ page }) => {
    await page.route("**/api/guestbook", (route) => (route.request().method() === "POST"
      ? route.fulfill({ status: 201, json: { entry: { id: 9, display_name: "Mia", message: "Pip, I love you.Sweet dreams", created_at: new Date().toISOString() } } })
      : route.fulfill({ json: { entries: [] } })));
    await open(page);
    await page.getByRole("button", { name: "Send to Pip" }).click();
    await expect(page.getByText(/Thank you!/).first()).toBeVisible();
  });
});
