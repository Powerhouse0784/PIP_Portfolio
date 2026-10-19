"use client";

/**
 * The last safety net. app/error.tsx catches problems inside a page, but a crash in the root layout itself (the opening
 * scene, sound, the sticker book...) would otherwise show a blank white page. This shows a kind message instead.
 * It replaces the whole document, so it cannot rely on globals.css and styles itself.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#fff8f1", color: "#5c4033", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", textAlign: "center", padding: 24 }}>
        <main>
          <p style={{ color: "#a34063", letterSpacing: ".12em", textTransform: "uppercase", fontSize: ".8rem", fontWeight: 700, margin: 0 }}>Oh no</p>
          <h1 style={{ fontSize: "clamp(1.8rem,6vw,3rem)", margin: "10px 0 14px" }}>Pip tripped over a blanket.</h1>
          <p style={{ maxWidth: "34ch", margin: "0 auto 24px", lineHeight: 1.5 }}>Something went wrong, nothing scary, just sleepy. Let’s try again.</p>
          <button onClick={reset} style={{ minHeight: 44, padding: "0 24px", borderRadius: 999, border: 0, background: "#a34063", color: "#fff", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
