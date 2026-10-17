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

## Little extras
- **Jump menu** (`✦ Jump` button or the `/` key): go to any section, toggle themes, or run the secret command.
- **Pip's speech bubble**: reacts to theme, sound, chaos mode, pokes, toys and the guestbook; dozes off after 45 s idle; the tab title waits for you.
- **Share cards**: the block tower and growth chart render a 1080x1350 PNG on a canvas (native share sheet on phones, download elsewhere).
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
