/** Season pathway and key-skill standards (from the U6 development plan). */

export const SEASON_PATHWAY = [
  { period: "Nov-Dec", theme: "Love the ball", outcomes: "Movement, two-handed carry, catching, short passing, evasion" },
  { period: "Jan", theme: "Me and my teammate", outcomes: "Pass and move, running pairs, tags, support" },
  { period: "Feb", theme: "Beat the defender", outcomes: "1 v 1, 2 v 1, width, run-or-pass decisions" },
  { period: "Mar", theme: "Play tag", outcomes: "Restarts, offside habits, tag response, complete 4 v 4" },
  { period: "Apr-May", theme: "Play, refine, challenge", outcomes: "Game fluency, independent decisions, team shape" },
];

export const BLOCK_TYPES = [
  { value: "arrival", label: "Fun arrival game", colour: "#f59e0b" },
  { value: "skill", label: "Skill activity", colour: "#0d9488" },
  { value: "water", label: "Water break", colour: "#0ea5e9" },
  { value: "challenge", label: "Challenge", colour: "#8b5cf6" },
  { value: "game", label: "Fun finishing game", colour: "#e11d48" },
] as const;
