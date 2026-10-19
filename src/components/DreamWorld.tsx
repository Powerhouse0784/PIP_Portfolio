"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Link from "next/link";
import DreamFeatureContent, { type DreamFeatureId } from "@/components/DreamFeatureContent";

type Portal = { id: string; title: string; subtitle: string; color: number; position: THREE.Vector3; action: string; icon: string };
const PORTALS: Portal[] = [
  { id: "lullaby", title: "Lullaby Lab", subtitle: "Pick a mood and make a melody", color: 0xd6a6ff, position: new THREE.Vector3(-35, 0, -30), action: "#p1", icon: "♫" },
  { id: "lanterns", title: "Wish Lanterns", subtitle: "Light up a little wish", color: 0xffdf83, position: new THREE.Vector3(-17.5, 0, -30), action: "#lanterns", icon: "☼" },
  { id: "dreams", title: "Dream Maker", subtitle: "Create a dream together", color: 0xff9ecb, position: new THREE.Vector3(0, 0, -30), action: "#dreammaker", icon: "✦" },
  { id: "stories", title: "Bedtime Storybook", subtitle: "Turn the pages of a bedtime tale", color: 0xa7b7ff, position: new THREE.Vector3(17.5, 0, -30), action: "#storybook", icon: "▤" },
  { id: "toys", title: "Toy Workshop", subtitle: "Play with Pip's toys", color: 0xffc66d, position: new THREE.Vector3(35, 0, -30), action: "#toys", icon: "♧" },
  { id: "delivery", title: "Dream Delivery", subtitle: "Explore tonight's delivery route", color: 0x83e6cb, position: new THREE.Vector3(-35, 0, 0), action: "#routes", icon: "✉" },
  { id: "growth", title: "Growth Chart", subtitle: "See Pip's skills grow", color: 0xf5a7b8, position: new THREE.Vector3(-17.5, 0, 0), action: "#growth", icon: "↗" },
  { id: "journal", title: "Daily Dream Journal", subtitle: "Keep a little memory", color: 0x83e6cb, position: new THREE.Vector3(0, 0, 0), action: "#daily", icon: "✎" },
  { id: "darkroom", title: "Dark Room", subtitle: "A quiet place to settle down", color: 0x8c9eff, position: new THREE.Vector3(17.5, 0, 0), action: "#darkroom", icon: "☾" },
  { id: "catcher", title: "Dream Catcher", subtitle: "Catch a drifting dream", color: 0xffb7d9, position: new THREE.Vector3(35, 0, 0), action: "#catcher", icon: "✧" },
  { id: "pip", title: "Meet Pip", subtitle: "Say hello to your dream engineer", color: 0xffd6bb, position: new THREE.Vector3(-35, 0, 30), action: "#about", icon: "☺" },
  { id: "storybook-grove", title: "Story Corner", subtitle: "Discover another little story", color: 0xc0b0ff, position: new THREE.Vector3(-17.5, 0, 30), action: "#storybook", icon: "❝" },
  { id: "retro", title: "Retro Desktop", subtitle: "Visit Pip's playful old-school corner", color: 0x93e5dc, position: new THREE.Vector3(0, 0, 30), action: "#retro", icon: "▣" },
  { id: "guestbook", title: "Guestbook", subtitle: "Leave a kind note for Pip", color: 0xffdf83, position: new THREE.Vector3(17.5, 0, 30), action: "#guestbook", icon: "♡" },
  { id: "goodnight", title: "Goodnight Garden", subtitle: "Wind down and say goodnight", color: 0xb8c5ff, position: new THREE.Vector3(35, 0, 30), action: "#goodnight", icon: "☁" },
  { id: "dream-corner", title: "Pip’s Dream Corner", subtitle: "Chat, draw and play with Pip", color: 0xffb5c8, position: new THREE.Vector3(-30, 0, 45), action: "#dream-corner", icon: "☺" },
  { id: "pip-3d", title: "Meet Pip in 3D", subtitle: "Play with Pip’s interactive character", color: 0xb9a4ff, position: new THREE.Vector3(-10, 0, 45), action: "#pip-3d", icon: "✦" },
  { id: "dream-mobile", title: "Dream Mobile", subtitle: "Explore the hanging dream mobile", color: 0x9ce7df, position: new THREE.Vector3(10, 0, 45), action: "#dream-mobile", icon: "☁" },
  { id: "atmosphere", title: "Nursery Atmosphere", subtitle: "Set the mood of the nursery", color: 0xffd98e, position: new THREE.Vector3(30, 0, 45), action: "#atmosphere", icon: "☼" },
  { id: "nursery-hub", title: "Midnight Nursery Hub", subtitle: "Sky, stats, secrets and settings", color: 0xc0d8ff, position: new THREE.Vector3(0, 0, -45), action: "#nursery-hub", icon: "⌂" },
];

export default function DreamWorld() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState<Portal | null>(null);
  const [hint, setHint] = useState("Explore the world and find a glowing portal");
  const [paused, setPaused] = useState(false);
  const [help, setHelp] = useState(false);
  const [message, setMessage] = useState("");
  const [welcomeToast, setWelcomeToast] = useState(true);
  const [gameReady, setGameReady] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPosition, setMapPosition] = useState({ x: 0, z: 20 });
  const [activeFeature, setActiveFeature] = useState<Portal | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    const timer = window.setTimeout(() => setWelcomeToast(false), 6500);
    return () => window.clearTimeout(timer);
  }, []);
  const actionRef = useRef<(portal: Portal) => void>(() => {});
  const featureOpenRef = useRef(false);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" }); }
    catch { setMessage("This browser could not start WebGL. Try updating your browser or enabling hardware acceleration."); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x11162e); scene.fog = new THREE.FogExp2(0x171b3b, 0.0038);
    const camera = new THREE.PerspectiveCamera(62, host.clientWidth / host.clientHeight, 0.1, 180);
    camera.position.set(0, 6, 12);
    const clock = new THREE.Clock();
    const hemi = new THREE.HemisphereLight(0xd9e4ff, 0x3b315f, 2.0); scene.add(hemi);
    const moon = new THREE.DirectionalLight(0xffdfc1, 3.0); moon.position.set(-12, 20, 10); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); scene.add(moon);
    const fill = new THREE.PointLight(0x8e8cff, 18, 55); fill.position.set(0, 9, -4); scene.add(fill);

    const mat = (color: number, roughness = 0.8, emissive = 0) => new THREE.MeshStandardMaterial({ color, roughness, emissive, emissiveIntensity: emissive ? 1.2 : 0 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(112, 112), mat(0x34385d)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(108, 108), mat(0x46506c)); grass.rotation.x = -Math.PI / 2; grass.position.y = 0.015; grass.receiveShadow = true; scene.add(grass);
    // Clear, continuous square boundary: Pip cannot leave the playable garden.
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8b82b7, roughness: .55, metalness: .12, emissive: 0x29234b, emissiveIntensity: .4 });
    const fenceGlow = new THREE.MeshStandardMaterial({ color: 0xd9c5ff, emissive: 0x9b78ff, emissiveIntensity: 1.3 });
    const bound = 52;
    for (const [x,z,lengthX,lengthZ] of [[0,-bound,104,.28],[0,bound,104,.28],[-bound,0,.28,104],[bound,0,.28,104]] as number[][]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(lengthX, .72, lengthZ), fenceMat); rail.position.set(x,.38,z); rail.castShadow=true; rail.receiveShadow=true; scene.add(rail);
      const glowRail = new THREE.Mesh(new THREE.BoxGeometry(lengthX,.055,lengthZ), fenceGlow); glowRail.position.set(x,.78,z); scene.add(glowRail);
    }
    for (let i=0;i<4;i++) for (const sign of [-1,1]) { const x=i%2===0?sign*bound:((i-1.5)*26), z=i%2===0?((i-1.5)*26):sign*bound; const post=new THREE.Mesh(new THREE.BoxGeometry(.42,1.15,.42),fenceMat);post.position.set(x,.55,z);post.castShadow=true;scene.add(post); }
    // Open central lawn: no raised centre strip or path barrier.
    // Tiny floating stars and distant sky points.
    const starGeo = new THREE.BufferGeometry(); const starPos: number[] = [];
    for (let i=0;i<480;i++){ const a=Math.random()*Math.PI*2, r=24+Math.random()*65; starPos.push(Math.cos(a)*r, 5+Math.random()*35, Math.sin(a)*r-15); }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos,3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffe6c0, size: .13, transparent: true, opacity: .85 })); scene.add(stars);
    // Glowing moon.
    const moonBall = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffe5bc })); moonBall.position.set(-18, 19, -42); scene.add(moonBall);
    const moonGlow = new THREE.Mesh(new THREE.SphereGeometry(3.1, 24, 18), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: .08, depthWrite: false })); moonGlow.position.copy(moonBall.position); scene.add(moonGlow);

    // Low-poly whimsical trees, flowers, mushrooms and lanterns around the walkable park.
    const trunkM = mat(0x66516d), leafMats = [mat(0x6d7eaa), mat(0x8976b6), mat(0x739d9c), mat(0x9a789d)];
    for (let i=0;i<46;i++) {
      const a = Math.random()*Math.PI*2, r = 34 + Math.random()*11, x = Math.cos(a)*r, z = Math.sin(a)*r;
      const group = new THREE.Group(); group.position.set(x,0,z); const h = 1.1+Math.random()*1.1;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,h,7), trunkM); trunk.position.y=h/2; trunk.castShadow=true; group.add(trunk);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.65+Math.random()*.42,1), leafMats[i%leafMats.length]); crown.position.y=h+.35; crown.castShadow=true; group.add(crown); scene.add(group);
      if (i%3===0) { const orb = new THREE.Mesh(new THREE.SphereGeometry(.12,12,8), new THREE.MeshBasicMaterial({color: i%2 ? 0xffcf89:0xc2a4ff})); orb.position.set(x,h+1.15,z); scene.add(orb); }
    }
    // Floating platforms, stepping stones and firefly motes.
    for(let i=0;i<32;i++){ const a=i/32*Math.PI*2, r=12+(i%4)*1.2; const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.34+(i%3)*.07,0),mat(i%2?0x77799c:0x9a8bb1)); stone.position.set(Math.cos(a)*r,.12,Math.sin(a)*r); stone.scale.y=.32; stone.castShadow=true; scene.add(stone); }

    // Player: friendly storybook creature built from simple meshes, so no external model download is required.
    const player = new THREE.Group(); scene.add(player); player.position.set(0,0,20);
    const skin = mat(0xffe9d8), pj = mat(0x9e8bd5), dark = mat(0x302b4d), pink = mat(0xf49ab8), cream = mat(0xfff5e8);
    const sphere = (parent: THREE.Object3D, m: THREE.Material, pos: [number,number,number], scale: [number,number,number]) => { const o=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),m); o.position.set(...pos); o.scale.set(...scale); o.castShadow=true; parent.add(o); return o; };
    sphere(player,pj,[0,.75,0],[.46,.58,.36]); const head=new THREE.Group(); head.position.set(0,1.6,0); player.add(head);
    sphere(head,skin,[0,0,0],[.58,.54,.5]); sphere(head,cream,[0,.34,-.02],[.58,.16,.5]);
    for(const x of [-.22,.22]) { sphere(head,dark,[x,.02,.44],[.075,.11,.055]); sphere(head,cream,[x-.018,.055,.49],[.025,.03,.018]); sphere(head,pink,[x*2.15,-.14,.38],[.11,.055,.025]); }
    sphere(head,dark,[0,-.16,.47],[.07,.045,.035]);
    // sleepy night cap with a pom-pom
    const cap=new THREE.Mesh(new THREE.ConeGeometry(.35,.85,20),pj); cap.position.set(0,.72,0); cap.rotation.z=-.22; cap.castShadow=true; head.add(cap); sphere(head,cream,[-.09,1.14,.01],[.13,.13,.13]);
    for(const x of [-.55,.55]) { const ear=sphere(head,skin,[x,.02,0],[.17,.22,.15]); ear.rotation.z=x; }
    const arms: THREE.Mesh[]=[]; for(const x of [-1,1]) { const arm=sphere(player,pj,[x*.48,.85,0],[.16,.38,.16]); arm.rotation.z=x*.45; arms.push(arm); sphere(player,skin,[x*.51,.55,.04],[.13,.13,.13]); }
    const legs: THREE.Mesh[]=[]; for(const x of [-1,1]) legs.push(sphere(player,pj,[x*.22,.22,0],[.17,.25,.19]));
    // Portal arches + readable floating labels. The nearest portal can be activated with E.
    const portalMeshes: THREE.Group[]=[];
    PORTALS.forEach((p,idx)=>{
      const g=new THREE.Group(); g.position.copy(p.position); scene.add(g); portalMeshes.push(g);
      const color=p.color; const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.11,12,48),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.25,metalness:.15,roughness:.3})); ring.position.y=1.45; ring.castShadow=true; g.add(ring);
      const inner=new THREE.Mesh(new THREE.CircleGeometry(1.02,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false})); inner.position.set(0,1.45,0); g.add(inner);
      const pillarMat=new THREE.MeshStandardMaterial({color:0xeee2ff,metalness:.25,roughness:.35,emissive:color,emissiveIntensity:.15});
      for(const x of [-1.18,1.18]) { const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.12,.17,2.9,8),pillarMat); pillar.position.set(x,1.45,0); pillar.castShadow=true; g.add(pillar); const jewel=new THREE.Mesh(new THREE.OctahedronGeometry(.22),new THREE.MeshBasicMaterial({color})); jewel.position.set(x,3.05,0); g.add(jewel); }
      const base=new THREE.Mesh(new THREE.CylinderGeometry(1.55,1.7,.22,32),mat(0x615a80)); base.position.y=.11; base.receiveShadow=true; g.add(base);
      const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=128; const ctx=canvas.getContext('2d');
      if(ctx){ ctx.clearRect(0,0,512,128); ctx.fillStyle='rgba(18,20,48,.82)'; ctx.beginPath(); ctx.roundRect(8,8,496,112,24); ctx.fill(); ctx.strokeStyle='#ffffff70'; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle='#fff4e8'; ctx.font='bold 30px system-ui'; ctx.textAlign='center'; ctx.fillText(p.title,256,52); ctx.fillStyle='#d9d5ef'; ctx.font='20px system-ui'; ctx.fillText(p.subtitle,256,84); }
      const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace; const label=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false})); label.position.set(0,3.8,0); label.scale.set(4.6,1.15,1); g.add(label);
      const light=new THREE.PointLight(color,9,8); light.position.set(0,2,0); g.add(light);
      const rune=new THREE.Mesh(new THREE.TorusGeometry(1.5,.025,5,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7})); rune.rotation.x=Math.PI/2; rune.position.y=.25; g.add(rune);
      if(idx%2===0){ const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.3),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.5})); crystal.position.set(0,.8,1.55); g.add(crystal); }
    });
    // Controls: camera-relative walk, jump, sprint, mouse orbit, touch joystick.
    const keys = new Set<string>(); let pitch=.18, zoom=9, dragging=false, lastX=0,lastY=0, jumpV=0, grounded=true, touchX=0,touchY=0, touchSprint=false, touchJump=false;
    // Vehicle-like controls: gentle acceleration, coasting and gradual steering.
    let driveSpeed=0; const maxDriveSpeed=5.2, sprintDriveSpeed=8.2, reverseSpeed=-2.3, driveAcceleration=2.0, sprintAcceleration=4.6, driveBrake=3.4, steeringRate=1.65;
    const down=(e:KeyboardEvent)=>{ if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault(); keys.add(e.key.toLowerCase()); if(e.key.toLowerCase()==="e") { const p=closestPortal(); if(p) actionRef.current(p); } if(e.key.toLowerCase()==="escape"){ if(featureOpenRef.current){featureOpenRef.current=false;setActiveFeature(null);} else setPaused(v=>!v); } };
    const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
    const closestPortal=()=>{ let best:Portal|null=null, dist=Infinity; for(const p of PORTALS){const d=Math.hypot(player.position.x-p.position.x,player.position.z-p.position.z);if(d<3.4&&d<dist){best=p;dist=d;}}return best; };
    actionRef.current=(p)=>{ setNearby(p); setHint(`${p.title} opened — close the activity to return to this spot`); featureOpenRef.current = true; setActiveFeature(p); };
    const pointerDown=(e:PointerEvent)=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);};
    const pointerMove=(e:PointerEvent)=>{if(!dragging)return; pitch=Math.max(-.08,Math.min(.55,pitch+(e.clientY-lastY)*.003));lastX=e.clientX;lastY=e.clientY;};
    const pointerUp=()=>dragging=false;
    const wheel=(e:WheelEvent)=>{zoom=Math.max(5,Math.min(22,zoom+e.deltaY*.012));};
    const touchMove=(e:Event)=>{const d=(e as CustomEvent<{x?:number;y?:number;sprint?:boolean;jump?:boolean}>).detail; if(typeof d.x==="number")touchX=d.x; if(typeof d.y==="number")touchY=d.y; if(typeof d.sprint==="boolean")touchSprint=d.sprint; if(d.jump)touchJump=true;};
    window.addEventListener("dream-touch",touchMove);
    const resize=()=>{if(!host)return;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);};
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);window.addEventListener("resize",resize);
    renderer.domElement.addEventListener("pointerdown",pointerDown);renderer.domElement.addEventListener("pointermove",pointerMove);renderer.domElement.addEventListener("pointerup",pointerUp);renderer.domElement.addEventListener("pointercancel",pointerUp);renderer.domElement.addEventListener("wheel",wheel,{passive:true});
    const camTarget=new THREE.Vector3(); const camPos=new THREE.Vector3(); let frame=0, readySent=false;
    let lastMapUpdate = 0;
    const animate=()=>{frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);const t=clock.elapsedTime;
      stars.rotation.y= t*.003; moonGlow.scale.setScalar(1+Math.sin(t*.6)*.035);
      const forward=(keys.has("w")||keys.has("arrowup")?1:0)-(keys.has("s")||keys.has("arrowdown")?1:0)-touchY;
      // Steering direction matches the visible controls: left turns left, right turns right.
      const steer=(keys.has("a")||keys.has("arrowleft")?1:0)-(keys.has("d")||keys.has("arrowright")?1:0)-touchX;
      const inputActive=Math.abs(forward)>.01||Math.abs(steer)>.01;
      const moving=Math.abs(driveSpeed)>.12;
      const controlsLocked=pausedRef.current||featureOpenRef.current;
      if(!controlsLocked){
        const sprinting=(keys.has("shift")||touchSprint)&&forward>0;
        const forwardLimit=sprinting?sprintDriveSpeed:maxDriveSpeed;
        if(forward>0) {
          // Shift raises the actual speed target and acceleration; it is not just a tiny add-on
          // after the normal speed clamp (which previously prevented a real sprint).
          const acceleration=sprinting?sprintAcceleration:driveAcceleration;
          driveSpeed=THREE.MathUtils.damp(driveSpeed,forwardLimit,acceleration,dt);
          driveSpeed=Math.min(forwardLimit,driveSpeed);
        } else if(forward<0) {
          driveSpeed=THREE.MathUtils.damp(driveSpeed,reverseSpeed,driveAcceleration,dt);
          driveSpeed=Math.max(reverseSpeed,driveSpeed);
        } else {
          driveSpeed=THREE.MathUtils.damp(driveSpeed,0,driveBrake,dt);
        }
        // Steering gently turns Pip, like a small vehicle; steering is stronger while rolling.
        if(Math.abs(steer)>.01) player.rotation.y += steer*steeringRate*dt*(.28+Math.min(1,Math.abs(driveSpeed)/2.5));
        const heading=player.rotation.y;
        player.position.x += Math.sin(heading)*driveSpeed*dt;
        player.position.z += Math.cos(heading)*driveSpeed*dt;
      } else { driveSpeed=0; }
      const isWalking=moving||inputActive;
      // Hard square bounds with a small inset so Pip never clips through the fence.
      player.position.x=THREE.MathUtils.clamp(player.position.x,-50.8,50.8);player.position.z=THREE.MathUtils.clamp(player.position.z,-50.8,50.8);
      if((keys.has(" ")||keys.has("space")||touchJump)&&grounded&&!pausedRef.current){jumpV=6.2;grounded=false;touchJump=false;}
      jumpV-=18*dt;player.position.y+=jumpV*dt;if(player.position.y<=0){player.position.y=0;jumpV=0;grounded=true;}
      const gaitRate=5+Math.min(1,Math.abs(driveSpeed)/maxDriveSpeed)*5;const bob=moving?Math.sin(t*gaitRate)*.035:Math.sin(t*2.2)*.018;head.position.y=1.6+bob;arms[0].rotation.z=-.45+(moving?Math.sin(t*gaitRate)*.22:Math.sin(t*1.8)*.04);arms[1].rotation.z=.45-(moving?Math.sin(t*gaitRate)*.22:Math.sin(t*1.8)*.04);legs[0].position.z=moving?Math.sin(t*gaitRate)*.10:0;legs[1].position.z=moving?-Math.sin(t*gaitRate)*.10:0;
      portalMeshes.forEach((g,i)=>{g.rotation.y=Math.sin(t*.25+i)*.06;g.children.forEach(c=>{if(c instanceof THREE.Mesh&&c.geometry instanceof THREE.TorusGeometry)c.rotation.z=t*.12*(i%2?1:-1);});});
      const active=closestPortal(); setNearby(old=>old?.id===active?.id?old:active);setHint(active?`Press E to interact with ${active.title}`:(moving?"Keep exploring — glowing portals unlock Pip's features":"WASD to walk · turn with A/D · find a glowing portal"));
      if (t - lastMapUpdate > 0.12) { lastMapUpdate = t; setMapPosition({ x: player.position.x, z: player.position.z }); }
      camTarget.set(player.position.x,player.position.y+1.2,player.position.z);
      // Camera stays behind Pip’s facing direction, with soft spring-like follow.
      const heading=player.rotation.y;camPos.set(player.position.x-Math.sin(heading)*zoom,player.position.y+2.1+pitch*4,player.position.z-Math.cos(heading)*zoom);camera.position.lerp(camPos,1-Math.exp(-4.2*dt));camera.lookAt(camTarget);
      if(!paused)renderer.render(scene,camera);
      if(!readySent){readySent=true;setGameReady(true);}
    }; animate();
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("resize",resize);window.removeEventListener("dream-touch",touchMove);renderer.domElement.removeEventListener("pointerdown",pointerDown);renderer.domElement.removeEventListener("pointermove",pointerMove);renderer.domElement.removeEventListener("pointerup",pointerUp);renderer.domElement.removeEventListener("pointercancel",pointerUp);renderer.domElement.removeEventListener("wheel",wheel);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if("map" in m && m.map)m.map.dispose();m.dispose();});}});renderer.dispose();if(host.contains(renderer.domElement))host.removeChild(renderer.domElement);};
  }, []);

  const setTouch=(x:number,y:number,extra:{sprint?:boolean;jump?:boolean}={})=>{const event=new CustomEvent("dream-touch",{detail:{x,y,...extra}});window.dispatchEvent(event);};
  const pressTouch=(e: React.PointerEvent<HTMLButtonElement>, x:number, y:number, extra:{sprint?:boolean;jump?:boolean}={})=>{e.preventDefault(); try{e.currentTarget.setPointerCapture(e.pointerId);}catch{} setTouch(x,y,extra);};
  const releaseTouch=(e: React.PointerEvent<HTMLButtonElement>, extra:{sprint?:boolean}={})=>{e.preventDefault(); try{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}catch{} setTouch(0,0,extra);};
  const enterMobileFullscreen = async () => {
    try {
      const root = document.querySelector(".dream-game") as HTMLElement | null;
      if (root && !document.fullscreenElement && root.requestFullscreen) await root.requestFullscreen();
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
      if (orientation?.lock) await orientation.lock("landscape").catch(() => undefined);
    } catch { /* Some browsers only allow fullscreen/orientation from supported install modes. */ }
  };
  const current = nearby;
  return <main className="dream-game">
    <div className="dream-rotate-prompt" role="status"><div className="dream-rotate-phone">▱<span>↻</span></div><p className="dream-loading-kicker">A BIGGER DREAM AWAITS</p><h2>Turn your phone sideways</h2><p>For the best 3D experience, play in landscape mode.</p><button onClick={enterMobileFullscreen}>Try landscape fullscreen ⛶</button></div>
    { !gameReady && <div className="dream-loading-screen" role="status" aria-live="polite"><div className="dream-loading-card"><div className="dream-loading-orbit"><span>✦</span><i></i><b></b></div><p className="dream-loading-kicker">PIP&apos;S DREAM WORKSHOP</p><h1>Preparing your dream world</h1><p className="dream-loading-copy">Waking the stars, lighting the portals, and finding Pip&apos;s place in the park…</p><div className="dream-loading-track"><span /></div><div className="dream-loading-foot"><span>LOADING 3D ENVIRONMENT</span><span className="dream-loading-pulse">● ● ●</span></div></div></div> }
    <div className="dream-game-canvas" ref={mountRef} aria-label="Interactive 3D dream park" />
    <header className="dream-hud"><div className="dream-brand"><span className="dream-brand-mark">✦</span><span><b>PIP&apos;S DREAM WORLD</b><small>Midnight Nursery · Free roam</small></span></div><div className="dream-hud-right"><span className="dream-level">✧ DREAMER LV. 01</span><button onClick={()=>setHelp(v=>!v)} className="dream-icon-btn" aria-label="Controls help">?</button><button onClick={()=>setPaused(v=>!v)} className="dream-icon-btn" aria-label={paused?"Resume game":"Pause game"}>{paused?"▶":"Ⅱ"}</button><button onClick={enterMobileFullscreen} className="dream-fullscreen-btn" aria-label="Enter full screen landscape">⛶ <span>Fullscreen</span></button><Link href="/" className="dream-exit">⇦ Exit 3D World</Link></div></header>
    <div className="dream-location"><span className="dream-live-dot"/> DREAM PARK <span>•</span> {current?current.title.toUpperCase():"FREE EXPLORATION"}</div>
    <div className="dream-bottom-left"><div className="dream-avatar">☾</div><div><b>{current?`Found: ${current.title}`:"Hey, dreamer!"}</b><p>{hint}</p></div></div>
    <button className="dream-minimap" type="button" onClick={() => setMapOpen(true)} aria-label="Open and zoom the world map"><span className="dream-map-title"><span>NEARBY MAP</span><span>⤢</span></span><span className="dream-map-inner dream-nearby-map"><span className="nearby-map-crosshair"/><span className="map-player" style={{ left: "50%", top: "50%" }}/>{PORTALS.map((portal) => { const dx = portal.position.x - mapPosition.x; const dz = portal.position.z - mapPosition.z; const range = 19; if (Math.abs(dx) > range || Math.abs(dz) > range) return null; return <i key={portal.id} className="map-dot" title={`${portal.title} · ${Math.round(Math.hypot(dx, dz))}m away`} style={{ left: `${50 + (dx / range) * 47}%`, top: `${50 + (dz / range) * 47}%`, background: `#${portal.color.toString(16).padStart(6, "0")}` }}/>; })}</span><small>{PORTALS.filter((portal) => Math.hypot(portal.position.x - mapPosition.x, portal.position.z - mapPosition.z) <= 19).length} checkpoints nearby · Click for full map</small></button>
    {mapOpen && <div className="dream-map-backdrop" onClick={() => setMapOpen(false)}><section className="dream-map-modal" role="dialog" aria-modal="true" aria-label="Expanded world map" onClick={e => e.stopPropagation()}><div className="dream-map-modal-head"><div><span className="dream-modal-eyebrow">PIP&apos;S DREAM WORLD</span><h2>World Map</h2><p>All checkpoints and Pip&apos;s live position. The marker updates as you move.</p></div><button className="dream-modal-close" aria-label="Close world map" onClick={() => setMapOpen(false)}>×</button></div><div className="dream-large-map"><div className="dream-map-grid"/><span className="dream-map-boundary-label">PARK BOUNDARY</span>{PORTALS.map((portal, index) => <div key={portal.id} className="dream-checkpoint" style={{ left: `${((portal.position.x + 52) / 104) * 100}%`, top: `${((portal.position.z + 52) / 104) * 100}%` }} title={portal.title}><span style={{ background: `#${portal.color.toString(16).padStart(6, "0")}` }}>{index + 1}</span><small>{portal.title}</small></div>)}<div className="dream-player-marker" style={{ left: `${((mapPosition.x + 52) / 104) * 100}%`, top: `${((mapPosition.z + 52) / 104) * 100}%` }}><span>✦</span><b>PIP · YOU</b></div></div><div className="dream-map-legend"><span><i className="legend-player"/> Pip · live position</span><span><i className="legend-checkpoint"/> Activity checkpoints (20)</span><span>WASD / arrow keys to move while map is open</span></div><button className="dream-primary" onClick={() => setMapOpen(false)}>Return to Dream World</button></section></div>}
    <div className="dream-controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span><span><kbd>SHIFT</kbd> Hold to sprint</span><span><kbd>SPACE</kbd> Jump</span><span><kbd>DRAG</kbd> Look</span><span><kbd>E</kbd> Interact</span></div>
    {help&&<div className="dream-modal-backdrop" onClick={()=>setHelp(false)}><section className="dream-modal" onClick={e=>e.stopPropagation()}><button className="dream-modal-close" onClick={()=>setHelp(false)}>×</button><span className="dream-modal-eyebrow">QUICK GUIDE</span><h2>Make yourself at home.</h2><p>Explore the park in third-person. Move with WASD or arrow keys, hold Shift while moving forward to accelerate into a faster sprint, press Space to hop, and the camera stays behind Pip; drag vertically to adjust the view. Walk up to a glowing portal and press E to discover a feature.</p><div className="dream-guide-grid"><span>⌨️ <b>Keyboard</b><small>WASD · Shift · Space · E</small></span><span>🖱️ <b>Camera</b><small>Drag vertically · scroll to zoom</small></span><span>🌟 <b>Explore</b><small>Explore the expanded park inside the glowing square boundary</small></span></div><button className="dream-primary" onClick={()=>setHelp(false)}>Let's explore ✨</button></section></div>}
    {paused&&<div className="dream-modal-backdrop"><section className="dream-modal"><span className="dream-modal-eyebrow">A LITTLE BREATHER</span><h2>Dreams can wait.</h2><p>Your world is paused. Ready to wander again?</p><button className="dream-primary" onClick={()=>setPaused(false)}>Back to the world</button><Link href="/" className="dream-secondary-link">Exit 3D World and return to workshop ↗</Link></section></div>}
    {current&&!paused&&!activeFeature&&<div className="dream-interact"><span className="dream-interact-icon">{current.icon}</span><div><small>PORTAL NEARBY</small><b>{current.title}</b><p>{current.subtitle}</p></div><button onClick={()=>{featureOpenRef.current=true;setActiveFeature(current);}}>E&nbsp; Explore</button></div>}
    {activeFeature&&!paused&&<div className="dream-modal-backdrop dream-activity-backdrop" onClick={()=>{featureOpenRef.current=false;setActiveFeature(null);}}><section className="dream-modal dream-feature-modal dream-activity-modal" onClick={e=>e.stopPropagation()}><button className="dream-modal-close" aria-label="Close activity and return to 3D world" onClick={()=>{featureOpenRef.current=false;setActiveFeature(null);}}>×</button><DreamFeatureContent id={activeFeature.id as DreamFeatureId} /><button className="dream-primary dream-return-world" onClick={()=>{featureOpenRef.current=false;setActiveFeature(null);}}>← Return to the same place in Dream World</button></section></div>}
    {welcomeToast&&<div className="dream-toast dream-welcome-toast" role="status"><span className="dream-welcome-icon">✦</span><span><b>Welcome to Pip’s Dream World!</b><small> You’re now in the 3D park. Move with WASD or arrow keys; the camera follows Pip as you explore.</small></span><button aria-label="Dismiss welcome message" onClick={()=>setWelcomeToast(false)}>×</button></div>}
    {message&&<div className="dream-toast" role="status">{message}<button onClick={()=>setMessage("")}>×</button><Link href="/">Open workshop ↗</Link></div>}
    <div className="dream-mobile-controls" aria-label="Mobile game controls">
      <div className="dream-mobile-dpad" aria-label="Movement">
        <button aria-label="Walk forward" onPointerDown={e=>pressTouch(e,0,-1)} onPointerUp={e=>releaseTouch(e)} onPointerCancel={e=>releaseTouch(e)} onLostPointerCapture={e=>releaseTouch(e)}>▲</button>
        <div><button aria-label="Steer left" onPointerDown={e=>pressTouch(e,-1,0)} onPointerUp={e=>releaseTouch(e)} onPointerCancel={e=>releaseTouch(e)} onLostPointerCapture={e=>releaseTouch(e)}>◀</button><button aria-label="Steer right" onPointerDown={e=>pressTouch(e,1,0)} onPointerUp={e=>releaseTouch(e)} onPointerCancel={e=>releaseTouch(e)} onLostPointerCapture={e=>releaseTouch(e)}>▶</button></div>
        <button aria-label="Reverse" onPointerDown={e=>pressTouch(e,0,1)} onPointerUp={e=>releaseTouch(e)} onPointerCancel={e=>releaseTouch(e)} onLostPointerCapture={e=>releaseTouch(e)}>▼</button>
      </div>
      <div className="dream-mobile-actions" aria-label="Actions">
        <button className="dream-mobile-action walk" onPointerDown={e=>pressTouch(e,0,-1)} onPointerUp={e=>releaseTouch(e)} onPointerCancel={e=>releaseTouch(e)} onLostPointerCapture={e=>releaseTouch(e)}><span>↟</span>Walk</button>
        <button className="dream-mobile-action sprint" onPointerDown={e=>pressTouch(e,0,-1,{sprint:true})} onPointerUp={e=>releaseTouch(e,{sprint:false})} onPointerCancel={e=>releaseTouch(e,{sprint:false})} onLostPointerCapture={e=>releaseTouch(e,{sprint:false})}><span>⚡</span>Sprint</button>
        <button className="dream-mobile-action jump" onPointerDown={e=>{e.preventDefault();setTouch(0,0,{jump:true});}}><span>↑</span>Jump</button>
        <button className="dream-mobile-action interact" disabled={!current||paused||!!activeFeature} onClick={()=>{if(current){featureOpenRef.current=true;setActiveFeature(current);}}}><span>✦</span>Interact</button>
      </div>
    </div>
    {message&&null}
  </main>;
}
