import type { R } from "@/lib/receipt";

/** The "dream delivery receipt" that appears after a project interaction. */
export default function Receipt({ r }: { r: R | null }) {
  if (!r) return null;
  return (
    <div className="receipt" key={r.n}>
      🧾 Dream delivery receipt #{String(r.n).padStart(3, "0")}
      <br />
      {r.text}
      <br />
      Signed, Pip ✦
    </div>
  );
}
