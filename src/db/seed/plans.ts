/** U6 2026-27 season plan, transcribed from "U6 Rugby Development Plan 29 Nov 2026 – 2 May 2027". */

export type PlanSeed = {
  n: number;
  date: string; // ISO Sunday
  theme: string;
  outcome: string;
  arrival: "Bulldog" | "Tag Bulldog" | "Ball Bulldog";
  skill1: string; // drill slug
  skill2: string;
  finish: string;
  checkpoint?: string;
  pathway: string; // season period theme
};

export const U6_PLANS: PlanSeed[] = [
  { n: 1, date: "2026-11-29", theme: "Baseline and ball confidence", outcome: "Observe confidence, coordination and willingness to carry.", arrival: "Bulldog", skill1: "ball-familiarity", skill2: "treasure-hunt", finish: "bulldog", checkpoint: "Record a simple baseline: confidence carrying, catching and moving in a group.", pathway: "Love the ball" },
  { n: 2, date: "2026-12-06", theme: "Two-hand carry and scanning", outcome: "Carry securely while looking for space.", arrival: "Bulldog", skill1: "ball-familiarity", skill2: "bulldog", finish: "bulldog", pathway: "Love the ball" },
  { n: 3, date: "2026-12-13", theme: "Catching foundations", outcome: "Hands ready, watch ball, soft catch.", arrival: "Bulldog", skill1: "passing-gates", skill2: "pass-and-follow", finish: "bulldog", pathway: "Love the ball" },
  { n: 4, date: "2026-12-20", theme: "Accurate short passing", outcome: "Pass to chest over 2-3 m.", arrival: "Bulldog", skill1: "passing-gates", skill2: "pass-and-follow", finish: "bulldog", checkpoint: "Can most players make and catch a short pass without stepping into the receiver?", pathway: "Love the ball" },
  { n: 5, date: "2026-12-27", theme: "Movement and change of direction", outcome: "Accelerate, stop and evade safely.", arrival: "Bulldog", skill1: "rob-the-nest", skill2: "1v1-evasion", finish: "bulldog", pathway: "Love the ball" },
  { n: 6, date: "2027-01-03", theme: "Catch, pass and move", outcome: "Move immediately after passing.", arrival: "Bulldog", skill1: "passing-gates", skill2: "pass-and-follow", finish: "bulldog", pathway: "Me and my teammate" },
  { n: 7, date: "2027-01-10", theme: "Running with a partner", outcome: "Maintain spacing while jogging.", arrival: "Bulldog", skill1: "running-pairs", skill2: "passing-gates", finish: "bulldog", pathway: "Me and my teammate" },
  { n: 8, date: "2027-01-17", theme: "Introduction to tags", outcome: "Remove and return tags safely.", arrival: "Bulldog", skill1: "tag-technique", skill2: "1v1-evasion", finish: "bulldog", checkpoint: "Can players remove and return tags safely without grabbing clothing?", pathway: "Me and my teammate" },
  { n: 9, date: "2027-01-24", theme: "Tag response", outcome: "Stop, turn and pass after tag.", arrival: "Bulldog", skill1: "tag-technique", skill2: "tag-and-pass", finish: "bulldog", pathway: "Me and my teammate" },
  { n: 10, date: "2027-01-31", theme: "Support the ball carrier", outcome: "Follow in a useful passing position.", arrival: "Bulldog", skill1: "tag-and-pass", skill2: "four-corner-support", finish: "end-zone-game", checkpoint: "Can a support player stay close enough to receive after a tag?", pathway: "Me and my teammate" },
  { n: 11, date: "2027-02-07", theme: "Run or pass decision", outcome: "Recognise space and defender commitment.", arrival: "Bulldog", skill1: "1v1-evasion", skill2: "2v1", finish: "end-zone-game", pathway: "Beat the defender" },
  { n: 12, date: "2027-02-14", theme: "Fix the defender", outcome: "Run straight before passing.", arrival: "Bulldog", skill1: "2v1", skill2: "running-pairs", finish: "end-zone-game", pathway: "Beat the defender" },
  { n: 13, date: "2027-02-21", theme: "Width and support", outcome: "Avoid bunching; create a passing option.", arrival: "Bulldog", skill1: "four-corner-support", skill2: "2v1", finish: "end-zone-game", checkpoint: "Can pairs create width rather than standing directly behind each other?", pathway: "Beat the defender" },
  { n: 14, date: "2027-02-28", theme: "Defensive tracking", outcome: "Track hips and make safe tags.", arrival: "Tag Bulldog", skill1: "tag-technique", skill2: "2v2", finish: "u7-tag", pathway: "Beat the defender" },
  { n: 15, date: "2027-03-07", theme: "Free pass and restart habits", outcome: "Start quickly, receiver ready and defenders reset.", arrival: "Tag Bulldog", skill1: "passing-gates", skill2: "tag-and-pass", finish: "u7-tag", pathway: "Play tag" },
  { n: 16, date: "2027-03-14", theme: "First complete tag game", outcome: "Connect carry, pass, tag, reset and score.", arrival: "Tag Bulldog", skill1: "2v1", skill2: "end-zone-game", finish: "u7-tag", checkpoint: "March milestone: can the group complete a basic 4 v 4 tag game with coach support?", pathway: "Play tag" },
  { n: 17, date: "2027-03-21", theme: "Passing before pressure", outcome: "Pass before being trapped or tagged.", arrival: "Ball Bulldog", skill1: "running-pairs", skill2: "2v2", finish: "u7-tag", pathway: "Play tag" },
  { n: 18, date: "2027-03-28", theme: "Using the full pitch", outcome: "Spread across width and attack open space.", arrival: "Ball Bulldog", skill1: "four-corner-support", skill2: "2v2", finish: "u7-tag", pathway: "Play tag" },
  { n: 19, date: "2027-04-04", theme: "Support after passing", outcome: "Pass, follow and become available again.", arrival: "Ball Bulldog", skill1: "pass-and-follow", skill2: "2v1", finish: "u7-tag", checkpoint: "Can players pass, follow and become useful again?", pathway: "Play, refine, challenge" },
  { n: 20, date: "2027-04-11", theme: "Tagging and defensive line", outcome: "Track together and reset onside.", arrival: "Ball Bulldog", skill1: "tag-technique", skill2: "2v2", finish: "u7-tag", pathway: "Play, refine, challenge" },
  { n: 21, date: "2027-04-18", theme: "Decision-making under pressure", outcome: "Choose run or pass without coach instruction.", arrival: "Ball Bulldog", skill1: "2v1", skill2: "2v2", finish: "u7-tag", pathway: "Play, refine, challenge" },
  { n: 22, date: "2027-04-25", theme: "Game fluency", outcome: "Sustain play with fewer stoppages.", arrival: "Ball Bulldog", skill1: "end-zone-game", skill2: "u7-tag", finish: "u7-tag", pathway: "Play, refine, challenge" },
  { n: 23, date: "2027-05-02", theme: "End-of-season festival", outcome: "Celebrate progress and assess readiness for U7.", arrival: "Ball Bulldog", skill1: "passing-gates", skill2: "2v1", finish: "u7-tag", checkpoint: "Final review: note each player's strongest skill and next development goal.", pathway: "Play, refine, challenge" },
];

export const ARRIVAL_FOCUS = "Fun start; high movement and minimal instruction.";
export const WATER_FOCUS = "Drinks and a quick breather. Ask one question: What helps the team?";
export const CHALLENGE_FOCUS = "Quick conditioned challenge: a 60-90 second repeat with one condition.";
export const FINISH_FOCUS = "Free-flowing finish. Coach only safety, one core rule and the session objective.";
export const EQUIPMENT = "Size 3 balls, 20-30 cones, tag belts from January, bibs and a whistle. Build duplicate stations when numbers require.";

export const U7_RULES_MD = `**Practical summary of the RFU U7 tag rules (2026-27). The official RFU Regulation 15, Appendix 1 remains authoritative: check it before fixtures or festivals.**

- **Format:** equal teams, max 4 per side on the pitch. Rolling substitutions when the ball is dead, with the referee's permission.
- **Pitch and ball:** max 20 m x 12 m, size 3 ball.
- **Playing time:** max 10 minutes per half.
- **Object:** ground the ball on or behind the opponents' goal line. Stay on your feet: no diving.
- **Passing:** sideways or backwards. A forward pass is a free pass to the other team.
- **Free pass:** starts/restarts play and is the sanction for infringements. Passer holds the ball in two hands and passes when told; opponents retire.
- **The tag:** defender removes one tag, calls TAG and returns it promptly. Ball carrier stops and passes, then replaces the tag before rejoining.
- **Offside:** players must be onside at restarts and after a tag. Build the habit of defenders retreating and attackers supporting from behind the ball.
- **Ball on ground:** play continues from a knock-on. If unplayable or unsafe, restart with a free pass.
- **Not permitted:** tackling, kicking, scrums, lineouts, or any contact to prevent a score.
- **Sanctions:** free pass first. Referee supportively and in proportion to experience.

Source: [RFU Regulation 15, Age Grade Rugby](https://www.englandrugby.com/run/rules-governance/rfu-rules-and-regulations/regulation-15-age-grade-rugby)`;
