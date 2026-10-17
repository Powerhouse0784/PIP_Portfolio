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
2. SQL Editor: paste and run `supabase/schema.sql`.
3. Put `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and in Vercel (Production) env vars. Redeploy after adding them.
The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` and never commit `.env.local`.
Without these variables the site still works; the guestbook shows "sleeping" and the counter is hidden.

## Make Pip talk back (optional, free API keys)
Add either or both to `.env.local` and to Vercel (Production), then redeploy:
- `GEMINI_API_KEY` from aistudio.google.com/apikey (tried first)
- `GROQ_API_KEY` from console.groq.com/keys (used if Gemini fails or is unset)

With a key, the chat bubble answers in Pip's voice (and can offer a "Take me to the toys" jump link) and the Dream Maker writes a fresh dream each time. Without keys, or if a provider is down or rate-limited, both quietly fall back to the hand-written rules and recipe book. Keys are server-only; `/api/chat` and `/api/dream` validate input with zod, cap lengths, rate-limit per visitor (Upstash if configured) and only allow a whitelist of section ids in jump links.

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
- Moderation: set `GUESTBOOK_MODERATION=pending` to hold new notes until you flip `is_approved` in Supabase.
- Keep the asset credit in the footer.

## Quality notes
- Responsive: verified at 320, 375, 768, 1024, 1440 and 1920 px in day and night; no horizontal overflow, touch targets are 44px+, phones/tablets get a menu/two-column layouts.
- Lighthouse (mobile, local production build): Performance 95, Accessibility 100, Best Practices 96, SEO 100.
- Fonts are self-hosted via `next/font`; below-the-fold toys load lazily (`LazyMount`); security headers set in `next.config.mjs`; `icon.svg`, `manifest.ts`, OG/Twitter metadata and `error.tsx` included.
- Guestbook/visit APIs degrade quietly (200 with `unavailable`) when Supabase env vars are missing.
