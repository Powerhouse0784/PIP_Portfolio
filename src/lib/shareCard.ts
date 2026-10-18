import { litPath } from "./sky";
import { dreamArtSrc, type ArtFeel } from "./dreamArt";

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
async function deliver(blob: Blob, filename: string, shareText: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Pip’s Dream Workshop", text: shareText }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  return "downloaded";
}

export async function shareCard(c: Card): Promise<"shared" | "downloaded" | "cancelled"> {
  return deliver(await renderCard(c), c.filename, c.shareText);
}

export type DreamCard = { dateLabel: string; moonName: string; phase: number; title: string; text: string; nights: number; filename: string; shareText: string; art?: { seed: string; feeling: ArtFeel; text?: string } };

/** The daily dream card: a 1080x1350 night-sky keepsake with the real moon phase, the dream, and Pip in his arched window. */
export async function renderDreamCard(c: DreamCard): Promise<Blob> {
  const serif = fam("--font-serif", "Georgia, serif"), ui = fam("--font-ui", "'Trebuchet MS', sans-serif"), body = fam("--font-body", "system-ui, sans-serif");
  try { await Promise.all([document.fonts.load(`700 80px ${serif}`), document.fonts.load(`600 34px ${ui}`), document.fonts.load(`500 42px ${body}`)]); } catch {}
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"); if (!ctx) throw new Error("no canvas");

  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#14112a"); g.addColorStop(0.55, "#2b2142"); g.addColorStop(1, "#5b3f6b");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // The dream's own painted night scene (same-origin data URI, so the canvas is never tainted), dimmed so the words stay readable.
  const art = c.art ? await loadImg(dreamArtSrc(c.art.seed, c.art.feeling, c.art.text)).catch(() => null) : null;
  if (art) {
    ctx.drawImage(art, 0, 0, W, H);
    const v = ctx.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, "rgba(14,11,32,.30)"); v.addColorStop(0.22, "rgba(14,11,32,.66)"); v.addColorStop(0.7, "rgba(14,11,32,.74)"); v.addColorStop(1, "rgba(14,11,32,.38)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  for (let i = 0; i < (art ? 0 : 90); i++) { // deterministic stars
    ctx.fillStyle = `rgba(255,${226 + (i % 3) * 8},${170 + (i % 5) * 12},${0.25 + ((i * 29) % 60) / 100})`;
    ctx.beginPath(); ctx.arc((i * 211) % W, (i * 389) % H, 1.2 + (i % 4) * 0.7, 0, 7); ctx.fill();
  }
  ctx.setLineDash([14, 12]); ctx.lineWidth = 4; ctx.strokeStyle = "rgba(242,197,107,.55)";
  ctx.beginPath(); ctx.roundRect(36, 36, W - 72, H - 72, 36); ctx.stroke(); ctx.setLineDash([]);

  // the real moon for that night
  const mx = W - 170, my = 190, r = 70;
  ctx.fillStyle = "#3a2f55"; ctx.beginPath(); ctx.arc(mx, my, r, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(mx, my); ctx.shadowColor = "rgba(246,217,138,.8)"; ctx.shadowBlur = 24; ctx.fillStyle = "#f6d98a";
  ctx.fill(new Path2D(litPath(c.phase, r))); ctx.restore();

  ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#f19abb"; ctx.font = `600 32px ${ui}`;
  ctx.fillText("✦ TONIGHT’S DREAM CARD", 90, 124);
  ctx.fillStyle = "#e6d2dc"; ctx.font = `500 30px ${ui}`;
  ctx.fillText(`${c.dateLabel} · ${c.moonName}`, 90, 172);

  ctx.fillStyle = "#fff0e5"; ctx.font = `700 78px ${serif}`;
  let y = 330;
  for (const l of wrap(ctx, c.title, W - 180).slice(0, 2)) { ctx.fillText(l, 90, y); y += 90; }
  y += 14;
  ctx.fillStyle = "#f2c56b"; ctx.fillRect(90, y - 50, 120, 5);
  y += 20;
  ctx.fillStyle = "#f6e9ef"; ctx.font = `500 42px ${body}`;
  for (const l of wrap(ctx, c.text, W - 180).slice(0, 13)) { ctx.fillText(l, 90, y + 30); y += 60; }

  // Pip in his arched window, in whatever room is left under the text
  const pip = await loadImg("/images/wave.webp");
  const room = H - 150 - (y + 30);
  if (pip && room > 200) {
    const ph = Math.min(430, room), pw = ph / (pip.naturalHeight / pip.naturalWidth) * 0.92;
    const px = W - pw - 90, py = H - 140 - ph;
    ctx.save(); ctx.beginPath(); ctx.roundRect(px, py, pw, ph, [pw / 2, pw / 2, 28, 28]); ctx.clip();
    ctx.fillStyle = "#f9f0df"; ctx.fillRect(px, py, pw, ph);
    const s = Math.max(pw / pip.naturalWidth, ph / pip.naturalHeight);
    ctx.drawImage(pip, px + (pw - pip.naturalWidth * s) / 2, py + (ph - pip.naturalHeight * s) * 0.35, pip.naturalWidth * s, pip.naturalHeight * s);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,230,190,.6)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, [pw / 2, pw / 2, 28, 28]); ctx.stroke();
  }

  ctx.textAlign = "left"; ctx.fillStyle = "#e6d2dc"; ctx.font = `600 30px ${ui}`;
  ctx.fillText(c.nights > 1 ? `Night ${c.nights} of my dream diary` : "The first page of my dream diary", 90, H - 150);
  ctx.textAlign = "center"; ctx.fillStyle = "#f19abb"; ctx.font = `600 34px ${ui}`;
  ctx.fillText("Pip’s Dream Workshop · Midnight Nursery", W / 2, H - 78);
  ctx.fillStyle = "#d3b7c3"; ctx.font = `500 28px ${ui}`; ctx.fillText("Signed, Pip ✦", W / 2, H - 44);

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
}

export async function shareDreamCard(c: DreamCard) {
  return deliver(await renderDreamCard(c), c.filename, c.shareText);
}
