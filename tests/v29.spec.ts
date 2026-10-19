import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem("pip-intro-seen", "1"); } catch {} });
});

const chat = (page: Page) => page.getByRole("dialog", { name: "Chat with Pip" });
const openChat = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Chat with Pip" }).click();
  await expect(chat(page)).toBeVisible();
  await page.waitForTimeout(600); // the chat ignores page movement for half a second after opening
};

test.describe("the open chat gets out of the way", () => {
  test("clicking anywhere else on the page closes it", async ({ page, isMobile }) => {
    test.skip(isMobile, "mouse click; phones are covered by the tap test");
    await openChat(page);
    await page.getByRole("heading", { level: 1 }).click();
    await expect(chat(page)).toBeHidden();
  });

  test("tapping anywhere else on a phone closes it", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch only");
    await openChat(page);
    await page.getByRole("heading", { level: 1 }).tap();
    await expect(chat(page)).toBeHidden();
  });

  test("scrolling the page with the mouse wheel closes it", async ({ page, isMobile }) => {
    test.skip(isMobile, "wheel is a mouse gesture");
    await openChat(page);
    await page.mouse.move(120, 300);
    await page.mouse.wheel(0, 500);
    await expect(chat(page)).toBeHidden();
  });

  test("scrolling the page itself (scrollbar, keys, momentum) closes it", async ({ page }) => {
    await openChat(page);
    await page.evaluate(() => scrollTo(0, 400));
    await expect(chat(page)).toBeHidden();
  });

  test("but page movement while you are typing never closes it (the phone keyboard nudges the page)", async ({ page }) => {
    await openChat(page);
    await page.getByLabel("Message to Pip").focus();
    await page.evaluate(() => scrollTo(0, 400));
    await page.waitForTimeout(300);
    await expect(chat(page)).toBeVisible();
  });

  test("pressing inside the chat keeps it open", async ({ page }) => {
    await openChat(page);
    await page.getByLabel("Message to Pip").click();
    await page.locator(".chat-log").click({ position: { x: 10, y: 10 } });
    await expect(chat(page)).toBeVisible();
  });

  test("Escape closes it and puts focus back on the chat button", async ({ page }) => {
    await openChat(page);
    await page.getByLabel("Message to Pip").focus();
    await page.keyboard.press("Escape");
    await expect(chat(page)).toBeHidden();
    await expect(page.getByRole("button", { name: "Chat with Pip" })).toBeFocused();
  });

  test("the chat button still opens and closes it (the outside-press rule does not fight it)", async ({ page }) => {
    await openChat(page);
    await page.getByRole("button", { name: "Close chat with Pip" }).click();
    await expect(chat(page)).toBeHidden();
    await page.getByRole("button", { name: "Chat with Pip" }).click();
    await expect(chat(page)).toBeVisible();
  });
});
