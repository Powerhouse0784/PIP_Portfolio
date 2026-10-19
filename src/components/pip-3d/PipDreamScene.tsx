"use client";
import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Html, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";
import "./pip-dream-scene.css";

type Mood = "idle" | "wave" | "run" | "sleep" | "celebrate";
const moods: {id:Mood;label:string;icon:string}[]=[{id:"idle",label:"Idle",icon:"✦"},{id:"wave",label:"Wave",icon:"👋"},{id:"run",label:"Run",icon:"♡"},{id:"sleep",label:"Sleep",icon:"☾"},{id:"celebrate",label:"Celebrate",icon:"✧"}];

export function PipDreamScene(){
 const [mood,setMood]=useState<Mood>("idle");
 return <section className="pip-shell" aria-label="Interactive 3D Pip">
  <header className="pip-heading"><span>✦ YOUR LITTLE DREAM FRIEND ✦</span><h2>Meet Pip</h2><p>Tap Pip or choose a little mood to see what happens.</p></header>
  <div className="pip-canvas">
   <Canvas shadows dpr={[1,1.6]} camera={{position:[0,.35,6.4],fov:36}}>
    <Suspense fallback={<Html center><div className="pip-loading">Waking Pip… ✨</div></Html>}>
     <color attach="background" args={["#fff4e8"]}/><fog attach="fog" args={["#fff4e8",10,24]}/>
     <ambientLight intensity={1.5}/><directionalLight position={[5,8,7]} intensity={2.1} color="#fff0d8" castShadow/>
     <pointLight position={[-3,2,3]} intensity={12} distance={12} color="#ffd786"/><pointLight position={[3,0,-3]} intensity={8} distance={10} color="#dfc7ff"/>
     <Environment preset="studio"/><Stars radius={45} depth={22} count={450} factor={2} saturation={0} fade speed={.25}/>
     <Sparkles count={36} scale={[8,5,5]} size={2} speed={.2} color="#e8bc68"/>
     <Float speed={mood==="sleep"?.45:1.2} rotationIntensity={.05} floatIntensity={mood==="sleep"?.05:.16}><Pip mood={mood} wave={()=>setMood("wave")}/></Float>
     <Cloud/><Moon/><ContactShadows position={[0,-1.65,0]} opacity={.25} scale={7} blur={2.5} far={4.5}/>
     <OrbitControls enablePan={false} minDistance={4.4} maxDistance={8} minPolarAngle={Math.PI*.28} maxPolarAngle={Math.PI*.58} target={[0,.2,0]}/>
    </Suspense>
   </Canvas><div className="pip-caption">A tiny friend from the dream clouds</div>
  </div>
  <div className="pip-buttons" role="group" aria-label="Pip animation moods">{moods.map(m=><button key={m.id} className={mood===m.id?"active":""} aria-pressed={mood===m.id} onClick={()=>setMood(m.id)}><span>{m.icon}</span>{m.label}</button>)}</div>
  <p className="pip-hint">Click Pip to wave · drag to look around · use the buttons to change moods</p>
 </section>;
}
function Pip({mood,wave}:{mood:Mood;wave:()=>void}){
 const pink="#f3a8bd",lav="#c8b6e8",gold="#f5cf79",cream="#fff0dc";
 const heart=useMemo(()=>{const s=new THREE.Shape();s.moveTo(0,.2);s.bezierCurveTo(-.5,.65,-.95,.05,0,-.5);s.bezierCurveTo(.95,.05,.5,.65,0,.2);return s},[]);
 return <group onClick={wave} rotation={[0,0,mood==="sleep"?-.12:0]} position={[0,mood==="run"?.05:0,0]}>
  <mesh position={[0,-.55,0]} castShadow><capsuleGeometry args={[.47,.65,8,18]}/><meshStandardMaterial color={cream} roughness={.85}/></mesh>
  {[-1,1].map((side)=><group key={side} position={[side*.43,-.25,0]} rotation={[0,0,mood==="wave"&&side===1?-2.1:mood==="celebrate"?(side===1?-1.1:1.1):mood==="run"?(side===1?.9:-.9):mood==="sleep"?.5:0]}>
    <mesh position={[side*.14,-.06,0]} rotation={[0,0,side*-.45]} castShadow><capsuleGeometry args={[.16,.35,6,14]}/><meshStandardMaterial color={cream}/></mesh>
    <mesh position={[side*.25,-.24,.08]} scale={.17}><sphereGeometry args={[1,20,16]}/><meshStandardMaterial color="#fff2df"/></mesh>
   </group>)}
  {[-1,1].map(side=><group key={side} position={[side*.29,-1.05,0]} rotation={[0,0,mood==="run"?side*.45:0]}>
    <mesh><capsuleGeometry args={[.21,.35,6,14]}/><meshStandardMaterial color={cream}/></mesh><mesh position={[0,-.19,.14]} scale={[1.05,.65,.9]}><sphereGeometry args={[.21,20,16]}/><meshStandardMaterial color={lav}/></mesh>
  </group>)}
  {Array.from({length:9},(_,i)=><mesh key={i} position={[(i%3-1)*.22,-.18-Math.floor(i/3)*.26,.445]} rotation={[0,0,Math.PI]} scale={.06}><shapeGeometry args={[heart]}/><meshStandardMaterial color={pink}/></mesh>)}
  <group position={[0,.65,0]}>
   <mesh castShadow><sphereGeometry args={[.92,48,36]}/><meshStandardMaterial color="#fff4e5" roughness={.72}/></mesh>
   <mesh position={[0,-.34,.08]} scale={[.77,.42,.77]}><sphereGeometry args={[.72,32,24]}/><meshStandardMaterial color="#fff2df"/></mesh>
   {[-.38,.38].map(x=><group key={x} position={[x,.04,.79]}>
    <mesh scale={[.29,.35,.12]}><sphereGeometry args={[1,32,24]}/><meshStandardMaterial color="#2b1b20" roughness={.25}/></mesh>
    <mesh position={[.04,-.02,.105]} scale={.105}><sphereGeometry args={[1,24,20]}/><meshStandardMaterial color="#ffc95d" emissive="#ffb52f" emissiveIntensity={2}/></mesh>
    <mesh position={[-.07,.12,.108]} scale={.035}><sphereGeometry args={[1,16,12]}/><meshBasicMaterial color="#fff8df"/></mesh>
   </group>)}
   <mesh position={[0,-.03,.935]} rotation={[0,0,Math.PI]}><coneGeometry args={[.065,.08,3]}/><meshStandardMaterial color="#39252a"/></mesh>
   <Smile/>
   {[-1,1].map(x=><mesh key={x} position={[x*.65,-.24,.62]} scale={[.16,.07,.025]}><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color="#f5a1b5" transparent opacity={.65}/></mesh>)}
   <group position={[0,.61,-.02]} rotation={[0,0,.25]}>
    <mesh position={[-.15,.28,0]} scale={[.85,.75,.8]}><sphereGeometry args={[.67,32,24]}/><meshStandardMaterial color="#fff0d8" roughness={.9}/></mesh>
    <mesh position={[.38,.52,0]} rotation={[0,0,.75]}><coneGeometry args={[.34,.82,32]}/><meshStandardMaterial color="#fff0d8" roughness={.9}/></mesh>
    <mesh position={[.68,.84,0]} scale={.19}><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color="#f3e1d2"/></mesh>
    {Array.from({length:8},(_,i)=><mesh key={i} position={[-.46+(i%4)*.2,.47+Math.floor(i/4)*.18,.53]} scale={.035}><octahedronGeometry args={[1]}/><meshStandardMaterial color={gold}/></mesh>)}
   </group>
   <group position={[-.47,.55,.61]} rotation={[0,0,-.15]}>
    <mesh position={[-.16,0,0]} scale={[1,.72,.45]}><sphereGeometry args={[.22,24,16]}/><meshStandardMaterial color={pink}/></mesh>
    <mesh position={[.16,0,0]} scale={[1,.72,.45]}><sphereGeometry args={[.22,24,16]}/><meshStandardMaterial color={pink}/></mesh>
    <mesh scale={[.09,.12,.09]}><sphereGeometry args={[1,20,16]}/><meshStandardMaterial color="#df829d"/></mesh>
   </group>
  </group>
  {mood==="celebrate"&&Array.from({length:12},(_,i)=><mesh key={i} position={[Math.sin(i*2)*1.15,.25+(i%4)*.4,Math.cos(i*2)*.5]} scale={.07}><octahedronGeometry args={[1]}/><meshStandardMaterial color={i%2?pink:gold} emissive={gold} emissiveIntensity={.25}/></mesh>)}
 </group>;
}
function Smile(){const c=new THREE.CatmullRomCurve3([new THREE.Vector3(-.19,-.2,.92),new THREE.Vector3(-.1,-.27,.95),new THREE.Vector3(.03,-.29,.95),new THREE.Vector3(.16,-.22,.92)]);return <mesh><tubeGeometry args={[c,20,.018,8,false]}/><meshStandardMaterial color="#573b3a"/></mesh>}
function Cloud(){return <group position={[0,-1.72,0]}>{Array.from({length:9},(_,i)=>{const a=i/9*Math.PI*2;return <mesh key={i} position={[Math.cos(a)*.8,Math.sin(a)*.12,Math.sin(a)*.55]} scale={[.53,.36,.42]} castShadow><sphereGeometry args={[1,24,18]}/><meshStandardMaterial color={i%2?"#fff7f0":"#f9e7e7"} roughness={.95}/></mesh>})}<mesh position={[0,-.02,.02]} scale={[.94,.3,.56]}><sphereGeometry args={[1,32,24]}/><meshStandardMaterial color="#fff5ed"/></mesh></group>}
function Moon(){return <group position={[1.48,1.72,-.45]}><mesh rotation={[0,0,-.2]}><torusGeometry args={[.34,.11,16,48,Math.PI*1.55]}/><meshStandardMaterial color="#f5cb73" emissive="#eab75a" emissiveIntensity={.3}/></mesh><mesh position={[-.55,-.55,0]} scale={.11}><octahedronGeometry args={[1]}/><meshStandardMaterial color="#c7b5e8"/></mesh><mesh position={[.55,-.8,0]} scale={.08}><octahedronGeometry args={[1]}/><meshStandardMaterial color="#f4c2cf"/></mesh></group>}
