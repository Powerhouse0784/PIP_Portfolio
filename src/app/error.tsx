"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="top" style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
      <div>
        <p className="label">Oh no</p>
        <h1 style={{ fontSize: "clamp(2rem,6vw,3.2rem)", margin: "10px 0 16px" }}>Pip tripped over a blanket.</h1>
        <p className="lede" style={{ color: "var(--muted)", marginBottom: 24 }}>Something went wrong. Nothing scary, just sleepy.</p>
        <button className="btn" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
