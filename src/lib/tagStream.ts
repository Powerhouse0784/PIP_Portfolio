/**
 * Streams Pip's reply to the browser while hiding the machine tags the model appends ({go:toys}, {mood:giggly}, {act:dance}).
 * Text is emitted as soon as it is safe; anything after a "{" is held back until we know whether it is a tag.
 * Characters the UI strips elsewhere (_ ` # >) are removed here too, and total output is capped.
 */
const TAG = /^\{(go|mood|act):[^}]*\}/i;
const TAG_START = /^\{(go|mood|act):/i;

export class TagFilter {
  private held = "";
  private sent = 0;
  constructor(private readonly max = 260) {}

  private emit(s: string): string {
    const cleaned = s.replace(/[_`#>]/g, "").replace(/\s+/g, " ");
    const room = this.max - this.sent;
    if (room <= 0) return "";
    const out = cleaned.slice(0, room);
    this.sent += out.length;
    return out;
  }

  /** Feed a raw model chunk; returns the text that is safe to show now. */
  feed(chunk: string): string {
    let buf = this.held + chunk;
    this.held = "";
    let out = "";
    for (;;) {
      const i = buf.indexOf("{");
      if (i < 0) { out += this.emit(buf); break; }
      out += this.emit(buf.slice(0, i));
      buf = buf.slice(i);
      const m = buf.match(TAG);
      if (m) { buf = buf.slice(m[0].length); continue; }                          // a complete tag: drop it
      if (buf.indexOf("}") < 0 && buf.length < 24) { this.held = buf; break; }  // might still become a tag: wait
      out += this.emit("{"); buf = buf.slice(1);                                // just a brace in normal text
    }
    return out;
  }

  /** End of stream: release anything still held (an unfinished tag is dropped, other text is kept). */
  flush(): string {
    const h = this.held; this.held = "";
    return TAG_START.test(h) ? "" : this.emit(h);
  }
}
