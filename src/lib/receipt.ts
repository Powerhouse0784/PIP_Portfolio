export type R = { n: number; text: string };
let n = 0;
export const nextReceipt = (text: string): R => ({ n: ++n, text });
