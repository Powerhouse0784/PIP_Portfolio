/** Tiny event bus: any component can make Pip say something in the corner bubble. */
export const say = (text: string) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("pip:say", { detail: text }));
};
export const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
