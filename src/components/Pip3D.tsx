"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useAudio } from "./Providers";
import { unlock } from "@/lib/progress";
import { pick, say } from "@/lib/pipSay";

const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
const isNight = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "night" : matchMedia("(prefers-color-scheme:dark)").matches;
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function starShape(outer: number, inner: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? inner : outer;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}
/** One continuous cone bent along a curve: the floppy nightcap, with no seams to break apart when you spin him. */
function bentCone(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, rings: number, seg: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const frames = curve.computeFrenetFrames(rings, false);
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, p = curve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i];
    const r = r0 + (r1 - r0) * Math.pow(t, 0.85);
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pos.push(p.x + r * (c * N.x + s * B.x), p.y + r * (c * N.y + s * B.y), p.z + r * (c * N.z + s * B.z));
      uv.push((j / seg) * 2, t * 1.6);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** Cream nightcap fabric dotted with little gold stars, drawn once into a canvas texture. */
function capTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#f7e9d6"; x.fillRect(0, 0, 256, 256);
  x.fillStyle = "#e9b94f";
  const pts: [number, number, number][] = [[40, 50, 14], [120, 30, 11], [200, 64, 15], [80, 130, 12], [170, 150, 14], [30, 210, 11], [128, 220, 13], [225, 220, 10], [225, 120, 9]];
  for (const [px, py, r] of pts) {
    x.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); }
    x.closePath(); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function zTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d")!;
  x.font = "700 44px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#f19abb"; x.fillText("z", 32, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type Api = { giggle: () => void; wave: () => void; spin: () => void; sleep: (v: boolean) => void; turn: (d: number) => void; still: (v: boolean) => void };
const LINES = ["*giggle* That tickles!", "Hehe, hi! Check out my nightcap.", "Boop received.", "I’m 3D now! Do I look round?", "Spin me again!"];

/**
 * Tier 3: Pip as a real 3D model (Three.js, built from primitives, no model file to download).
 * Smooth round skull, soft eye sockets with amber pinpricks that follow your pointer, a tiny crooked smile,
 * a nightcap with stars and a pink bow. Drag to rotate, tap him to make him giggle, poke the bow, the pom-pom or a star.
 */
export default function Pip3D() {
  const box = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const { blip, play } = useAudio();
  const blipRef = useRef(blip), playRef = useRef(play);
  blipRef.current = blip; playRef.current = play;
  const [failed, setFailed] = useState(false);
  const [still, setStill] = useState(false);
  const [asleep, setAsleep] = useState(false);
  const [status, setStatus] = useState("Drag Pip to turn him around. Tap his head, bow or a star.");
  const [pokes, setPokes] = useState(0);
  const pokesRef = useRef(0);

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { setFailed(true); return; }

    const rm = matchMedia("(prefers-reduced-motion:reduce)").matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.className = "gl"; canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    camera.position.set(0, 0.35, 8.2);
    const disposables: { dispose: () => void }[] = [];
    const D = <T extends { dispose: () => void }>(o: T) => { disposables.push(o); return o; };
    const mat = (color: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => D(new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.02, ...o }));

    // lights
    const hemi = new THREE.HemisphereLight(0xfff1e6, 0xd9b8e0, 0.9);
    const key = new THREE.DirectionalLight(0xfff0dd, 1.5); key.position.set(3, 5, 6);
    const rim = new THREE.DirectionalLight(0xc9a8ff, 0.7); rim.position.set(-5, 2, -4);
    const warm = new THREE.PointLight(0xffb866, 0, 12); warm.position.set(1.2, -0.6, 4);
    scene.add(hemi, key, rim, warm);

    const model = new THREE.Group(); model.scale.setScalar(0.78); model.position.y = -0.05; scene.add(model);
    const body = new THREE.Group(); model.add(body);
    const head = new THREE.Group(); head.position.set(0, 0.55, 0); body.add(head);

    // materials
    const bone = mat(0xf2dec6, { roughness: 0.5, emissive: 0xf2d3b8, emissiveIntensity: 0.08 });
    const dark = mat(0x35211a, { roughness: 0.9 });
    const pink = mat(0xf4bfd2), pjs = mat(0xf7cadb, { roughness: 0.85 });
    const cloudM = mat(0xf8e8f0, { roughness: 1, emissive: 0xffc9dc, emissiveIntensity: 0.05 });
    const amberM = D(new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false }));
    const goldM = mat(0xf4c869, { roughness: 0.4, metalness: 0.15, emissive: 0xf0a940, emissiveIntensity: 0.3 });
    const blushM = D(new THREE.MeshBasicMaterial({ color: 0xff9db8, transparent: true, opacity: 0.45, depthWrite: false }));

    const hit: { m: THREE.Object3D; kind: "head" | "bow" | "pom" | "body" | "star"; i?: number }[] = [];
    const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, p: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1]) => {
      D(g); const o = new THREE.Mesh(g, m); o.position.set(...p); o.scale.set(...s); parent.add(o); return o;
    };

    // skull (smooth, round) and face
    const skull = mesh(new THREE.SphereGeometry(1, 56, 44), bone, head, [0, 0, 0], [1.02, 0.96, 0.98]);
    hit.push({ m: skull, kind: "head" });
    const socketL = new THREE.Group(), socketR = new THREE.Group();
    socketL.position.set(-0.4, 0.05, 0.84); socketR.position.set(0.4, 0.05, 0.84);
    socketL.rotation.y = -0.38; socketR.rotation.y = 0.38;
    head.add(socketL, socketR);
    const pupils: THREE.Mesh[] = [];
    for (const s of [socketL, socketR]) {
      mesh(new THREE.SphereGeometry(0.27, 28, 22), dark, s, [0, 0, 0], [1, 1.08, 0.42]);
      const p = mesh(new THREE.SphereGeometry(0.05, 14, 12), amberM, s, [0, 0, 0.1]);
      const g = D(new THREE.SpriteMaterial({ color: 0xffc35a, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
      const spr = new THREE.Sprite(g); spr.scale.set(0.3, 0.3, 1); spr.position.set(0, 0, 0.11); s.add(spr); p.userData.glow = g;
      pupils.push(p);
    }
    mesh(new THREE.SphereGeometry(0.05, 12, 10), dark, head, [0, -0.2, 0.96], [1, 0.8, 0.5]); // tiny nose
    const smile = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.2, -0.36, 0.93), new THREE.Vector3(-0.07, -0.44, 0.96), new THREE.Vector3(0.1, -0.43, 0.96), new THREE.Vector3(0.23, -0.31, 0.92)]);
    mesh(new THREE.TubeGeometry(smile, 24, 0.017, 6), dark, head);
    for (const sx of [-1, 1]) { const b = mesh(new THREE.CircleGeometry(0.17, 20), blushM, head, [sx * 0.62, -0.27, 0.74]); b.lookAt(sx * 1.4, -0.3, 2); }

    // nightcap: a soft floppy cone built from three tilted segments, a brim and a pom-pom
    const capTex = D(capTexture());
    const capM = D(new THREE.MeshStandardMaterial({ map: capTex, roughness: 0.9 }));
    const brim = mesh(new THREE.TorusGeometry(0.94, 0.12, 16, 56), mat(0xfbf0e0, { roughness: 0.95 }), head, [0, 0.52, 0], [1, 1, 1]);
    brim.rotation.x = Math.PI / 2 - 0.22; brim.rotation.z = 0.0; brim.scale.set(1, 1, 0.9);
    const cap = new THREE.Group(); cap.position.set(0, 0.52, 0); cap.rotation.x = -0.12; head.add(cap);
    const capCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03, 0.5, 0.02), new THREE.Vector3(0.28, 0.98, 0.06), new THREE.Vector3(0.7, 1.16, 0.1), new THREE.Vector3(1.02, 1.0, 0.12)]);
    const capMesh = mesh(D(bentCone(capCurve, 0.9, 0.09, 30, 36)), capM, cap);
    (capMesh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    const capEnd = capCurve.getPointAt(1);
    const pomY = capEnd.y;
    const pom = mesh(new THREE.SphereGeometry(0.2, 20, 16), mat(0xffffff, { roughness: 1 }), cap, [capEnd.x, capEnd.y, capEnd.z]);
    hit.push({ m: pom, kind: "pom" }); hit.push({ m: capMesh, kind: "head" });
    // pink bow on the cap
    const bowPink = mat(0xf08fb2, { roughness: 0.55 });
    const bow = new THREE.Group(); bow.position.set(-0.86, 0.66, 0.42); bow.rotation.set(0.15, 0.95, 0.45); head.add(bow);
    const bowL = mesh(new THREE.SphereGeometry(0.26, 20, 16), bowPink, bow, [-0.25, 0, 0], [1.15, 0.8, 0.5]);
    const bowR = mesh(new THREE.SphereGeometry(0.26, 20, 16), bowPink, bow, [0.25, 0, 0], [1.15, 0.8, 0.5]);
    const knot = mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(0xe0789d), bow, [0, 0, 0.02]);
    [bowL, bowR, knot].forEach((o) => hit.push({ m: o, kind: "bow" }));

    // little body, arms, feet and the cloud
    const torso = mesh(new THREE.SphereGeometry(0.78, 32, 26), pjs, body, [0, -1.0, 0], [0.98, 1.05, 0.85]);
    hit.push({ m: torso, kind: "body" });
    for (const sx of [-1, 1]) {
      mesh(new THREE.SphereGeometry(0.07, 8, 8), mat(0xe58aa9), body, [sx * 0.27, -0.85, 0.63]);
    }
    const armL = new THREE.Group(), armR = new THREE.Group();
    armL.position.set(-0.74, -0.8, 0.08); armR.position.set(0.74, -0.8, 0.08); body.add(armL, armR);
    for (const a of [armL, armR]) { mesh(new THREE.CapsuleGeometry(0.15, 0.34, 6, 14), pjs, a, [0, -0.2, 0]); mesh(new THREE.SphereGeometry(0.15, 14, 12), bone, a, [0, -0.5, 0]); }
    armL.rotation.z = 0.25; armR.rotation.z = -0.25;
    for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(0.22, 16, 14), bone, body, [sx * 0.36, -1.72, 0.4], [1, 0.7, 1.25]);
    const cloud = new THREE.Group(); cloud.position.set(0, -2.2, 0); model.add(cloud);
    ([[-1.5, 0.05, 0.62], [-0.8, 0.2, 0.85], [0, 0.28, 1], [0.85, 0.18, 0.8], [1.55, 0.02, 0.58], [0.1, -0.05, 0.9]] as const).forEach(([px, py, s]) => mesh(new THREE.SphereGeometry(1, 20, 16), cloudM, cloud, [px, py, 0], [s, s * 0.6, s * 0.8]));

    // orbiting stars (tap for a chime)
    const starGeo = D(new THREE.ExtrudeGeometry(starShape(0.3, 0.13), { depth: 0.09, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 }));
    starGeo.center();
    const orbit = new THREE.Group(); scene.add(orbit);
    const stars = Array.from({ length: 6 }, (_, i) => {
      const m = new THREE.Mesh(starGeo, i % 2 ? pink : goldM); m.userData.i = i; orbit.add(m);
      hit.push({ m, kind: "star", i });
      return { m, a: (i / 6) * Math.PI * 2, r: 2.55 + (i % 3) * 0.3, y: -0.6 + ((i * 0.9) % 2.6), v: (0.18 + (i % 2) * 0.07) * (i % 2 ? -1 : 1), pop: 0 };
    });

    // sleepy z's
    const zTex = D(zTexture());
    const zs = [0, 1, 2].map(() => { const m = D(new THREE.SpriteMaterial({ map: zTex, transparent: true, opacity: 0, depthWrite: false })); const s = new THREE.Sprite(m); s.scale.set(0.5, 0.5, 1); scene.add(s); return { s, m }; });

    // sparkle bursts
    const bursts: { p: THREE.Points; life: number; v: Float32Array }[] = [];
    const burst = (at: THREE.Vector3, col: number, n = 22) => {
      const pos = new Float32Array(n * 3), v = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), sp = 0.8 + Math.random() * 1.6;
        v[i * 3] = Math.sin(ph) * Math.cos(th) * sp; v[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * sp; v[i * 3 + 2] = Math.cos(ph) * sp;
        pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({ color: col, size: 0.09, transparent: true, opacity: 1, depthWrite: false });
      const pts = new THREE.Points(g, m); scene.add(pts); bursts.push({ p: pts, life: 1, v });
    };

    // theme
    let need = 2;
    const applyTheme = () => {
      const n = isNight();
      hemi.intensity = n ? 0.5 : 0.9; key.intensity = n ? 0.95 : 1.5; warm.intensity = n ? 22 : 4; rim.intensity = n ? 1.1 : 0.7;
      goldM.emissiveIntensity = n ? 0.8 : 0.3; cloudM.emissiveIntensity = n ? 0.02 : 0.05;
      need = 2;
    };
    const mo = new MutationObserver(applyTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // sizing
    const resize = () => {
      const W = host.clientWidth, H = host.clientHeight;
      if (!W || !H) return;
      renderer.setSize(W, H, false);
      const aspect = W / H; camera.aspect = aspect;
      camera.position.z = Math.max(8.2, 5.6 / (Math.tan((camera.fov * Math.PI) / 360) * aspect));
      camera.updateProjectionMatrix(); need = 2;
    };
    const ro = new ResizeObserver(resize); ro.observe(host);

    // state
    let yaw = 0, tYaw = 0, pitch = 0, tPitch = 0, drag = false, moved = 0, lx = 0, ly = 0, lastDrag = -10;
    let nx = 0, ny = 0, tx = 0, ty = 0, pointerSeen = false, still_ = rm, asleep_ = false;
    let giggleT = 1, waveT = 1, spinT = 1, spinFrom = 0, bowT = 1, pomT = 1, bounceAmt = 0, sleepAmt = 0;
    const ray = new THREE.Raycaster(), nd = new THREE.Vector2();
    const ndc = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1] as const; };
    const pickAt = (e: PointerEvent) => {
      const [x, y] = ndc(e); nd.set(x, y); ray.setFromCamera(nd, camera);
      const h = ray.intersectObjects(hit.map((o) => o.m), false)[0];
      return h ? hit.find((o) => o.m === h.object) : undefined;
    };

    const note = (text: string) => { setStatus(text); };
    const addPoke = () => { pokesRef.current += 1; setPokes(pokesRef.current); if (pokesRef.current === 1) unlock("pip3d"); };
    const giggle = () => {
      if (asleep_) { setSleep(false); return; }
      giggleT = 0; need = 2; addPoke();
      const wp = new THREE.Vector3(); head.getWorldPosition(wp); burst(wp.add(new THREE.Vector3(0, 0.5, 0.6)), 0xffe19a);
      playRef.current("toy", { cooldown: 200, volume: 0.22 });
      const l = pick(LINES); note(l); say(l);
    };
    const wave = () => { if (asleep_) return; waveT = 0; need = 2; addPoke(); note("Pip waves hello. *giggle*"); };
    const spin = () => { if (asleep_) return; spinT = 0; spinFrom = tYaw; need = 2; addPoke(); note("Wheee! Spinning."); playRef.current("toy", { cooldown: 200, volume: 0.2 }); };
    const setSleep = (v: boolean) => {
      asleep_ = v; setAsleep(v); need = 2;
      note(v ? "Zzz… Pip is asleep. Tap him or press Wake to wake him." : "*yawn* Oh! Hi again.");
      if (v) { say("zzz… just five more minutes."); tYaw = 0; tPitch = 0; } else say("*yawn* I wasn’t sleeping. Much.");
    };
    const turn = (d: number) => { tYaw += d; lastDrag = performance.now() / 1000; need = 2; };
    api.current = { giggle, wave, spin, sleep: setSleep, turn, still: (v) => { still_ = v; need = 2; } };

    const tap = (e: PointerEvent) => {
      const h = pickAt(e);
      if (!h) { giggle(); return; } // tapping the scene near Pip still counts
      if (h.kind === "star") {
        const s = stars[h.i ?? 0]; s.pop = 1; need = 2;
        blipRef.current(NOTES[(h.i ?? 0) % NOTES.length]);
        const wp = new THREE.Vector3(); s.m.getWorldPosition(wp); burst(wp, 0xffe19a, 16); note("A star hums a little note."); addPoke();
      } else if (h.kind === "bow") { bowT = 0; need = 2; addPoke(); note("Hehe, my bow! Careful, it’s new."); say("My bow! Careful, it’s new."); }
      else if (h.kind === "pom") { pomT = 0; need = 2; addPoke(); note("Boop! The pom-pom bounces."); playRef.current("toy", { cooldown: 200, volume: 0.2 }); }
      else if (h.kind === "body") { giggleT = 0; need = 2; addPoke(); note("That tickles! *giggle*"); if (asleep_) setSleep(false); }
      else giggle();
    };

    const down = (e: PointerEvent) => { drag = true; moved = 0; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; };
    const move = (e: PointerEvent) => {
      const [x, y] = ndc(e); tx = x; ty = y; pointerSeen = true; need = 2;
      if (!drag) { canvas.style.cursor = pickAt(e) ? "pointer" : "grab"; return; }
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      tYaw += dx * 0.012; lastDrag = performance.now() / 1000;
      if (e.pointerType === "mouse") tPitch = clamp(tPitch + dy * 0.004, -0.3, 0.3);
    };
    const up = (e: PointerEvent) => { drag = false; canvas.style.cursor = "grab"; try { canvas.releasePointerCapture(e.pointerId); } catch {} if (moved < 6) tap(e); };
    const leave = () => { tx = 0; ty = 0; };
    canvas.style.cursor = "grab"; canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", () => { drag = false; });
    canvas.addEventListener("pointerleave", leave);
    // the whole page's pointer also steers his eyes (desktop), so he looks at you wherever you are
    const pageMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || drag) return;
      const r = host.getBoundingClientRect();
      tx = clamp(((e.clientX - (r.left + r.width / 2)) / innerWidth) * 2.2, -1, 1);
      ty = clamp((-(e.clientY - (r.top + r.height / 2)) / innerHeight) * 2.2, -1, 1);
      pointerSeen = true; need = 2;
    };
    addEventListener("pointermove", pageMove, { passive: true });

    // keyboard: arrows turn him, Enter or Space makes him giggle
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); turn(-0.4); }
      else if (e.key === "ArrowRight") { e.preventDefault(); turn(0.4); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); giggle(); }
    };
    host.addEventListener("keydown", onKey);

    // render loop (only while visible and the tab is showing)
    let raf = 0, visible = false, last = 0;
    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3(), q = new THREE.Quaternion();
    const draw = () => {
      raf = 0;
      if (!visible || document.hidden) return;
      const t = clock.getElapsedTime(), dt = Math.min(0.05, t - last); last = t;
      const moving = !still_;
      // idle sway: slowly looks around unless the visitor has just turned him
      if (moving && !drag && t - lastDrag > 4 && Math.abs(tYaw) < 1.2) tYaw += (Math.sin(t * 0.45) * 0.55 - tYaw) * 0.01;
      if (spinT < 1) { spinT = Math.min(1, spinT + dt / 1.1); tYaw = spinFrom + (1 - Math.pow(1 - spinT, 3)) * Math.PI * 2; if (spinT >= 1) { tYaw = spinFrom; yaw = spinFrom; } }
      yaw += (tYaw - yaw) * 0.14; pitch += (tPitch - pitch) * 0.12;
      model.rotation.y = yaw; model.rotation.x = pitch * 0.6;

      // eyes + head follow the pointer (or wander when nobody is pointing)
      const gx = pointerSeen ? tx : Math.sin(t * 0.7) * 0.5, gy = pointerSeen ? ty : Math.sin(t * 0.9 + 1) * 0.3;
      nx += (gx - nx) * 0.1; ny += (gy - ny) * 0.1;
      sleepAmt += ((asleep_ ? 1 : 0) - sleepAmt) * 0.08;
      head.rotation.y = nx * 0.28 * (1 - sleepAmt); head.rotation.x = -ny * 0.16 + sleepAmt * 0.28; head.rotation.z = Math.sin(t * 0.8) * 0.02 * (moving ? 1 : 0) + sleepAmt * 0.08;
      model.updateMatrixWorld(true); head.getWorldQuaternion(q);
      tmp.set(nx * 0.7, ny * 0.55, 1).normalize().applyQuaternion(q.invert()); // where to look, in the head's own space
      const facing = tmp.z > 0.2;
      pupils.forEach((p) => {
        p.position.x += ((facing ? clamp(tmp.x, -1, 1) * 0.09 : 0) - p.position.x) * 0.2;
        p.position.y += ((facing ? clamp(tmp.y, -1, 1) * 0.08 : 0) - p.position.y) * 0.2;
        const k = 1 - sleepAmt * 0.75; p.scale.setScalar(k);
        (p.userData.glow as THREE.SpriteMaterial).opacity = (isNight() ? 0.55 : 0.3) * k;
      });

      // giggle squash, wave, bow + pom wiggles, breathing
      giggleT = Math.min(1, giggleT + dt / 0.7); waveT = Math.min(1, waveT + dt / 1.8); bowT = Math.min(1, bowT + dt / 0.8); pomT = Math.min(1, pomT + dt / 0.9);
      const g = Math.sin(giggleT * Math.PI), shake = giggleT < 1 ? Math.sin(giggleT * 38) * 0.05 * (1 - giggleT) : 0;
      bounceAmt = g;
      const breathe = moving ? Math.sin(t * (asleep_ ? 1.2 : 1.8)) * 0.012 : 0;
      body.scale.set(1 + g * 0.06 + breathe, 1 - g * 0.08 + breathe, 1 + g * 0.06);
      body.position.y = Math.abs(Math.sin(giggleT * Math.PI)) * 0.28 + (moving ? Math.sin(t * 1.1) * 0.03 : 0);
      head.rotation.z += shake;
      armR.rotation.z = -0.25 - (waveT < 1 ? (0.9 + Math.sin(waveT * 22) * 0.45) * Math.sin(waveT * Math.PI) : 0) - g * 0.4;
      armL.rotation.z = 0.25 + g * 0.4;
      bow.rotation.z = 0.5 + (bowT < 1 ? Math.sin(bowT * 26) * 0.35 * (1 - bowT) : 0);
      pom.position.y = pomY + (pomT < 1 ? Math.sin(pomT * Math.PI) * 0.18 : 0);
      cloud.position.y = -2.2 + (moving ? Math.sin(t * 0.7) * 0.05 : 0);

      for (const s of stars) {
        if (moving) s.a += s.v * dt;
        s.m.position.set(Math.cos(s.a) * s.r, s.y + (moving ? Math.sin(t * 1.2 + s.a) * 0.08 : 0), Math.sin(s.a) * s.r * 0.8);
        s.pop = Math.max(0, s.pop - dt * 2.2);
        s.m.scale.setScalar(0.9 + s.pop * 0.8); if (moving) s.m.rotation.y += dt * 0.9; s.m.rotation.z = Math.sin(s.a * 2) * 0.2;
      }
      zs.forEach((z, i) => {
        const ph = (t * 0.45 + i * 0.33) % 1;
        z.m.opacity = asleep_ ? Math.sin(ph * Math.PI) * 0.9 : 0;
        z.s.position.set(1.0 + ph * 0.7, 1.6 + ph * 1.1, 0.8); z.s.scale.setScalar(0.35 + ph * 0.4);
      });
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]; b.life -= dt * 1.4;
        const a = b.p.geometry.attributes.position as THREE.BufferAttribute;
        for (let j = 0; j < a.count; j++) a.setXYZ(j, a.getX(j) + b.v[j * 3] * dt, a.getY(j) + b.v[j * 3 + 1] * dt, a.getZ(j) + b.v[j * 3 + 2] * dt);
        a.needsUpdate = true; (b.p.material as THREE.PointsMaterial).opacity = Math.max(0, b.life);
        if (b.life <= 0) { scene.remove(b.p); b.p.geometry.dispose(); (b.p.material as THREE.Material).dispose(); bursts.splice(i, 1); }
      }
      renderer.render(scene, camera);
      const idle = !moving && !drag && bursts.length === 0 && giggleT >= 1 && waveT >= 1 && spinT >= 1 && bowT >= 1 && pomT >= 1 && Math.abs(tYaw - yaw) < 0.001 && Math.abs(tPitch - pitch) < 0.001 && Math.abs(nx - tx) < 0.01 && Math.abs(ny - ty) < 0.01 && stars.every((s) => s.pop === 0) && (asleep_ ? sleepAmt > 0.99 : sleepAmt < 0.01);
      if (idle && need <= 0) return;
      need = Math.max(0, need - 1);
      raf = requestAnimationFrame(draw);
    };
    void bounceAmt;
    const kick = () => { if (!raf && visible && !document.hidden) { clock.getDelta(); raf = requestAnimationFrame(draw); } };
    const kicker = setInterval(() => { if (need > 0) kick(); }, 120);
    const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) { need = 2; kick(); } }, { rootMargin: "80px" });
    io.observe(host);
    const vis = () => { if (!document.hidden) { need = 2; kick(); } };
    document.addEventListener("visibilitychange", vis);
    const onLost = (e: Event) => { e.preventDefault(); setFailed(true); };
    canvas.addEventListener("webglcontextlost", onLost);

    applyTheme(); resize();

    return () => {
      api.current = null;
      cancelAnimationFrame(raf); clearInterval(kicker);
      io.disconnect(); ro.disconnect(); mo.disconnect();
      removeEventListener("pointermove", pageMove);
      host.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", vis);
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", onLost);
      bursts.forEach((b) => { b.p.geometry.dispose(); (b.p.material as THREE.Material).dispose(); });
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  const toggleStill = () => { const v = !still; setStill(v); api.current?.still(v); };

  return (
    <section id="pip3d">
      <div className="wrap">
        <p className="label">Tier 3 · Pip in real 3D</p>
        <h2>Meet Pip in 3D</h2>
        <p className="small" style={{ marginBottom: 16 }}>He’s built from shapes right in your browser. Drag him around, tap his head, poke his bow, and watch his eyes follow you.</p>
        <div className="m3">
          {/* A focusable 3D viewport: arrow keys turn Pip, Enter makes him giggle (see its label). */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <div className="m3-stage" ref={box} tabIndex={0} role="group" aria-label="Interactive 3D Pip. Use the left and right arrow keys to turn him, Enter to make him giggle">
            {failed && (
              <div className="m3-fallback">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/hero.webp" alt="Pip, a gentle skull baby in a star nightcap, sitting on a cloud" width={310} height={466} />
                <p className="small">Your browser can’t draw 3D right now, so Pip is staying flat tonight.</p>
              </div>
            )}
          </div>
          <div className="m3-side">
            <p className="recipe" aria-live="polite">{status}</p>
            <p className="small">Pokes and tricks so far: {pokes}</p>
            <div className="chips">
              <button className="chip" onClick={() => api.current?.turn(-0.6)} aria-label="Turn Pip left" disabled={failed}>◀ Turn</button>
              <button className="chip" onClick={() => api.current?.turn(0.6)} aria-label="Turn Pip right" disabled={failed}>Turn ▶</button>
              <button className="chip" onClick={() => api.current?.giggle()} disabled={failed}>Make him giggle</button>
              <button className="chip" onClick={() => api.current?.wave()} disabled={failed}>Wave</button>
              <button className="chip" onClick={() => api.current?.spin()} disabled={failed}>Spin</button>
              <button className="chip" aria-pressed={asleep} onClick={() => api.current?.sleep(!asleep)} disabled={failed}>{asleep ? "Wake Pip" : "Sleepy mode"}</button>
              <button className="chip" aria-pressed={still} onClick={toggleStill} disabled={failed}>{still ? "Let him move" : "Hold still"}</button>
            </div>
            <p className="small">Everything works with touch, mouse or keyboard. Stylized 3D build; the official artwork stays untouched everywhere else on the site.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
