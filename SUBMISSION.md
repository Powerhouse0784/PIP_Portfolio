# Submission kit: Pip's Dream Workshop (Track 1)

Fill in your live URL and repo URL, then paste the sections into the haX.baby submission form.
Submission portal opens 18 Oct 17:17 IST and closes 19 Oct 17:17 IST. Check the live form for exact fields.

- Live site: https://YOUR-SITE.vercel.app
- Repository: https://github.com/YOUR-USER/pips-dream-workshop (commit history must fall between 17 and 19 October 2026)

## Story behind the build

Pip's Dream Workshop is an interactive character portfolio for Pip, the sleepy Junior Dream Engineer of Midnight Nursery. Instead of a page of cards, it is a small nursery above the clouds: it turns from a warm cream scrapbook by day into a plum observatory at night, and Pip's eyes follow your pointer, he giggles when poked, and he falls asleep at night until you wake him.

All six project ideas from the brief are playable: a generative Lullaby Lab (Web Audio, with a mute switch), a Nightlight Collection that relights the room, scroll-linked Dream Delivery Routes, a page-flip Bedtime Storybook, Rattle and Block toys, and a growth chart on the nursery wall. A falling-dreams game, a flashlight "Dark Room", and a hidden five-poke star with a secret command round out the surprises.

For Tier 3 there is a real 3D Pip built in Three.js (drag to rotate, eyes that follow you, tap his head, bow or stars, wave, spin, tuck him in) plus a dream mobile where nine orbiting stars ring a pentatonic scale, a live guestbook and visit odometer on Supabase, a character that remembers returning visitors, and a chat where Pip answers in his own voice using a free-tier Gemini or Groq model. Everything AI-powered has a hand-written fallback, so the site never breaks if an API is asleep.

Early-web soul is everywhere: a marquee, retro pill badges, a hit-counter odometer, and a draggable Windows-95-style "Pip's Desktop" with a Top 8 and a dream defragmenter. A second secret hides in plain sight: type "goodnight" and the whole nursery tucks Pip in.

Built to be opened again tomorrow: a sticker book with 31 things to find, a night streak, a shy star that hides somewhere new every day, a new dream card every night, a calendar bedtime reminder, and an installable app that also opens offline.

My proudest details: one consistent motion language, sound that is off until you opt in, keyboard and touch support for every interaction, and a test suite that checks console errors, sideways scroll, every toy and the error states.

## Credits

- Pip, Midnight Nursery and all character artwork: haX.baby Track 1 official asset pack.
- Fonts: Fraunces, Fredoka, Plus Jakarta Sans (SIL Open Font License, via Google Fonts).
- Sound: Pip's Dream Workshop audio pack (original synthesized ambience, lullaby and effects), plus live Web Audio chimes.
- Libraries and services: Next.js, React, TypeScript, three.js (MIT), zod, Supabase, Upstash Redis, Vercel, Playwright; Google Gemini, xAI Grok and Groq models for Pip's chat, stories and dream-writing; the browser's own speech voice for Pip (instant, sentence by sentence as he writes; Gemini text-to-speech is an opt-in).
- Weather (only when a visitor asks): Open-Meteo.com, free and key-less (CC BY 4.0).
- Modern browser APIs used with graceful fallbacks: Service Workers, View Transitions, Media Session, Vibration, Web Speech, Web Audio, WebGL.
- AI coding assistance: Claude.

## 60-second judge walkthrough

1. 0-10s: Hero, tagline, Pip's eyes follow you; poke him. Scroll one screen to "Everything Pip can do" and show the three tiers.
2. 10-25s: Lullaby Lab (sound on, press play), then the lantern glow.
3. 25-40s: Scroll the story and delivery route; open the storybook.
4. 40-50s: Open "Meet Pip in 3D" (drag, giggle, sleepy mode), ring a few stars on the dream mobile; flip day/night.
5. 50-60s: Chat or talk to Pip in the Dream Corner, type "goodnight", sign the guestbook, show the phone view.
