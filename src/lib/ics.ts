/** Builds a calendar file (iCalendar, RFC 5545) for a repeating daily bedtime reminder. Runs in the browser; nothing is uploaded. */
const p2 = (n: number) => String(n).padStart(2, "0");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Content lines longer than 75 octets must be folded. */
const fold = (line: string) => {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 74) {
    let cut = 70;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out;
};
const local = (d: Date) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`;
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function parseTime(v: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const hour = Number(m[1]), minute = Number(m[2]);
  return hour > 23 || minute > 59 ? null : { hour, minute };
}

export function bedtimeIcs(hour: number, minute: number, url: string, now = new Date()): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
  if (start <= now) start.setDate(start.getDate() + 1);
  const end = new Date(+start + 20 * 60_000);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pip's Dream Workshop//Bedtime//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:pip-bedtime-${p2(hour)}${p2(minute)}@pips-dream-workshop`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${local(start)}`, // floating time: stays at this clock time wherever you are
    `DTEND:${local(end)}`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${esc("Bedtime with Pip ✦")}`,
    `DESCRIPTION:${esc("Time to wind down. Pip has tonight's dream ready for you.")}`,
    `URL:${url}`,
    "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", `DESCRIPTION:${esc("Pip says: time to wind down, sleepyhead.")}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return `${lines.flatMap(fold).join("\r\n")}\r\n`;
}
