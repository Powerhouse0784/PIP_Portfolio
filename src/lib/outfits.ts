/** Dress-up pieces in the hero art's own 620x931 coordinates. They sit on top of the official artwork; the art is never recoloured. */
export type OutfitId = "none" | "glasses" | "halo" | "scarf" | "bow";

export const OUTFITS: { id: OutfitId; label: string; emoji: string; svg: string }[] = [
  { id: "none", label: "Original", emoji: "🌙", svg: "" },
  {
    id: "glasses", label: "Round glasses", emoji: "👓",
    svg: '<g fill="none" stroke="#c8963e" stroke-width="7" stroke-linecap="round"><circle cx="247" cy="392" r="62"/><circle cx="410" cy="349" r="62"/><path d="M308 380 Q330 358 349 354"/><path d="M186 380 L150 352"/><path d="M472 336 L500 318"/></g><g stroke="#fff" stroke-opacity=".75" stroke-width="5" fill="none" stroke-linecap="round"><path d="M207 350 Q222 338 240 336"/><path d="M370 308 Q385 296 402 294"/></g>',
  },
  {
    id: "halo", label: "Moon halo", emoji: "✨",
    svg: '<g transform="rotate(-8 300 100)"><ellipse cx="300" cy="100" rx="112" ry="24" fill="none" stroke="#f2c56b" stroke-width="10"/><ellipse cx="300" cy="100" rx="112" ry="24" fill="none" stroke="#fff3c4" stroke-width="3" opacity=".8"/></g><g fill="#f2c56b"><path d="M196 80 l5 11 12 2 -9 8 3 12 -11-6 -11 6 3-12 -9-8 12-2z"/><path d="M420 64 l4 9 10 1 -7 7 2 10 -9-5 -9 5 2-10 -7-7 10-1z"/></g>',
  },
  {
    id: "scarf", label: "Cozy scarf", emoji: "🧣",
    svg: '<path d="M188 466 Q318 524 452 452" fill="none" stroke="#d9577e" stroke-width="36" stroke-linecap="round"/><path d="M188 466 Q318 524 452 452" fill="none" stroke="#ffd9e4" stroke-width="36" stroke-dasharray="12 20" stroke-dashoffset="6"/><g transform="rotate(8 330 510)"><rect x="312" y="486" width="38" height="96" rx="16" fill="#d9577e"/><rect x="312" y="486" width="38" height="96" rx="16" fill="none" stroke="#ffd9e4" stroke-width="6" stroke-dasharray="12 20"/><path d="M316 582 v14 M328 582 v14 M340 582 v14" stroke="#d9577e" stroke-width="5" stroke-linecap="round"/></g>',
  },
  {
    id: "bow", label: "Bow tie", emoji: "🎀",
    svg: '<path d="M318 488 L262 458 Q246 488 262 518 Z" fill="#a34063"/><path d="M318 488 L374 458 Q390 488 374 518 Z" fill="#a34063"/><path d="M318 488 L275 468 Q266 488 275 508 Z" fill="#c9577f"/><path d="M318 488 L361 468 Q370 488 361 508 Z" fill="#c9577f"/><circle cx="318" cy="488" r="13" fill="#8a2f50"/>',
  },
];
