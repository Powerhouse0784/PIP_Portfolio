/**
 * Pip checks the sky where the visitor is. Free, key-less Open-Meteo APIs (geocoding + forecast), called straight from
 * the browser only after the visitor asks. The town is saved in this browser only. Weather data by Open-Meteo.com (CC BY 4.0).
 */
export type Kind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";
export type Place = { name: string; lat: number; lon: number };
export type Sky = { place: string; temp: number; kind: Kind; isDay: boolean; label: string; line: string };

const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";

export const kindFor = (code: number): Kind =>
  code === 0 ? "clear" : code <= 2 ? "partly" : code === 3 ? "cloudy" : code === 45 || code === 48 ? "fog" :
  code >= 51 && code <= 57 ? "drizzle" : (code >= 61 && code <= 67) || (code >= 80 && code <= 82) ? "rain" :
  (code >= 71 && code <= 77) || code === 85 || code === 86 ? "snow" : code >= 95 ? "storm" : "cloudy";

const LABEL: Record<Kind, string> = { clear: "Clear sky", partly: "A few clouds", cloudy: "Cloudy", fog: "Foggy", drizzle: "Drizzly", rain: "Rainy", snow: "Snowy", storm: "Stormy" };
const LINES: Record<Kind, { day: string; night: string }> = {
  clear:   { day: "A big blue sky! Perfect for cloud-spotting later.", night: "Clear skies tonight. Every star on my list can see you." },
  partly:  { day: "A few fluffy clouds. I’m sending them a wave.", night: "Some clouds, some stars. A peek-a-boo kind of night." },
  cloudy:  { day: "Cloudy and soft. Nap weather, if you ask me.", night: "A cloud blanket over the stars. They’re tucked in too." },
  fog:     { day: "Foggy! The world is wearing a big white blanket.", night: "Foggy and hushed. Even the owls whisper tonight." },
  drizzle: { day: "A tiny drizzle. The clouds are sprinkling lullabies.", night: "A tiny drizzle on the roof. Best lullaby there is." },
  rain:    { day: "Rain! Pillow-fort weather. Grab a blanket.", night: "Rain on the window tonight. Prepare for the coziest sleep." },
  snow:    { day: "Snow! Everything is wearing a fluffy hat, like me.", night: "Snow falling softly. The whole world is a pillow." },
  storm:   { day: "A rumbly sky. Don’t worry, it’s just the clouds yawning loudly.", night: "Rumbly clouds tonight. Pull the blanket up, I’m right here." },
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function findPlace(query: string): Promise<Place | null> {
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return null;
  const res = await fetch(`${GEO}?name=${encodeURIComponent(q)}&count=1&language=en&format=json`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`geo ${res.status}`);
  const j = (await res.json()) as { results?: { name?: string; admin1?: string; country?: string; latitude?: number; longitude?: number }[] };
  const r = j.results?.[0];
  const lat = num(r?.latitude), lon = num(r?.longitude);
  if (!r || lat === null || lon === null) return null;
  const name = [r.name, r.country].filter(Boolean).join(", ").slice(0, 60);
  return { name: name || q, lat, lon };
}

export async function fetchSky(p: Place): Promise<Sky> {
  const url = `${FORECAST}?latitude=${p.lat.toFixed(3)}&longitude=${p.lon.toFixed(3)}&current=temperature_2m,weather_code,is_day&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`forecast ${res.status}`);
  const j = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number; is_day?: number } };
  const c = j.current, temp = num(c?.temperature_2m), code = num(c?.weather_code);
  if (!c || temp === null || code === null) throw new Error("bad forecast");
  const kind = kindFor(code), isDay = c.is_day === 1;
  return { place: p.name, temp: Math.round(temp), kind, isDay, label: LABEL[kind], line: LINES[kind][isDay ? "day" : "night"] };
}
