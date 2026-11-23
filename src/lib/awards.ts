/**
 * Award types: one source of truth for the chart, the give-award form and award lists.
 * Fixed order = fixed colour (validated categorical slots --series-1..4); colour follows the type.
 */
export const AWARD_TYPES = [
  {
    value: "player_of_week",
    label: "Player of the week",
    short: "POTW",
    emoji: "⭐",
    colour: "var(--series-1)",
    hint: "One standout player from this week's session.",
    presets: ["Player of the Week"],
  },
  {
    value: "badge",
    label: "Badge",
    short: "Badges",
    emoji: "🏅",
    colour: "var(--series-2)",
    hint: "Recognises a skill or quality. Can be earned any time.",
    presets: ["Super Supporter", "Tag Master", "Try Scorer", "Great Listener", "Team Player"],
  },
  {
    value: "milestone",
    label: "Milestone",
    short: "Milestones",
    emoji: "🎯",
    colour: "var(--series-3)",
    hint: "A first-time achievement worth remembering.",
    presets: ["First Tag Game", "First Try", "First Session", "First Festival"],
  },
  {
    value: "certificate",
    label: "Certificate",
    short: "Certificates",
    emoji: "📜",
    colour: "var(--series-4)",
    hint: "A formal certificate, e.g. end of season.",
    presets: ["Season Certificate", "Age Group Graduate"],
  },
] as const;

export type AwardType = (typeof AWARD_TYPES)[number]["value"];
export const awardType = (v: string) => AWARD_TYPES.find((t) => t.value === v) ?? AWARD_TYPES[0];
