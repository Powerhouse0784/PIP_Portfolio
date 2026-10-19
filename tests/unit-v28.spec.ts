import { test, expect } from "@playwright/test";
import { looksLikeLink } from "../src/lib/guestbookRules";

test.describe("guestbook link rule", () => {
  test("real links are blocked", () => {
    for (const s of ["visit https://example.com now", "http://x.io", "go to www.shop.net", "buy at cheap-pills.com", "mail me at kid@gmail.com", "bit.ly", "my site shop.store is cool", "HTTPS://LOUD.COM"]) {
      expect(looksLikeLink(s), s).toBe(true);
    }
  });
  test("careless typing and ordinary kind words are NOT links", () => {
    for (const s of ["I love it.Me too", "Pip is the best.Co-op games next", "Thank you, Pip!", "Sweet dreams... see you soon.", "Ok.Me and my sister love you", "I'm 7. My dog is 3.", "a.b", "Hello.World", "Dr. Moon says hi", "dreams.Io is a nice word"]) {
      expect(looksLikeLink(s), s).toBe(false);
    }
  });
});
