export type Card = { kicker: string; title: string; big: string; unit: string; lines: string[]; filename: string; shareText: string };

const W = 1080, H = 1350;
const fam = (cssVar: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return v ? `${v}, ${fallback}` : fallback;
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = []; let line = "";
  for (const word of text.split(/\s+/)) {
    const t = line ? `${line} ${word}` : word;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

const loadImg = (src: string) => new Promise<HTMLImageElement | null>((res) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src;
});

/** Draws a 1080x1350 keepsake card on a canvas. Uses only same-origin art, so the canvas is never tainted. */
export async function renderCard(c: Card): Promise<Blob> {
  const serif = fam("--font-serif", "Georgia, serif"), ui = fam("--font-ui", "'Trebuchet MS', sans-serif"), body = fam("--font-body", "system-ui, sans-serif");
  try { await Promise.all([document.fonts.load(`700 90px ${serif}`), document.fonts.load(`600 36px ${ui}`), document.fonts.load(`500 40px ${body}`)]); } catch {}
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"); if (!ctx) throw new Error("no canvas");

  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#fff8f1"); g.addColorStop(1, "#f3dff0");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 46; i++) { // deterministic twinkles
    ctx.fillStyle = `rgba(231,185,95,${0.25 + ((i * 37) % 50) / 100})`;
    ctx.beginPath(); ctx.arc(((i * 211) % W), ((i * 389) % H), 2 + (i % 4), 0, 7); ctx.fill();
  }
  ctx.setLineDash([14, 12]); ctx.lineWidth = 4; ctx.strokeStyle = "#d9b98f";
  ctx.beginPath(); ctx.roundRect(36, 36, W - 72, H - 72, 36); ctx.stroke(); ctx.setLineDash([]);

  ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#a34063"; ctx.font = `600 34px ${ui}`;
  ctx.fillText(`✦ ${c.kicker.toUpperCase()}`, 90, 130);
  ctx.fillStyle = "#5c4033"; ctx.font = `700 76px ${serif}`;
  wrap(ctx, c.title, W - 180).slice(0, 2).forEach((l, i) => ctx.fillText(l, 90, 235 + i * 88));

  ctx.fillStyle = "#a34063"; ctx.font = `700 260px ${serif}`; ctx.fillText(c.big, 84, 640);
  ctx.fillStyle = "#806c63"; ctx.font = `600 52px ${ui}`; ctx.fillText(c.unit, 94, 710);

  ctx.fillStyle = "#5c4033"; ctx.font = `500 40px ${body}`;
  let y = 810;
  for (const l of c.lines.slice(0, 3)) for (const w of wrap(ctx, l, 470).slice(0, 4)) { ctx.fillText(w, 90, y); y += 56; }

  const pip = await loadImg("/images/wave.webp");
  if (pip) { const pw = 500, ph = pw * (pip.naturalHeight / pip.naturalWidth); ctx.drawImage(pip, W - pw - 50, H - ph - 120, pw, ph); }

  ctx.textAlign = "center"; ctx.fillStyle = "#a34063"; ctx.font = `600 34px ${ui}`;
  ctx.fillText("Pip’s Dream Workshop · Midnight Nursery", W / 2, H - 78);
  ctx.fillStyle = "#806c63"; ctx.font = `500 28px ${ui}`; ctx.fillText("Signed, Pip ✦", W / 2, H - 44);

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
}

/** Native share sheet with the image where supported (phones), otherwise a PNG download. */
export async function shareCard(c: Card): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = await renderCard(c);
  const file = new File([blob], c.filename, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Pip’s Dream Workshop", text: c.shareText }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = c.filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  return "downloaded";
}
