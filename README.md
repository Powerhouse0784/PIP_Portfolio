# Pip’s Dream Workshop

Interactive character portfolio for Pip, the Junior Dream Engineer of Midnight Nursery.
Next.js (App Router) + TypeScript + Supabase (guestbook and visit counter).

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in Supabase values (optional: site works without them)
npm run dev                  # http://localhost:3000
```

## Supabase (guestbook + counter)
1. Create a project at supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql`. **Already running v13?** Run `supabase/migration-v14.sql` instead (safe to re-run): it adds reactions and the moderation stamp. Until you do, notes still load, but stars/hearts and moderation show a clear error.
3. Put `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and in Vercel (Production) env vars. Redeploy after adding them.
The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` and never commit `.env.local`.
Without these variables the site still works; the guestbook shows "sleeping" and the counter is hidden.

## Make Pip talk back (optional, free API keys)
Add either or both to `.env.local` and to Vercel (Production), then redeploy:
- `GEMINI_API_KEY` from aistudio.google.com/apikey (tried first)
- `XAI_API_KEY` (or `GROK_API_KEY`) from console.x.ai: xAI Grok, tried second. Default model `grok-4.3`; override with `XAI_MODEL`.
- `GROQ_API_KEY` from console.groq.com/keys (Groq, a different company from xAI; used last). Note: a Grok key does NOT work as `GROQ_API_KEY`.

**How the chat answers (v18):** replies **stream in word by word** (NDJSON from `/api/chat`; `lib/tagStream.ts` hides the `{mood}`, `{go}` and `{act}` tags even when they arrive split across chunks, and the finished reply carries the validated mood, link and move). Each request tells Pip what the visitor is looking at (time of day, tonight's moon phase, the section on screen and, if they gave one, their first name, all from fixed vocabularies or letters-only strings validated with zod) and shows him his own last three replies so he does not echo himself. Without keys, the offline rule book has several lines per topic and never repeats the same line back to back. Providers are tried Gemini, then Grok, then Groq; the next one is only used if the previous fails before saying anything. To develop without spending quota run `npm run mock:llm` and start the app with `GEMINI_API_KEY=mock GEMINI_API_BASE=http://localhost:4010/v1beta npm run dev` (`scripts/mock-llm.mjs` also fakes Grok and Groq via `XAI_API_BASE` / `GROQ_API_BASE` ending in `/v1`).

Every request also gets a small server-side "creative spark" (random props, tone and a conversational move from fixed lists in `lib/sparks.ts`) so replies and dreams differ each time.

With a key, the chat bubble answers in Pip's voice (and can offer a "Take me to the toys" jump link) and the Dream Maker writes a fresh dream each time. Without keys, or if a provider is down or rate-limited, both quietly fall back to the hand-written rules and recipe book. Keys are server-only; `/api/chat` and `/api/dream` validate input with zod, cap lengths, rate-limit per visitor (Upstash if configured) and only allow a whitelist of section ids in jump links.

## Talk to Pip (voice + commands)
In the **Dream Corner** (the night-sky scene with Pip in the middle) tap the mic (or type, or tap any button) and say things like "dance", "spin around", "wink", "sing me a lullaby", "go to sleep".
- **Moves:** dance, spin, jump, wave, sleep, sing, clap, hide, laugh, bow, fly, love, wink, surprise. Pip starts moving instantly from a free local word match (`lib/pipAct.ts`), so it works with no API key and offline.
- **Brain:** `/api/chat` (Gemini, then Grok, then Groq) writes his answer and picks his mood (6 expressions) and, if you asked for a move, an `{act:...}` tag that is checked against the whitelist.
- **Ears:** the browser's Web Speech API (Chrome, Edge, Safari; free). In Chrome the audio is processed by Google. Firefox has no speech input, so the text box and chips are the fallback.
- **Voice:** `/api/voice` uses Gemini text-to-speech (free tier, voice set by `GEMINI_VOICE`, model by `GEMINI_TTS_MODEL`, tone follows his mood). If it is missing, rate-limited or fails, the browser's own speech voice is used. Pip's head bobs while he talks.
- `next.config.mjs` now allows the microphone for this site only (`microphone=(self)`); the old header blocked it.

## Tests
```bash
npm install
npm run test:install     # one-time: downloads Chromium for Playwright
npm test                 # builds, starts on :3100, runs desktop + Pixel 7 checks
BASE_URL=https://your-site.vercel.app npm test   # same checks against the live site
```
Covers: console errors, sideways scroll, theme and mute toggles, the five-poke star, the Jump menu (press `/`) and secret command, chaos mode, block tower and growth-chart share cards, guestbook success and error states, lullaby play/stop.

## Deploy
Push to GitHub, import in Vercel, add the two env vars, deploy. Test the live URL on a phone.

## Audio
Sound is off until the visitor opts in (top-bar ♪ or pressing Play in the Lullaby Lab). Files live in `public/audio/` (ambience loop as WAV, one-shots as MP3). Ambience loops quietly and ducks while a lullaby plays; sfx replace each other so nothing piles up; muting fades everything out; the ambience pauses when the tab is hidden. Mapping: lullaby = Sleepy mood, chime = day/night and lanterns, delivery = route houses, page = storybook, toy = blocks and rattle, sparkle = Easter egg and all nine 3D stars, sleepy = Pip dozing off after 45 s idle. Pitched game blips still use Web Audio.

## Tier 3 extras
- **3D Dream Mobile** (`#mobile3d`): a Three.js scene with Pip's official art in an arched window and nine orbiting 3D stars, a crescent moon and a cloud. Drag or use the Turn buttons, tap a star (or "Ring a star") for a pentatonic chime. Lazy-loaded (three.js stays out of the first load), pauses off-screen and in hidden tabs, theme-aware, and falls back to the flat art if WebGL is unavailable.
- **AI Pip**: see above. Optional voice toggle in the chat uses the browser's speech synthesis (off by default).

## Little extras
- **Hero entrance and chapter rail (v18)**: the hero's text and Pip's arch animate in staggered, timed to the opening scene (it waits behind the intro and plays as the clouds part; with no intro it plays from CSS at first paint, so it never waits for JavaScript). Scroll reveals now cover every section's heading and label. On screens 1200px and wider a **night-sky rail** (one star per chapter, filled by scroll progress, tooltips on hover or focus) shows where you are and jumps to a chapter. Reduced motion: nothing is hidden or animated. Safety nets: a script that never loads cannot leave the hero hidden (7 s timer) or the opening scene on screen (6 s timer).
- **Dream postcards (v19)**: every dream Pip writes (the Dream Maker ticket, the daily card and the shared PNG) gets its own painted night scene, generated in the browser as an SVG from the dream's words and feeling (`lib/dreamArt.ts`). Same dream, same picture; a lantern, balloon, flower, rainbow, house or kite appears if the dream mentions one. No image API, no cost, works offline. Reduced motion freezes the twinkling and drifting.
- **Check the sky (v19)**: under Tonight's sky, a visitor can opt in to real weather. They type a town (or share their location); only that town or those coordinates go to Open-Meteo (free, no key, CC BY 4.0), Pip comments on it in his speech bubble, and rain, snow, drizzle, fog or storm drifts over the nursery (CSS only, no flashing, hidden for reduced motion, never blocks clicks). Saved in this browser only; "Forget my town" clears it (`lib/weather.ts`, `components/SkyWeather.tsx`, `WeatherFX.tsx`).
- **Scroll-linked origin story (v19)**: a painted panorama above the three story cards follows your scroll: dusk turns to night, stars appear, the fallen star lands, then a delivery star lights the rooftop windows one by one. It stays pinned under the header while the cards scroll on phones. Reduced motion shows three still moments instead.
- **Remembers your sound choice**: turning sound on or off is saved. A returning visitor who left it on gets a small "Welcome back, sound on?" prompt (after the intro, once per tab). Browsers still need that click, so nothing ever auto-plays.
- **Mood-reactive scenery**: the lantern you pick tints the whole page; the Lullaby Lab tints it in the lullaby's mood and pulses it with every note. The same colour lights the 3D dream mobile, and the matching star pulses in time with each note (`lib/tint.ts`, `components/Atmosphere.tsx`).
- **Tonight's real sky**: the true moon phase (mean synodic month, about half a day accurate) and a time-of-day greeting, computed in the browser from the clock. No API, nothing sent anywhere (`lib/sky.ts`).
- **Daily dream card**: one AI-written dream per browser per day, woven around tonight's moon, remembered until midnight (a refresh never spends another), with a dream-diary night counter and a shareable 1080x1350 picture card. Falls back to Pip's recipe book offline.
- **Guestbook reactions and wish wall**: a star and a heart per note (one of each per visitor, enforced in Postgres). Every approved note also floats as a small pink star in the 3D scene; tap one, or pick it from the wish list, to read it. New notes join live.
- **Pip's mood from the chat**: the AI reply carries a mood tag (happy, sleepy, giggly, curious, proud, shy; validated against a whitelist, with a words-based fallback and the rule book offline). The hero art reacts with eye glints, blush and sparkles for a few seconds, the chat shows how he feels, and the chat button changes face.
- **Cinematic intro** (`components/Intro.tsx`): on a first visit in a tab, a starry-sky scene with a three-layer parallax sky, drifting clouds, a swaying glowing lantern and Pip rising into an arched window, then **Enter the Dream Workshop** (or **Enter with sound ♪**). **Skip intro** and `Esc` leave at once; reduced motion gets a calm still frame. Pure CSS/SVG (no new libraries or images), shown once per tab session, skipped for `#deep-links` and `?intro=0`; the footer has **Replay the intro**.
- **Jump menu** (`✦ Jump` button or the `/` key): go to any section, toggle themes, or run the secret command.
- **Pip's speech bubble**: reacts to theme, sound, chaos mode, pokes, toys and the guestbook; dozes off after 45 s idle; the tab title waits for you.
- **Share cards**: the block tower and growth chart render a 1080x1350 PNG on a canvas (native share sheet on phones, download elsewhere).
- **Sleeping Pip**: at night Pip dozes (dim eyes, breathing, floating z's). Tap or press Enter on him to wake him for 9 seconds.
- **Atmosphere**: drifting clouds, orbiting stars, theme-aware colour washes and scalloped cloud edges on the Projects and Guestbook bands.
- **Stats strip + odometer**: "Dreams delivered" grows with every receipt you collect (stored in this browser only); the footer odometer shows the real shared visit count.
- **Star-wand cursor** for mouse users only (CSS, no JS).

## Structure
- `src/app/page.tsx`: page content. `globals.css`: design tokens (day/night) and styles.
- `src/components/`: LullabyLab (Web Audio), Lanterns, DeliveryRoute (SVG, scroll-linked), Storybook (page-flip), Toys (block tower + rattle), GrowthChart (nursery wall), Story, EasterEgg, Guestbook, VisitorCounter, SiteHeader (theme + sound), Providers (audio opt-in).
- `src/app/api/guestbook`, `src/app/api/visits`: validated route handlers (zod, honeypot, basic rate limit).
- `public/images`: Pip artwork from the official asset pack (resized to webp).

## Before public launch
- Guestbook: add `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` for a durable rate limiter (falls back to memory without them). Links are rejected server-side.
- Moderation: set `GUESTBOOK_MODERATION=pending` to hold new notes until you approve them at `/admin/guestbook`. Set `GUESTBOOK_ADMIN_TOKEN` to a long random string (16+ characters, e.g. `openssl rand -base64 24`) in Vercel; open the page, paste the token, and approve / hide / delete. The token is sent in an `Authorization` header (never a URL), kept only in that tab, compared in constant time, and a visitor who gets it wrong 10 times is locked out for an hour. The page is `noindex` and disallowed in `robots.txt`.
- Keep the asset credit in the footer.

## Quality notes
- Responsive: verified at 320, 375, 768, 1024, 1440 and 1920 px in day and night; no horizontal overflow, touch targets are 44px+, phones/tablets get a menu/two-column layouts.
- Lighthouse (mobile, local production build): Performance 95, Accessibility 100, Best Practices 96, SEO 100.
- Fonts are self-hosted via `next/font`; below-the-fold toys load lazily (`LazyMount`); security headers set in `next.config.mjs`; `icon.svg`, `manifest.ts`, OG/Twitter metadata and `error.tsx` included.
- Guestbook/visit APIs degrade quietly (200 with `unavailable`) when Supabase env vars are missing.


## Pip AI Companion — voice and expressions

### Talk to Pip
Open the floating chat and choose **🎙 Talk to Pip**. In browsers that expose the Web Speech API (commonly Chrome/Edge), allow microphone access, speak a short turn, then pause. The recognized utterance is sent to the existing `/api/chat` endpoint; Pip's reply is spoken using browser speech synthesis. Voice is enabled automatically when microphone mode starts. You can stop listening at any time and still type normally.

- Microphone access requires HTTPS in production (localhost is generally permitted).
- Speech recognition availability and accuracy depend on browser, operating system, language, and network. Safari/Firefox or privacy-restricted browsers may not expose recognition; the microphone control is hidden if unsupported.
- The browser's recognition service may process audio according to that browser/vendor's terms. No raw audio is sent by this app to a new server endpoint.
- If permission is denied, no microphone is available, or recognition fails, an accessible status message explains the issue and text chat remains available.

**Important capability boundary:** this is browser-native, turn-based voice input + Pip's existing AI text response + browser text-to-speech. It is not a full-duplex Gemini Live / Grok Voice streaming session: audio is not streamed directly to an AI model, there is no barge-in/interrupt handling while Pip speaks, and the model does not return generated audio. The existing Gemini → xAI Grok → Groq text provider chain remains unchanged. Do not describe this implementation as true real-time speech-to-speech.

### Pip expression poses
AI-selected moods use the existing validated `pip:feel` event and the six approved moods (`happy`, `sleepy`, `giggly`, `curious`, `proud`, `shy`). The original Pip artwork is preserved. CSS transitions animate the existing eye glints, blush overlays, sparkles, and stage movement to create mood poses; they do not swap or redraw the source artwork. Reduced-motion preferences disable the new pulsing/transition effects.

### API keys and security
Keep `GEMINI_API_KEY`, `XAI_API_KEY`/`GROK_API_KEY`, and `GROQ_API_KEY` in server-side environment variables only. Never prefix them with `NEXT_PUBLIC_`. The microphone feature calls only the existing same-origin `/api/chat` endpoint and does not expose provider keys to the browser.

### Voice troubleshooting
1. Run `npm install` and `npm run dev`.
2. Open the site on `http://localhost:3000` or deploy over HTTPS.
3. Allow microphone access in the browser's site settings and check that the OS microphone is not muted.
4. If voice input is unsupported, blocked, or inaccurate, use the text field. Pip's existing hand-written fallback remains available when AI providers are not configured.
5. Run `npm test` for the Playwright suite. Browser microphone permission and external speech services are not reliably testable in a headless CI run; test those manually on a real browser/device.

## Dream Corner (the activity scene)
`PipDreamCorner.tsx` is Pip in the middle of a night-sky scene, with eight activities around him and six more below. Every one is real:
- **Dance / Sing / Sleepy mode / Give a hug** move Pip (CSS animations on the Pip in the corner), change his face, and play the matching sound. Sing turns sound on (the tap is the opt-in), plays the lullaby and shows an original four-line verse. Hugs are counted in `localStorage`.
- **Tell a story:** `/api/story` (Gemini, then Grok, then Groq) writes a three-page story, optionally on a topic the visitor typed; `lib/stories.ts` has four stories of Pip's own for offline use. Pages turn, can be read aloud, and link to the big storybook.
- **Show magic:** star-dust burst plus a wish that floats up to the moon.
- **Change outfit:** glasses, moon halo, scarf, bow tie. They are SVG pieces drawn on top of the official art in the art's own coordinates (`lib/outfits.ts`); the artwork itself is never recoloured.
- **Take a photo:** flash, then a real 1080x1350 polaroid of Pip in his current outfit (`lib/photoCard.ts`) to save or share.
- **Draw something:** a drawing pad (pointer, touch, pen) plus "Pip doodles" for keyboard users.
- **Type or talk:** the idea box and the microphone understand all of the above ("tell me a story about a dragon", "put on the glasses", "take a photo", "wake up"), then moves (spin, wave...), then the AI.
- Voice engine shared with the rest of the site: `lib/pipVoice.ts`.
