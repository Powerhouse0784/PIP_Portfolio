"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useAudio } from "./Providers";
import Receipt from "./Receipt";
import { nextReceipt, type R } from "@/lib/receipt";
import { pick, say } from "@/lib/pipSay";
import { unlock } from "@/lib/progress";
import Reactions from "./Reactions";
import type { GbEntry } from "@/lib/guestbookTypes";
import type { NoteDetail, TintFinal } from "@/lib/tint";

const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98]; // C major pentatonic, two octaves
const NOTE_NAMES = ["C", "D", "E", "G", "A", "C", "D", "E", "G"];
const ARCH_W = 3.2, ARCH_H = 4.8; // Pip's window: big, so he is the star of the scene (stars orbit outside it)

const isNight = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "night" : matchMedia("(prefers-color-scheme:dark)").matches;
};

function archShape(w: number, h: number) {
  const s = new THREE.Shape(), r = w / 2, b = Math.min(0.55, r * 0.45); // soft, clearly rounded bottom corners
  s.moveTo(-r + b, -h / 2);
  s.lineTo(r - b, -h / 2); s.quadraticCurveTo(r, -h / 2, r, -h / 2 + b);
  s.lineTo(r, h / 2 - r); s.absarc(0, h / 2 - r, r, 0, Math.PI, false);
  s.lineTo(-r, -h / 2 + b); s.quadraticCurveTo(-r, -h / 2, -r + b, -h / 2);
  return s;
}
function starShape(outer: number, inner: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? inner : outer;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}
function moonShape() {
  const s = new THREE.Shape();
  s.absarc(0, 0, 0.62, Math.PI * 0.42, Math.PI * 1.58, false);
  s.absarc(0.2, 0, 0.5, Math.PI * 1.45, Math.PI * 0.55, true);
  return s;
}
function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,226,160,1)"); g.addColorStop(0.35, "rgba(255,196,130,.45)"); g.addColorStop(1, "rgba(255,180,140,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Fold a lullaby note into the pentatonic scale of the stars: same pitch class lights the matching star. */
function noteToStar(f: number, i: number) {
  let x = f;
  while (x < NOTES[0]) x *= 2;
  while (x >= NOTES[0] * 2) x /= 2;
  let pc = 0, best = Infinity;
  for (let k = 0; k < 5; k++) { const d = Math.abs(Math.log2(x / NOTES[k])); if (d < best) { best = d; pc = k; } }
  return pc + (i % 2 && pc + 5 < NOTES.length ? 5 : 0);
}
const hashId = (n: number) => { let h = n * 2654435761 >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; };

type Api = { ring: (i?: number) => void; turn: (d: number) => void; setStill: (v: boolean) => void; wish: (id: number) => void; syncWishes: (es: GbEntry[]) => void };

/**
 * Tier 3: a real WebGL (Three.js) diorama. Pip's official art sits in an arched window while gold stars,
 * a crescent moon and a cloud orbit in true 3D around it. Drag (or use the arrow buttons) to turn the scene,
 * tap a star to ring a pentatonic chime. Lazy-loaded, pauses off-screen, respects reduced motion, and falls back
 * to the flat art if WebGL is unavailable.
 */
export default function DreamMobile() {
  const box = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const { blip, play } = useAudio();
  const blipRef = useRef(blip);
  blipRef.current = blip;
  const playRef = useRef(play);
  playRef.current = play;
  const [failed, setFailed] = useState(false);
  const [still, setStill] = useState(false);
  const [rung, setRung] = useState<Set<number>>(new Set());
  const [rec, setRec] = useState<R | null>(null);
  const [wishes, setWishes] = useState<GbEntry[]>([]);
  const [wishSel, setWishSel] = useState<GbEntry | null>(null);
  const onWishRef = useRef<(e: GbEntry) => void>(() => {});
  onWishRef.current = setWishSel;
  const rungRef = useRef(rung);
  rungRef.current = rung;

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch { setFailed(true); return; }

    const rm = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.className = "gl";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    const world = new THREE.Group();
    scene.add(world);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T) => { disposables.push(o); return o; };

    // lights
    const amb = new THREE.AmbientLight(0xffe9dc, 0.9);
    const key = new THREE.DirectionalLight(0xfff0dd, 1.4); key.position.set(3, 5, 6);
    const warm = new THREE.PointLight(0xffc27a, 0, 14); warm.position.set(0, 0.4, 3);
    scene.add(amb, key, warm);
    let glowBase = 0.45, warmBase = 0, glowPulse = 0; // pulses ride on top of the theme's base light

    // Pip's arched window (official art, drawn into a canvas texture so the arch edge stays crisp)
    const pipMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    const archGeo = track(new THREE.ShapeGeometry(archShape(ARCH_W, ARCH_H), 24));
    // ShapeGeometry UVs are in shape units; remap to 0..1 over the arch bounds.
    const uv = archGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / ARCH_W + 0.5, uv.getY(i) / ARCH_H + 0.5);
    const pip = new THREE.Mesh(archGeo, pipMat);
    world.add(pip);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = 620; c.height = 931;
      const x = c.getContext("2d");
      if (!x) return;
      x.drawImage(img, 0, 0, c.width, c.height);
      const tex = track(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      pipMat.map = tex; pipMat.needsUpdate = true; need = 2;
    };
    img.src = "/images/hero.webp";

    const frameMat = track(new THREE.MeshBasicMaterial({ color: 0xf0b3c8 }));
    const archFrame = new THREE.Mesh(track(new THREE.ShapeGeometry(archShape(ARCH_W + 0.2, ARCH_H + 0.2), 24)), frameMat);
    archFrame.position.z = -0.03; world.add(archFrame);

    const glowTex = track(glowTexture());
    const glowMat = track(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    const glow = new THREE.Sprite(glowMat); glow.scale.set(7.2, 7.2, 1); glow.position.z = -0.6; world.add(glow);

    // cloud under the arch
    const cloudMat = track(new THREE.MeshStandardMaterial({ color: 0xfff1f5, roughness: 0.95, emissive: 0xffc9dc, emissiveIntensity: 0.12 }));
    const cloud = new THREE.Group();
    const puffGeo = track(new THREE.SphereGeometry(1, 20, 16));
    ([[-1.4, 0, 0.55], [-0.6, 0.18, 0.8], [0.25, 0.28, 0.9], [1.05, 0.12, 0.7], [1.65, -0.04, 0.5], [0.2, -0.1, 0.8]] as const).forEach(([px, py, s]) => {
      const m = new THREE.Mesh(puffGeo, cloudMat); m.position.set(px, py, 0.1); m.scale.set(s, s * 0.72, s * 0.8); cloud.add(m);
    });
    cloud.position.set(0, -ARCH_H / 2 - 0.25, 0.3); world.add(cloud);

    // crescent moon hanging from a thread
    const goldMat = track(new THREE.MeshStandardMaterial({ color: 0xf4c869, roughness: 0.4, metalness: 0.15, emissive: 0xf0a940, emissiveIntensity: 0.35 }));
    const moonGeo = track(new THREE.ExtrudeGeometry(moonShape(), { depth: 0.16, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3, curveSegments: 28 }));
    moonGeo.center();
    const moon = new THREE.Group();
    const moonMesh = new THREE.Mesh(moonGeo, goldMat); moon.add(moonMesh);
    const thread = new THREE.Mesh(track(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 6)), track(new THREE.MeshBasicMaterial({ color: 0xd9b98f })));
    thread.position.y = 1.0; moon.add(thread);
    moon.position.set(-2.7, 1.9, 0.9); world.add(moon);

    // orbiting, clickable stars
    const starGeo = track(new THREE.ExtrudeGeometry(starShape(0.34, 0.15), { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }));
    starGeo.center();
    const colors = [0xf4c869, 0xf6b3cb, 0xd8c6ef, 0xf4c869, 0xf6b3cb, 0xffe19a, 0xd8c6ef, 0xf4c869, 0xffe19a];
    type S = { m: THREE.Mesh; r: number; a: number; v: number; y: number; s: number; pop: number; flash: number; hue: THREE.MeshStandardMaterial };
    const stars: S[] = colors.map((col, i) => {
      const hue = track(new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.1, emissive: col, emissiveIntensity: 0.3 }));
      const m = new THREE.Mesh(starGeo, hue);
      m.userData.i = i; world.add(m);
      return { m, hue, r: 2.65 + (i % 4) * 0.42, a: (i / colors.length) * Math.PI * 2, v: (0.12 + (i % 3) * 0.05) * (i % 2 ? -1 : 1), y: -2.0 + ((i * 0.73) % 4.6), s: 0.8 + (i % 3) * 0.22, pop: 0, flash: 0 };
    });

    // wish wall: every approved guestbook note floats as a small pink-white star. Tap one to read it.
    type W = { m: THREE.Mesh; e: GbEntry; r: number; a: number; v: number; y: number; s: number; pop: number; born: number };
    const wishGeo = track(new THREE.ExtrudeGeometry(starShape(0.3, 0.13), { depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }));
    wishGeo.center();
    const wishMat = track(new THREE.MeshStandardMaterial({ color: 0xffeef6, roughness: 0.3, metalness: 0.05, emissive: 0xff9cc2, emissiveIntensity: 0.55 }));
    const wishMap = new Map<number, W>();
    const wishMeshes = () => Array.from(wishMap.values()).map((w) => w.m);
    const syncWishes = (list: GbEntry[]) => {
      const keep = new Set(list.map((e) => e.id));
      wishMap.forEach((w, id) => { if (!keep.has(id)) { world.remove(w.m); wishMap.delete(id); } });
      for (const e of list) {
        if (wishMap.has(e.id)) { wishMap.get(e.id)!.e = e; continue; }
        const h = hashId(e.id), h2 = hashId(e.id + 17);
        const m = new THREE.Mesh(wishGeo, wishMat);
        m.userData.wid = e.id; m.scale.setScalar(0.001); world.add(m);
        wishMap.set(e.id, { m, e, r: 2.5 + h * 1.2, a: h2 * Math.PI * 2, v: (0.05 + h * 0.06) * (h2 > 0.5 ? 1 : -1), y: -2.1 + h2 * 4.3, s: 0.62 + h * 0.3, pop: 0, born: clock.getElapsedTime() });
      }
      need = 2;
    };
    const pickWish = (id: number) => {
      const w = wishMap.get(id); if (!w) return;
      w.pop = 1; need = 2;
      blipRef.current(NOTES[id % NOTES.length]);
      const wp = new THREE.Vector3(); w.m.getWorldPosition(wp); burst(wp, 0xff9cc2);
      onWishRef.current(w.e);
    };

    // drifting dust
    const N = 140, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 9; pos[i * 3 + 1] = (Math.random() - 0.5) * 6.5; pos[i * 3 + 2] = (Math.random() - 0.5) * 6; }
    const dustGeo = track(new THREE.BufferGeometry()); dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dustMat = track(new THREE.PointsMaterial({ color: 0xffe6a8, size: 0.05, transparent: true, opacity: 0.5, depthWrite: false }));
    const dust = new THREE.Points(dustGeo, dustMat); world.add(dust);

    // burst particles for a rung star
    const bursts: { p: THREE.Points; life: number; v: Float32Array }[] = [];
    const burst = (at: THREE.Vector3, col: number) => {
      const n = 22, p = new Float32Array(n * 3), v = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), sp = 0.8 + Math.random() * 1.4;
        v[i * 3] = Math.sin(ph) * Math.cos(th) * sp; v[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * sp; v[i * 3 + 2] = Math.cos(ph) * sp;
        p[i * 3] = at.x; p[i * 3 + 1] = at.y; p[i * 3 + 2] = at.z;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      const m = new THREE.PointsMaterial({ color: col, size: 0.09, transparent: true, opacity: 1, depthWrite: false });
      const pts = new THREE.Points(g, m); scene.add(pts); bursts.push({ p: pts, life: 1, v });
    };

    // theme
    const applyTheme = () => {
      const n = isNight();
      amb.intensity = n ? 0.45 : 0.9; key.intensity = n ? 0.9 : 1.4; warmBase = n ? 26 : 5; warm.intensity = warmBase;
      glowBase = n ? 0.8 : 0.4; glowMat.opacity = glowBase; dustMat.opacity = n ? 0.9 : 0.35;
      wishMat.emissiveIntensity = n ? 0.9 : 0.5;
      frameMat.color.set(n ? 0xf19abb : 0xf0b3c8);
      goldMat.emissiveIntensity = n ? 0.8 : 0.35;
      stars.forEach((s) => { s.hue.emissiveIntensity = n ? 0.85 : 0.3; });
      cloudMat.emissiveIntensity = n ? 0.04 : 0.12;
      need = 2;
    };
    const mo = new MutationObserver(applyTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // sizing keeps everything in frame on narrow phones
    let W = 0, H = 0, dist = 8, k = 1;
    const resize = () => {
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return;
      renderer.setSize(W, H, false);
      const aspect = W / H;
      camera.aspect = aspect; k = Math.min(1, Math.max(0.62, aspect / 1.3));
      // Fit both ways: the stars' ring must fit the width, and the arch (plus the cloud under it) must fit the height.
      const half = Math.tan((camera.fov * Math.PI) / 360);
      dist = Math.max(8.2, (4.05 * k + 0.4) / (half * aspect), 3.25 / half);
      camera.updateProjectionMatrix(); need = 2;
    };
    const ro = new ResizeObserver(resize); ro.observe(host);

    // own orbit (drag, buttons, keys) so touch + keyboard are first-class
    let yaw = 0, pitch = 0.08, tYaw = 0, tPitch = 0.08, hold = false, still_ = rm, drag = false, lx = 0, ly = 0, moved = 0;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const down = (e: PointerEvent) => { drag = true; moved = 0; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (!drag) { hover(e); return; }
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      tYaw = clamp(tYaw + dx * 0.008, -1.0, 1.0);
      if (e.pointerType === "mouse") tPitch = clamp(tPitch + dy * 0.005, -0.35, 0.5);
      need = 2;
    };
    const up = (e: PointerEvent) => {
      drag = false; try { canvas.releasePointerCapture(e.pointerId); } catch {}
      if (moved < 6) tap(e);
    };

    const ray = new THREE.Raycaster(), nd = new THREE.Vector2();
    const hit = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      nd.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(nd, camera);
      const h = ray.intersectObjects([...stars.map((s) => s.m), ...wishMeshes()], false)[0];
      if (!h) return null;
      return h.object.userData.wid !== undefined ? { wish: h.object.userData.wid as number } : { star: h.object.userData.i as number };
    };
    const hover = (e: PointerEvent) => { if (e.pointerType === "mouse") canvas.style.cursor = hit(e) ? "pointer" : "grab"; };
    const tap = (e: PointerEvent) => { const h = hit(e); if (!h) return; if (h.wish !== undefined) pickWish(h.wish); else ring(h.star); };

    const ring = (idx?: number) => {
      const i = idx ?? stars.findIndex((_, j) => !rungRef.current.has(j));
      const j = i < 0 ? Math.floor(Math.random() * stars.length) : i;
      const s = stars[j];
      s.pop = 1; need = 2;
      blipRef.current(NOTES[j]);
      unlock("mobile3d");
      const wp = new THREE.Vector3(); s.m.getWorldPosition(wp); burst(wp, colors[j]);
      // Side effects (say, sounds) must not live inside a state updater: React runs those during render.
      const prev = rungRef.current;
      if (!prev.has(j)) {
        const next = new Set(prev); next.add(j);
        rungRef.current = next;
        setRung(next);
        if (next.size === stars.length) { say("You rang every star! Make a wish, quietly."); window.setTimeout(() => playRef.current("sparkle"), 450); }
        else if (next.size === 1) say(pick(["Ooh, a " + NOTE_NAMES[j] + "! Ring them all.", "That star hums in " + NOTE_NAMES[j] + ". Hehe."]));
      }
      setRec(nextReceipt(`Rang a ${NOTE_NAMES[j]} star on the dream mobile.`));
    };
    const turn = (d: number) => { tYaw = clamp(tYaw + d, -1.0, 1.0); need = 2; };
    api.current = { ring, turn, setStill: (v) => { still_ = v; need = 2; }, wish: pickWish, syncWishes };

    canvas.style.cursor = "grab"; canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", () => { drag = false; });

    // render loop: only while on screen and the tab is visible
    let raf = 0, visible = false, last = 0, need = 2;
    const clock = new THREE.Clock();
    const frame = () => {
      raf = 0;
      if (!visible || document.hidden) return;
      const t = clock.getElapsedTime(), dt = Math.min(0.05, t - last); last = t;
      const moving = !still_ && !hold;
      yaw += (tYaw - yaw) * 0.12; pitch += (tPitch - pitch) * 0.12;
      if (moving && !drag) tYaw += Math.sin(t * 0.35) * 0.0016;
      camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
      camera.lookAt(0, 0, 0);
      pip.position.y = moving ? Math.sin(t * 0.9) * 0.05 : 0; archFrame.position.y = pip.position.y;
      cloud.position.y = -ARCH_H / 2 - 0.25 + (moving ? Math.sin(t * 0.7 + 1) * 0.06 : 0);
      moon.rotation.z = moving ? Math.sin(t * 0.8) * 0.12 : 0; moon.rotation.y = moving ? Math.sin(t * 0.5) * 0.35 : 0;
      for (const s of stars) {
        if (moving) s.a += s.v * dt;
        const rr = s.r * k;
        s.m.position.set(Math.cos(s.a) * rr, s.y * (0.6 + 0.4 * k) + (moving ? Math.sin(t * 1.2 + s.a) * 0.08 : 0), Math.sin(s.a) * rr * 0.9 + 0.3);
        s.pop = Math.max(0, s.pop - dt * 2.2);
        const sc = s.s * (1 + s.pop * 0.7) * (0.85 + 0.15 * k);
        s.m.scale.setScalar(sc);
        s.m.rotation.y += moving ? dt * 0.8 : 0; s.m.rotation.z = Math.sin(s.a * 2) * 0.2;
        s.flash = Math.max(0, s.flash - dt * 3.2);
        const base = rungRef.current.has(stars.indexOf(s)) ? (isNight() ? 0.95 : 0.6) : (isNight() ? 0.85 : 0.3);
        s.hue.emissiveIntensity = base + s.flash * 1.1;
      }
      wishMap.forEach((w) => {
        if (moving) w.a += w.v * dt;
        const rr = w.r * k, grow = Math.min(1, (t - w.born) * 1.4);
        w.m.position.set(Math.cos(w.a) * rr, w.y * (0.6 + 0.4 * k) + (moving ? Math.sin(t * 1.1 + w.a * 3) * 0.1 : 0), Math.sin(w.a) * rr * 0.9 - 0.2);
        w.pop = Math.max(0, w.pop - dt * 2);
        w.m.scale.setScalar(Math.max(0.001, w.s * (0.85 + 0.15 * k) * (1 + w.pop * 0.9) * (1 - (1 - grow) ** 3)));
        w.m.rotation.y += moving ? dt * 0.6 : 0; w.m.rotation.z = Math.sin(w.a * 2) * 0.2;
      });
      glowPulse = Math.max(0, glowPulse - dt * 3);
      glowMat.opacity = glowBase + glowPulse * 0.4;
      warm.intensity = warmBase + glowPulse * Math.max(6, warmBase * 0.6);
      if (moving) dust.rotation.y += dt * 0.015;
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]; b.life -= dt * 1.4;
        const a = b.p.geometry.attributes.position as THREE.BufferAttribute;
        for (let j = 0; j < a.count; j++) a.setXYZ(j, a.getX(j) + b.v[j * 3] * dt, a.getY(j) + b.v[j * 3 + 1] * dt, a.getZ(j) + b.v[j * 3 + 2] * dt);
        a.needsUpdate = true; (b.p.material as THREE.PointsMaterial).opacity = Math.max(0, b.life);
        if (b.life <= 0) { scene.remove(b.p); b.p.geometry.dispose(); (b.p.material as THREE.Material).dispose(); bursts.splice(i, 1); }
      }
      renderer.render(scene, camera);
      const idle = !moving && !drag && bursts.length === 0 && glowPulse === 0 && Math.abs(tYaw - yaw) < 0.0005 && Math.abs(tPitch - pitch) < 0.0005
        && stars.every((s) => s.pop === 0 && s.flash === 0) && Array.from(wishMap.values()).every((w) => w.pop === 0 && (t - w.born) * 1.4 >= 1);
      if (idle && need <= 0) return; // fully still: stop drawing until something changes
      need = Math.max(0, need - 1);
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && visible && !document.hidden) { clock.getDelta(); raf = requestAnimationFrame(frame); } };
    const kicker = setInterval(() => { if (need > 0) kick(); }, 120); // wakes the loop after a settled state changes

    const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) { need = 2; kick(); } }, { rootMargin: "80px" });
    io.observe(host);
    const vis = () => { if (!document.hidden) { need = 2; kick(); } };
    document.addEventListener("visibilitychange", vis);
    const onLost = (e: Event) => { e.preventDefault(); setFailed(true); };
    canvas.addEventListener("webglcontextlost", onLost);

    // Lullaby notes: the matching star pulses in time and the whole scene breathes with the music.
    const onNote = (e: Event) => {
      const d = (e as CustomEvent<NoteDetail>).detail;
      const s = stars[noteToStar(d.f, d.i)];
      if (!s) return;
      s.pop = 1; s.flash = 1; glowPulse = 1; need = 2;
      if (visible && !document.hidden && !rm) { const wp = new THREE.Vector3(); s.m.getWorldPosition(wp); burst(wp, colors[stars.indexOf(s)]); }
    };
    // Lantern and lullaby tints light the scene in the same colour as the page wash.
    const white = new THREE.Color(0xffffff);
    const onTint = (e: Event | { detail: TintFinal }) => {
      const hex = (e as { detail: TintFinal }).detail.hex;
      glowMat.color.copy(white).lerp(new THREE.Color(hex ?? 0xffffff), hex === null ? 0 : 0.75);
      warm.color.set(hex ?? 0xffc27a);
      dustMat.color.set(0xffe6a8).lerp(new THREE.Color(hex ?? 0xffe6a8), hex === null ? 0 : 0.5);
      need = 2;
    };
    addEventListener("pip:note", onNote);
    addEventListener("pip:tint-final", onTint);
    if (window.__pipTint?.hex) onTint({ detail: window.__pipTint });

    applyTheme(); resize();

    return () => {
      api.current = null;
      cancelAnimationFrame(raf); clearInterval(kicker);
      io.disconnect(); ro.disconnect(); mo.disconnect();
      document.removeEventListener("visibilitychange", vis);
      removeEventListener("pip:note", onNote); removeEventListener("pip:tint-final", onTint);
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up); canvas.removeEventListener("webglcontextlost", onLost);
      bursts.forEach((b) => { b.p.geometry.dispose(); (b.p.material as THREE.Material).dispose(); });
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  // Wish wall: load approved guestbook notes, keep the scene in sync, and add new notes live.
  useEffect(() => {
    let alive = true;
    fetch("/api/guestbook").then((r) => (r.ok ? r.json() : Promise.reject())).then((d: { entries?: GbEntry[] }) => { if (alive && d.entries) setWishes(d.entries.slice(0, 16)); }).catch(() => {});
    const add = (e: Event) => { const en = (e as CustomEvent<GbEntry>).detail; if (en?.id) setWishes((cur) => [en, ...cur.filter((c) => c.id !== en.id)].slice(0, 16)); };
    addEventListener("pip:wish", add);
    return () => { alive = false; removeEventListener("pip:wish", add); };
  }, []);
  useEffect(() => { api.current?.syncWishes(wishes); }, [wishes, failed]);
  const readWish = (w: GbEntry) => { setWishSel(w); api.current?.wish(w.id); };

  const toggleStill = () => { const v = !still; setStill(v); api.current?.setStill(v); };

  return (
    <section id="mobile3d">
      <div className="wrap">
        <p className="label">Tier 3 · in real 3D</p>
        <h2>Pip’s Dream Mobile</h2>
        <p className="small" style={{ marginBottom: 16 }}>Drag to turn the nursery. Tap a gold star to ring it. Nine stars, nine notes. The small pink stars are wishes from the guestbook.</p>
        <div className="m3">
          <div className="m3-stage" ref={box} role="group" aria-label="Interactive 3D scene: Pip in an arched window with nine orbiting stars and a crescent moon">
            {failed && (
              <div className="m3-fallback">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/hero.webp" alt="Pip, a gentle skull baby in a star nightcap, sitting on a cloud" width={310} height={466} />
                <p className="small">Your browser can’t draw 3D right now, so Pip is staying flat tonight.</p>
              </div>
            )}
          </div>
          <div className="m3-side">
            <p className="recipe" aria-live="polite">Stars rung: {rung.size} of {NOTES.length}</p>
            <div className="chips">
              <button className="chip" onClick={() => api.current?.turn(-0.35)} aria-label="Turn the scene left" disabled={failed}>◀ Turn</button>
              <button className="chip" onClick={() => api.current?.turn(0.35)} aria-label="Turn the scene right" disabled={failed}>Turn ▶</button>
              <button className="chip" onClick={() => api.current?.ring()} disabled={failed}>Ring a star ✦</button>
              <button className="chip" aria-pressed={still} onClick={toggleStill} disabled={failed}>{still ? "Let it drift" : "Hold still"}</button>
            </div>
            <p className="small">Turn on sound (top bar) to hear the chimes. Play a lullaby above and the stars pulse in time with the notes.</p>
            <div className="wishes">
              <p className="label">Wish wall · {wishes.length} {wishes.length === 1 ? "wish" : "wishes"} floating</p>
              {wishes.length === 0 ? (
                <p className="small">No wishes yet. <a href="#guestbook">Leave a note</a> and it floats up here as a star.</p>
              ) : (
                <ul className="wish-list">
                  {wishes.slice(0, 6).map((w) => (
                    <li key={w.id}><button className="chip" aria-pressed={wishSel?.id === w.id} onClick={() => readWish(w)}>✧ {w.display_name}</button></li>
                  ))}
                </ul>
              )}
              {wishSel && (
                <div className="wish-card" role="status" aria-live="polite">
                  <p><b>{wishSel.display_name}</b> wished:</p>
                  <p className="wish-msg">{wishSel.message}</p>
                  <Reactions id={wishSel.id} name={wishSel.display_name} stars={wishSel.stars} hearts={wishSel.hearts} />
                </div>
              )}
            </div>
            <Receipt r={rec} />
          </div>
        </div>
      </div>
    </section>
  );
}
