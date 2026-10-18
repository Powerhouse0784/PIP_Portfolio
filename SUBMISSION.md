# Submission kit: Pip's Dream Workshop (Track 1)

Fill in your live URL and repo URL, then paste the sections into the haX.baby submission form.
Submission portal opens 18 Oct 17:17 IST and closes 19 Oct 17:17 IST. Check the live form for exact fields.

- Live site: https://YOUR-SITE.vercel.app
- Repository: https://github.com/YOUR-USER/pips-dream-workshop (commit history must fall between 17 and 19 October 2026)

## Story behind the build

Pip's Dream Workshop is an interactive character portfolio for Pip, the sleepy Junior Dream Engineer of Midnight Nursery. Instead of a page of cards, it is a small nursery above the clouds: it turns from a warm cream scrapbook by day into a plum observatory at night, and Pip's eyes follow your pointer, he giggles when poked, and he falls asleep at night until you wake him.

All six project ideas from the brief are playable: a generative Lullaby Lab (Web Audio, with a mute switch), a Nightlight Collection that relights the room, scroll-linked Dream Delivery Routes, a page-flip Bedtime Storybook, Rattle and Block toys, and a growth chart on the nursery wall. A falling-dreams game, a flashlight "Dark Room", and a hidden five-poke star with a secret command round out the surprises.

For Tier 3 there is a real WebGL scene (Three.js) where nine orbiting stars ring a pentatonic scale, a live guestbook and visit odometer on Supabase, a character that remembers returning visitors, and a chat where Pip answers in his own voice using a free-tier Gemini or Groq model. Everything AI-powered has a hand-written fallback, so the site never breaks if an API is asleep.

My proudest details: one consistent motion language, sound that is off until you opt in, keyboard and touch support for every interaction, and a test suite that checks console errors, sideways scroll, every toy and the error states.

## Credits

- Pip, Midnight Nursery and all character artwork: haX.baby Track 1 official asset pack.
- Fonts: Fraunces, Fredoka, Plus Jakarta Sans (SIL Open Font License, via Google Fonts).
- Sound: Pip's Dream Workshop audio pack (original synthesized ambience, lullaby and effects), plus live Web Audio chimes.
- Libraries and services: Next.js, React, TypeScript, three.js (MIT), zod, Supabase, Upstash Redis, Vercel, Playwright; Google Gemini and Groq models for Pip's chat and dream-writing.
- Weather (only when a visitor asks): Open-Meteo.com, free and key-less (CC BY 4.0).
- AI coding assistance: Claude.

## 60-second judge walkthrough

1. 0-10s: Hero, tagline, Pip's eyes follow you; poke him.
2. 10-25s: Lullaby Lab (sound on, press play), then the lantern glow.
3. 25-40s: Scroll the story and delivery route; open the storybook.
4. 40-50s: Open the 3D Dream Mobile and ring a few stars; flip day/night.
5. 50-60s: Chat with Pip ("what toys do you have?"), sign the guestbook, show the phone view.
