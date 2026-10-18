import { OUTFITS, type OutfitId } from "./outfits";

const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("image")); i.src = src;
});
const round = (x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number) => {
  x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
};

/** A 1080x1350 polaroid of Pip in his current outfit, on a night-sky card. Returns a PNG data URL. */
export async function makePhoto(outfit: OutfitId, caption: string): Promise<string> {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  if (!x) throw new Error("canvas");
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#29234a"); g.addColorStop(0.5, "#44305d"); g.addColorStop(1, "#1b2e57");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,232,170,${0.25 + Math.random() * 0.6})`; x.beginPath(); x.arc(Math.random() * W, Math.random() * H, Math.random() * 2.4 + 0.6, 0, 7); x.fill(); }
  x.fillStyle = "#fffaf2"; round(x, 90, 100, 900, 1090, 28); x.fill();

  const px = 130, py = 140, pw = 820, ph = 820;
  x.save(); round(x, px, py, pw, ph, 18); x.clip();
  x.fillStyle = "#f9f0df"; x.fillRect(px, py, pw, ph);
  const art = await load("/images/hero.webp");
  const sy = 90, sh = ph / (pw / art.width); // source crop: head, lantern and music box
  x.drawImage(art, 0, sy, art.width, sh, px, py, pw, ph);
  const o = OUTFITS.find((f) => f.id === outfit);
  if (o?.svg) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 931" width="1240" height="1862">${o.svg}</svg>`;
    const img = await load(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    x.drawImage(img, 0, sy * 2, 1240, sh * 2, px, py, pw, ph);
  }
  x.restore();

  x.textAlign = "center";
  x.fillStyle = "#5c4033"; x.font = "600 56px Fraunces, Georgia, serif"; x.fillText("Pip’s Dream Corner", W / 2, 1045);
  x.fillStyle = "#806c63"; x.font = "400 34px system-ui, sans-serif"; x.fillText(caption, W / 2, 1105);
  x.fillStyle = "#a34063"; x.font = "600 32px system-ui, sans-serif"; x.fillText("✦ sweet dreams ✦", W / 2, 1160);
  return c.toDataURL("image/png");
}
