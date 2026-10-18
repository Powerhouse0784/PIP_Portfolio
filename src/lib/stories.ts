export type Story = { title: string; pages: string[] };

/** Pip's own bedtime stories. Used when no AI key is set, or when a request fails, so "Tell a story" always works. */
export const STORIES: Story[] = [
  {
    title: "The Sleepy Little Cloud",
    pages: [
      "Once upon a bedtime, a small cloud could not sleep. It drifted past the Midnight Nursery, sighing softly. “Everyone else is dreaming,” it said, “and I am still awake.”",
      "Pip heard the sigh and tiptoed out in his nightcap. “Come and rest above the lanterns,” he whispered. “Their glow is warm, and warm things make the best pillows.”",
      "So the little cloud settled over the nursery. The lanterns hummed, the stars blinked slowly, and the cloud began to dream of rain on a quiet garden. Pip yawned too. Goodnight.",
    ],
  },
  {
    title: "Pip and the Lost Lullaby",
    pages: [
      "One night, the nursery was too quiet. Somewhere, a lullaby had wandered off. Pip put on his nightcap and carried his lantern out to look for it.",
      "He asked the owl. He asked the moon. At last the music box giggled, “I was only hiding inside the melody, silly!” And out tumbled the softest tune, right into Pip’s hands.",
      "Pip hummed it back to every sleepy window, one by one. The nursery glowed, the dreams began, and Pip curled up beside the music box with a very big yawn.",
    ],
  },
  {
    title: "The Star Who Wanted a Nap",
    pages: [
      "High above the rooftops lived a tiny star who was tired of twinkling. “Just one night off,” it wished. “Just one.”",
      "Pip climbed his ladder of clouds and listened. “You can rest,” he said. “I’ll build a nightlight that twinkles in your place.” He glued a bit of amber glow into a paper lantern.",
      "The star closed its eyes, and the lantern shone softly all night. In the morning the star woke up fresh and sparkly, and Pip was snoring happily in his nightcap.",
    ],
  },
  {
    title: "The Midnight Delivery",
    pages: [
      "Pip had one dream left to deliver, and it was for the smallest house on Pond Lane. He packed it in a tiny box tied with a pink bow, just like his nightcap.",
      "He tiptoed over the rooftops, slow and careful. A breeze tried to tug the box away, but Pip held on tight and giggled. “Not tonight, Mr. Breeze!”",
      "At last he slipped the dream through the window. Inside, a little one smiled in their sleep. Pip waved to the moon, yawned a gigantic yawn, and floated home.",
    ],
  },
];
