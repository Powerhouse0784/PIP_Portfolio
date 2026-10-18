import { test, expect } from "@playwright/test";
import { TagFilter } from "../src/lib/tagStream";

const run = (chunks: string[], max?: number) => {
  const f = new TagFilter(max);
  return chunks.map((c) => f.feed(c)).join("") + f.flush();
};

// Pure logic: no browser or server needed.
test.describe("streamed reply tag filter", () => {
  test("plain text passes straight through", () => {
    expect(run(["Hello, ", "sleepy", "head!"])).toBe("Hello, sleepyhead!");
  });
  test("tags are removed even when split across chunks", () => {
    expect(run(["Hi there *giggle* {mo", "od:gig", "gly} {go:", "toys}"]).trim()).toBe("Hi there *giggle*"); // the visible text is trimmed by the client and the final reply
    expect(run(["Spin! {a", "ct:dance}"])).toBe("Spin! ");
  });
  test("an ordinary brace in the story is kept", () => {
    expect(run(["a {b} c"])).toBe("a {b} c");
    expect(run(["curly { bracket and then a very long sentence follows here"])).toContain("curly { bracket and then");
  });
  test("an unfinished tag at the end is dropped, unfinished normal text is kept", () => {
    expect(run(["Bye {go:to"])).toBe("Bye ");
    expect(run(["Bye {nope"])).toBe("Bye {nope");
  });
  test("characters the UI strips are removed and output is capped", () => {
    expect(run(["a_b `c` #d >e"])).toBe("ab c d e");
    expect(run(["x".repeat(400)], 260)).toHaveLength(260);
    expect(run(["x".repeat(200), "y".repeat(200)], 260)).toHaveLength(260);
  });
});
