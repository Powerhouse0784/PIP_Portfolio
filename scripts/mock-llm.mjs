#!/usr/bin/env node
/**
 * A tiny fake Gemini / Grok / Groq for developing and testing Pip's chat without spending API quota.
 *
 *   node scripts/mock-llm.mjs                      # listens on :4010
 *   GEMINI_API_KEY=mock GEMINI_API_BASE=http://localhost:4010/v1beta npm run dev
 *
 * It streams a canned reply in small pieces (with the {mood:..} / {go:..} tags deliberately split across chunks) and echoes
 * the "Right now:" context line it was given, so you can see exactly what the model would see.
 * Send a message containing "boom" to make the mock fail with a 500, to test the fallbacks.
 */
import http from "node:http";

const PORT = Number(process.env.PORT ?? 4010);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const compose = (system, last) => {
  const ctx = /Right now: ([^\n]*)/.exec(system)?.[1] ?? "no context";
  const recent = /Your last replies were: ([^\n]*)/.exec(system) ? "I remember what I said." : "First thing I say.";
  const act = /dance/i.test(last) ? " *twirls* {act:dance}" : "";
  return `Mock Pip hears "${last.slice(0, 40)}". (${ctx}) ${recent} *giggle*${act} {mood:giggly} {go:toys}`;
};
const pieces = (t) => t.match(/.{1,9}/gs) ?? [t];

const read = (req) => new Promise((res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => res(b)); });

http.createServer(async (req, res) => {
  const url = req.url ?? "";
  const body = JSON.parse((await read(req)) || "{}");
  const gemini = url.includes("generateContent") || url.includes("streamGenerateContent");
  const system = gemini ? body.systemInstruction?.parts?.[0]?.text ?? "" : body.messages?.[0]?.content ?? "";
  const last = gemini ? body.contents?.at(-1)?.parts?.[0]?.text ?? "" : body.messages?.at(-1)?.content ?? "";
  if (/boom/i.test(last)) { res.writeHead(500).end("mock failure"); return; }
  const text = compose(system, last);

  const stream = url.includes("streamGenerateContent") || body.stream === true;
  if (!stream) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(gemini ? { candidates: [{ content: { parts: [{ text }] } }] } : { choices: [{ message: { content: text } }] }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
  for (const p of pieces(text)) {
    res.write(`data: ${JSON.stringify(gemini ? { candidates: [{ content: { parts: [{ text: p }] } }] } : { choices: [{ delta: { content: p } }] })}\n\n`);
    await sleep(25);
  }
  if (!gemini) res.write("data: [DONE]\n\n");
  res.end();
}).listen(PORT, () => console.log(`mock LLM on http://localhost:${PORT}`));
