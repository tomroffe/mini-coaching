import type { Diagram } from "../../lib/diagram";
import { corners, diagram } from "./diagram-builder";

export type DrillSeed = {
  slug: string;
  title: string;
  category: string;
  ageGroups: string[];
  durationMin: number;
  minPlayers: number;
  area: string;
  equipment: string[];
  summary: string;
  setup: string;
  howToRun: string;
  coachingCues: string[];
  progressions: string[];
  regressions?: string[];
  safetyNotes?: string;
  tags: string[];
  diagram: Diagram;
};

const MINIS = ["U6", "U7", "U8"];

export const DRILLS: DrillSeed[] = [
  // ── 1. Bulldog ────────────────────────────────────────────────────────────
  {
    slug: "bulldog",
    title: "Bulldog",
    category: "game",
    ageGroups: MINIS,
    durationMin: 7,
    minPlayers: 5,
    area: "12 x 20 m",
    equipment: ["cones", "bibs", "tag belts (optional)"],
    summary: "Classic chase-and-evade game. Runners cross the grid without being tagged.",
    setup: "12 x 20 m grid. Two cone lines mark the safe ends. One or two taggers start in the middle.",
    howToRun:
      "On \"Bulldog!\" the runners try to cross to the far end without being tagged. Tagged players join the middle (or do a quick task and rejoin, depending on confidence). Keep going until a few runners are left, then reset with new taggers.",
    coachingCues: ["Eyes up", "Accelerate into space", "Change direction under control", "No contact or blocking"],
    progressions: ["Carry a ball", "Require two hands on the ball near a defender", "Add tag belts when ready (Tag Bulldog)"],
    regressions: ["Taggers walk only", "Wider grid"],
    safetyNotes: "Two-hand touch or tag only: no grabbing, pushing or tackling.",
    tags: ["evasion", "warm-up", "physical literacy"],
    diagram: diagram(
      { w: 20, h: 12, zones: [{ x: 0, y: 0, w: 2, h: 12, fill: "endzone", label: "Safe" }, { x: 18, y: 0, w: 2, h: 12, fill: "endzone", label: "Safe" }], lines: [], gridEvery: 4 },
      [
        ...corners(20, 12),
        ["r1", "attacker", 1, 2, "teal", "R"],
        ["r2", "attacker", 1, 4.7, "teal", "R"],
        ["r3", "attacker", 1, 7.3, "teal", "R"],
        ["r4", "attacker", 1, 10, "teal", "R"],
        ["t1", "defender", 10, 6, "coral", "T"],
        ["t2", "defender", 10, 7.3, "coral", "T"],
      ],
      [
        { caption: "Set-up: runners on one safe line, a tagger in the middle.", hide: ["t2"] },
        {
          caption: "On \"Bulldog!\" everyone runs across, eyes up, looking for space.",
          run: { r1: [9, 1.8], r2: [8.5, 4.2, 0.8], r3: [8, 7.6], r4: [9, 10.4, -0.6], t1: [8.6, 7.3] },
        },
        {
          caption: "Tagged! That runner joins the middle as a tagger.",
          callouts: [[8.2, 6.2, "TAG!"]],
          hide: ["r3"],
          show: ["t2"],
          move: { t2: [8, 7.6] },
        },
        {
          caption: "Everyone else reaches the far safe line. Now two taggers for the next run.",
          run: { r1: [19, 2, 0.5], r2: [19, 4.5], r4: [19, 10, -0.5], t1: [11, 5], t2: [11, 8] },
        },
      ],
    ),
  },

  // ── 2. Ball Familiarity ───────────────────────────────────────────────────
  {
    slug: "ball-familiarity",
    title: "Ball Familiarity",
    category: "ball handling",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 1,
    area: "12 x 12 m",
    equipment: ["size 3 ball per player", "4 cones"],
    summary: "Every player has a ball and moves freely, responding to fun calls.",
    setup: "12 x 12 m grid. Every player has a size 3 ball.",
    howToRun:
      "Players move freely while responding to calls: change direction, stop, place and pick up, transfer hand, circle the waist, score over a line.",
    coachingCues: ["Two hands when scanning", "Soft knees to pick up", "Protect the ball", "Keep head up"],
    progressions: ["Partner mirror work", "Light pressure from a shadow defender"],
    tags: ["ball handling", "physical literacy"],
    diagram: diagram(
      { w: 12, h: 12, zones: [], lines: [], gridEvery: 3 },
      [
        ...corners(12, 12),
        ["p1", "attacker", 3, 3, "teal"],
        ["p2", "attacker", 9, 2.5, "purple"],
        ["p3", "attacker", 6, 6.5, "blue"],
        ["p4", "attacker", 2.5, 9, "gold"],
        ["p5", "attacker", 9.5, 9.5, "teal"],
        ["b1", "ball", 0, 0],
        ["b2", "ball", 0, 0],
        ["b3", "ball", 0, 0],
        ["b4", "ball", 0, 0],
        ["b5", "ball", 0, 0],
      ],
      [
        { caption: "Set-up: everyone has a ball, spread out in the grid." },
        {
          caption: "Move freely: ball in two hands, head up, find space.",
          run: { p1: [5, 1.8, 0.8], p2: [10, 6, 0.6], p3: [3.5, 7.5, -0.6], p4: [6, 10.2, 0.5], p5: [8, 7, -0.5] },
        },
        {
          caption: "Coach calls \"Place it!\": soft knees, put the ball down like scoring a try.",
          carry: { b1: "", b2: "", b3: "", b4: "", b5: "" },
          move: { b1: [5.5, 2.4], b2: [10.5, 6.6], b3: [4, 8.1], b4: [6.5, 10.8], b5: [8.5, 7.6] },
        },
        {
          caption: "\"Pick up and change direction!\" Off they go again.",
          carry: { b1: "p1", b2: "p2", b3: "p3", b4: "p4", b5: "p5" },
          run: { p1: [2, 4, -0.6], p2: [7.5, 3, -0.6], p3: [6, 4.5, 0.6], p4: [3, 8, -0.6], p5: [10, 10.5, 0.5] },
        },
      ],
      { b1: "p1", b2: "p2", b3: "p3", b4: "p4", b5: "p5" },
    ),
  },

  // ── 3. Treasure Hunt ──────────────────────────────────────────────────────
  {
    slug: "treasure-hunt",
    title: "Treasure Hunt",
    category: "ball handling",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 4,
    area: "12 x 12 m; 4 corner nests",
    equipment: ["balls or beanbags", "cones"],
    summary: "Teams race to collect treasure from the middle one item at a time.",
    setup: "12 x 12 m grid with a nest in each corner. Balls or beanbags in a central nest.",
    howToRun: "Teams collect one item at a time from the centre and return it to their corner nest.",
    coachingCues: ["Safe pick-up", "Carry in two hands", "Look before running", "Stop under control"],
    progressions: ["Require a pass to a teammate before placing treasure in the nest"],
    tags: ["ball handling", "warm-up"],
    diagram: diagram(
      {
        w: 12,
        h: 12,
        zones: [
          { x: 0, y: 0, w: 3, h: 3, fill: "nest" },
          { x: 9, y: 0, w: 3, h: 3, fill: "nest" },
          { x: 0, y: 9, w: 3, h: 3, fill: "nest" },
          { x: 9, y: 9, w: 3, h: 3, fill: "nest" },
          { x: 4.75, y: 4.75, w: 2.5, h: 2.5, fill: "nest", label: "Treasure" },
        ],
        lines: [],
      },
      [
        ["a", "attacker", 1.5, 1.5, "teal"],
        ["b", "attacker", 10.5, 1.5, "coral"],
        ["c", "attacker", 1.5, 10.5, "purple"],
        ["d", "attacker", 10.5, 10.5, "blue"],
        ["t1", "ball", 5.5, 5.6],
        ["t2", "ball", 6.5, 5.6],
        ["t3", "ball", 5.5, 6.5],
        ["t4", "ball", 6.5, 6.5],
        ["t5", "ball", 6, 6],
      ],
      [
        { caption: "Set-up: one team per corner nest, treasure in the middle." },
        { caption: "Go! One player from each team runs to the treasure.", run: { a: [5, 5], b: [7, 5], c: [5, 7], d: [7, 7] } },
        {
          caption: "Pick up ONE item with two hands and carry it home.",
          carry: { t1: "a", t2: "b", t3: "c", t4: "d" },
          run: { a: [1.8, 1.8], b: [10.2, 1.8], c: [1.8, 10.2], d: [10.2, 10.2] },
        },
        {
          caption: "Place it in the nest under control, then go again.",
          carry: { t1: "", t2: "", t3: "", t4: "" },
          move: { t1: [1, 2.3], t2: [11, 2.3], t3: [1, 9.7], t4: [11, 9.7] },
          run: { a: [5.2, 5.2], b: [6.8, 5.2], c: [5.2, 6.8], d: [6.8, 6.8] },
        },
      ],
    ),
  },

  // ── 4. Passing Gates ──────────────────────────────────────────────────────
  {
    slug: "passing-gates",
    title: "Passing Gates",
    category: "passing",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 2,
    area: "12 x 12 m; 5-6 gates 1.5-2 m wide",
    equipment: ["size 3 ball per pair", "10-12 cones"],
    summary: "Pairs score a point every time they pass through a cone gate, then move to a new gate.",
    setup: "12 x 12 m grid with 5-6 gates, each 1.5-2 m wide.",
    howToRun:
      "Pairs move around the grid. A point is scored when partners stand on opposite sides of a gate and complete a pass through it, then move to a different gate.",
    coachingCues: ["Target at chest", "Hands up early", "Pass through the middle", "Catch then move"],
    progressions: ["Both moving", "Receiver starts slightly behind", "Cannot repeat a gate"],
    tags: ["passing", "catching"],
    diagram: diagram(
      { w: 12, h: 12, zones: [], lines: [], gridEvery: 3 },
      [
        ["g1a", "cone", 2.5, 3], ["g1b", "cone", 4, 3],
        ["g2a", "cone", 8, 3], ["g2b", "cone", 9.5, 3],
        ["g3a", "cone", 5.25, 6], ["g3b", "cone", 6.75, 6],
        ["g4a", "cone", 2.5, 9], ["g4b", "cone", 4, 9],
        ["g5a", "cone", 8, 9], ["g5b", "cone", 9.5, 9],
        ["p", "attacker", 6, 8, "teal", "P"],
        ["r", "attacker", 6, 4, "teal", "R"],
        ["ball", "ball", 0, 0],
      ],
      [
        { caption: "Set-up: a pair either side of a gate. P has the ball." },
        { caption: "P passes through the gate to R's chest. One point!", pass: [["p", "r"]] },
        { caption: "Both move to a different gate.", run: { p: [8.75, 1.4, 0.6], r: [8.75, 4.6, -0.6] } },
        { caption: "Pass back through the new gate. Hands up early, catch then move.", pass: [["r", "p"]] },
      ],
      { ball: "p" },
    ),
  },

  // ── 5. Pass and Follow ────────────────────────────────────────────────────
  {
    slug: "pass-and-follow",
    title: "Pass and Follow",
    category: "passing",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 3,
    area: "Triangle, cones 3-4 m apart",
    equipment: ["3 cones per group", "1 ball per group"],
    summary: "Pass to the next cone, then follow your pass.",
    setup: "Three cones in a triangle, each 3-4 m apart. One player at each cone.",
    howToRun: "Pass to the next cone, then follow the pass and join that cone.",
    coachingCues: ["Two hands", "Show a target", "Pass in front of a moving receiver", "Communicate"],
    progressions: ["Change direction", "Add a second ball only when accuracy is secure"],
    tags: ["passing", "support", "move after passing"],
    diagram: diagram(
      { w: 10, h: 8, zones: [], lines: [] },
      [
        ["ca", "cone", 5, 1.6], ["cb", "cone", 2.5, 6], ["cc", "cone", 7.5, 6],
        ["a", "attacker", 5, 1.2, "teal", "A"],
        ["b", "attacker", 2.5, 5.6, "purple", "B"],
        ["c", "attacker", 7.5, 5.6, "blue", "C"],
        ["ball", "ball", 0, 0],
      ],
      [
        { caption: "Set-up: one player on each cone, A has the ball." },
        { caption: "A passes to B…", pass: [["a", "b"]] },
        { caption: "…and follows the pass to B's cone.", run: { a: [2.9, 5.2, 0.6] } },
        { caption: "B passes to C and follows. Keep it flowing!", pass: [["b", "c"]], run: { b: [7.1, 5.2, -0.4] } },
      ],
      { ball: "a" },
    ),
  },

  // ── 6. Running Pairs ──────────────────────────────────────────────────────
  {
    slug: "running-pairs",
    title: "Running Pairs",
    category: "passing",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 2,
    area: "15 x 6 m channel",
    equipment: ["4 cones per channel", "1 ball per pair"],
    summary: "Pairs jog down a channel exchanging passes.",
    setup: "15 x 6 m channel.",
    howToRun: "Pairs travel down the channel 2-3 m apart and exchange passes while jogging. Return outside the channel.",
    coachingCues: ["Run straight", "Receiver stays slightly behind", "Hands finish towards target"],
    progressions: ["Increase pace", "Add a passive trailing defender", "Score for three clean passes"],
    tags: ["passing", "running lines"],
    diagram: diagram(
      { w: 15, h: 6, zones: [], lines: [{ x1: 15, y1: 0, x2: 15, y2: 6, label: "Finish" }] },
      [
        ...corners(15, 6),
        ["a", "attacker", 1.5, 2, "teal", "A"],
        ["b", "attacker", 1, 4.5, "teal", "B"],
        ["ball", "ball", 0, 0],
      ],
      [
        { caption: "Set-up: A has the ball, B slightly behind and 2-3 m apart." },
        { caption: "Jog forward in straight lines.", run: { a: [5, 2], b: [4.3, 4.5] } },
        { caption: "A passes to B, hands finishing towards the target.", pass: [["a", "b"]], run: { a: [6.5, 2] } },
        { caption: "B runs on, A drops slightly behind, pass back.", run: { b: [10, 4.5], a: [9.3, 2] }, pass: [["b", "a"]] },
        { caption: "Finish the channel, then jog back outside it.", run: { a: [14, 2], b: [13.5, 4.5] } },
      ],
      { ball: "a" },
    ),
  },

  // ── 7. Rob the Nest ───────────────────────────────────────────────────────
  {
    slug: "rob-the-nest",
    title: "Rob the Nest",
    category: "warm-up",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 4,
    area: "15 x 15 m; central nest + 4 corner nests",
    equipment: ["8-12 balls", "cones"],
    summary: "Collect balls from the middle, then steal from other nests. One ball per trip.",
    setup: "15 x 15 m grid. Four nests in the corners, 2 players per nest, all balls in the middle.",
    howToRun:
      "On \"go\", one player from each nest runs to the middle, picks up ONE ball with two hands and carries it back, then the next player goes. When the middle is empty, players can steal from other nests. Stop while they are still having fun.",
    coachingCues: ["Scan", "Accelerate, decelerate", "Secure pick-up and carry in two hands", "Head up, avoid bumping into others"],
    progressions: [
      "Place the ball down like scoring a try rather than dropping it",
      "Pairs must pass once before depositing",
      "Defender protects space without contact",
    ],
    tags: ["warm-up", "ball handling", "scanning"],
    diagram: diagram(
      {
        w: 15,
        h: 15,
        zones: [
          { x: 0.5, y: 0.5, w: 3.5, h: 3, fill: "nest" },
          { x: 11, y: 0.5, w: 3.5, h: 3, fill: "nest" },
          { x: 0.5, y: 11.5, w: 3.5, h: 3, fill: "nest" },
          { x: 11, y: 11.5, w: 3.5, h: 3, fill: "nest" },
        ],
        lines: [],
      },
      [
        ["g1", "attacker", 1.6, 2, "teal"], ["g2", "attacker", 2.9, 2, "teal"],
        ["o1", "attacker", 12.1, 2, "coral"], ["o2", "attacker", 13.4, 2, "coral"],
        ["p1", "attacker", 1.6, 13, "purple"], ["p2", "attacker", 2.9, 13, "purple"],
        ["b1", "attacker", 12.1, 13, "blue"], ["b2", "attacker", 13.4, 13, "blue"],
        ["n1", "ball", 7, 6.8], ["n2", "ball", 8, 6.8], ["n3", "ball", 6.6, 7.5],
        ["n4", "ball", 7.5, 7.5], ["n5", "ball", 8.4, 7.5], ["n6", "ball", 7.5, 8.2],
      ],
      [
        { caption: "Set-up: 2 players per nest, all the balls in the middle." },
        { caption: "On \"go\", one player from each nest runs to the middle.", run: { g2: [6.5, 6.5], o1: [8.6, 6.5], p2: [6.5, 8.6], b1: [8.6, 8.6] } },
        {
          caption: "Pick up ONE ball with two hands and carry it back to the nest.",
          carry: { n1: "g2", n2: "o1", n3: "p2", n4: "b1" },
          run: { g2: [3.2, 3.2], o1: [11.8, 3.2], p2: [3.2, 11.8], b1: [11.8, 11.8] },
        },
        {
          caption: "Middle empty? Steal from other nests! Stop while they're still having fun.",
          carry: { n1: "", n2: "", n3: "", n4: "" },
          move: { n1: [1.2, 3], n2: [13.8, 3], n3: [1.2, 12], n4: [13.8, 12] },
          run: { g1: [12, 2.6, 1], p1: [2, 4.2, -1], b2: [13, 9, 1.2] },
        },
      ],
    ),
  },

  // ── 8. 1 v 1 Evasion ──────────────────────────────────────────────────────
  {
    slug: "1v1-evasion",
    title: "1 v 1 Evasion",
    category: "evasion",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 2,
    area: "10 x 5 m channel with a try line",
    equipment: ["4 cones per channel", "balls", "tag belts"],
    summary: "Attacker tries to beat a defender and score; defender tries to tag.",
    setup: "10 x 5 m channel with a try line at the far end.",
    howToRun: "Attacker starts with the ball and tries to cross the far line; defender tries to tag. Rotate quickly.",
    coachingCues: ["Run at space", "Change pace", "Step late", "Ball in two hands"],
    progressions: ["Narrow / widen the channel", "Bonus point for a two-handed carry"],
    tags: ["evasion", "1v1", "tag"],
    diagram: diagram(
      { w: 10, h: 5, zones: [{ x: 9, y: 0, w: 1, h: 5, fill: "endzone" }], lines: [{ x1: 9, y1: 0, x2: 9, y2: 5, label: "Try line" }] },
      [...corners(10, 5), ["a", "attacker", 1, 2.5, "teal", "A"], ["d", "defender", 6, 2.5, "coral", "D"], ["ball", "ball", 0, 0]],
      [
        { caption: "Set-up: attacker with the ball, defender in the channel." },
        { caption: "Run at the defender to make them commit.", run: { a: [4.3, 2.6], d: [5.4, 2.5] } },
        { caption: "Step late and change pace into the space.", run: { a: [6, 1, 0.4], d: [5.4, 2.1] } },
        { caption: "Accelerate away and score on your feet. Rotate!", run: { a: [9.5, 1.2] }, callouts: [[8.6, 0.6, "Try!"]] },
      ],
      { ball: "a" },
    ),
  },

  // ── 9. 2 v 1 ──────────────────────────────────────────────────────────────
  {
    slug: "2v1",
    title: "2 v 1",
    category: "decision making",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 3,
    area: "12 x 6 m channel; defender begins halfway",
    equipment: ["4 cones per channel", "ball", "tag belts"],
    summary: "Two attackers vs one tag defender. Fix the defender, then run or pass.",
    setup: "12 x 6 m channel. Defender begins halfway.",
    howToRun: "Two attackers try to score against one tag defender. The ball carrier runs to commit the defender, then runs or passes.",
    coachingCues: ["Fix the defender", "Support at width and depth", "Pass before the tag", "Continue after the pass"],
    progressions: ["Start the defender from different positions", "Allow one recovery tag"],
    tags: ["decision making", "2v1", "support"],
    diagram: diagram(
      { w: 12, h: 6, zones: [{ x: 11, y: 0, w: 1, h: 6, fill: "endzone" }], lines: [{ x1: 11, y1: 0, x2: 11, y2: 6, label: "Try line" }] },
      [...corners(12, 6), ["a1", "attacker", 1, 2, "teal", "A"], ["a2", "attacker", 0.5, 4.3, "teal", "A"], ["d", "defender", 6, 3, "coral", "D"], ["ball", "ball", 0, 0]],
      [
        { caption: "Set-up: two attackers, one defender halfway." },
        { caption: "Ball carrier runs straight at the defender to fix them.", run: { a1: [4.6, 2.3], a2: [3.8, 4.5], d: [5.3, 2.5] } },
        { caption: "Defender commits: pass before the tag!", pass: [["a1", "a2"]] },
        { caption: "Support player runs into space and scores. Passer keeps supporting.", run: { a2: [11.5, 4.5], a1: [8, 3, -0.4] }, callouts: [[10.4, 5.4, "Try!"]] },
      ],
      { ball: "a1" },
    ),
  },

  // ── 10. 2 v 2 ─────────────────────────────────────────────────────────────
  {
    slug: "2v2",
    title: "2 v 2",
    category: "decision making",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 4,
    area: "12 x 8 m channel",
    equipment: ["4 cones per channel", "ball", "tag belts", "bibs"],
    summary: "Two attackers vs two defenders. Find space and decide when to pass.",
    setup: "12 x 8 m channel.",
    howToRun: "Two attackers face two defenders. Attackers find space and decide when to pass; defenders track and tag.",
    coachingCues: ["Width", "Communication", "Straight running", "Support behind the ball"],
    progressions: ["Second defender starts behind", "Then both start square"],
    tags: ["decision making", "2v2", "defence"],
    diagram: diagram(
      { w: 12, h: 8, zones: [{ x: 11, y: 0, w: 1, h: 8, fill: "endzone" }], lines: [{ x1: 11, y1: 0, x2: 11, y2: 8, label: "Try line" }] },
      [
        ...corners(12, 8),
        ["a1", "attacker", 1, 2.5, "teal", "A"], ["a2", "attacker", 0.6, 5.6, "teal", "A"],
        ["d1", "defender", 6.5, 2.5, "coral", "D"], ["d2", "defender", 8.5, 5.5, "coral", "D"],
        ["ball", "ball", 0, 0],
      ],
      [
        { caption: "Set-up: 2 v 2, second defender starts deeper." },
        { caption: "Attackers run straight and keep width. Defenders come up together.", run: { a1: [4.5, 2.7], a2: [3.8, 5.8], d1: [5.5, 2.7], d2: [7, 5.4] } },
        { caption: "D1 commits to the carrier, so pass to the space.", pass: [["a1", "a2"]], run: { d1: [5.1, 2.8] } },
        { caption: "Second defender has to make a decision. Can A2 beat them?", run: { a2: [8.4, 7, 0.4], d2: [8.2, 6.2] } },
      ],
      { ball: "a1" },
    ),
  },

  // ── 11. Tag Technique ─────────────────────────────────────────────────────
  {
    slug: "tag-technique",
    title: "Tag Technique",
    category: "tag",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 2,
    area: "10 x 10 m grid",
    equipment: ["tag belts", "4 cones"],
    summary: "In pairs, learn to remove a tag safely, call TAG and return it promptly.",
    setup: "10 x 10 m grid. Everyone wears a tag belt.",
    howToRun: "In pairs, one player walks/jogs while their partner removes one tag, holds it up, calls TAG, then immediately returns it. Swap roles.",
    coachingCues: ["Eyes on hips", "Reach for the tag only", "No grabbing clothing", "Stop and return the tag promptly"],
    progressions: ["Progress to a 1 v 1 chase", "Then small-sided games"],
    safetyNotes: "Tags only: never pull shirts or shorts.",
    tags: ["tag", "defence"],
    diagram: diagram(
      { w: 10, h: 10, zones: [], lines: [], gridEvery: 2.5 },
      [
        ...corners(10, 10),
        ["c", "attacker", 3, 5, "teal", "C"],
        ["d", "defender", 6, 6, "coral", "D"],
        ["tg", "tag", 0, 0],
      ],
      [
        { caption: "Set-up: in pairs. C jogs, D follows with eyes on C's hips.", move: { tg: [3.35, 5.45] } },
        { caption: "C jogs; D tracks the hips, not the ball.", run: { c: [5.5, 3.5], d: [6.5, 4.6] }, move: { tg: [5.85, 3.95] } },
        { caption: "D reaches for the TAG only, holds it up and calls \"TAG!\"", move: { d: [6.2, 4.2], tg: [6.5, 3.4] }, callouts: [[6.8, 2.6, "TAG!"]] },
        { caption: "D hands the tag straight back. Swap roles.", move: { tg: [5.85, 3.95] }, run: { c: [7, 7], d: [4, 7.5] } },
      ],
    ),
  },

  // ── 12. Tag and Pass ──────────────────────────────────────────────────────
  {
    slug: "tag-and-pass",
    title: "Tag and Pass",
    category: "tag",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 3,
    area: "12 x 8 m grid",
    equipment: ["tag belts", "ball per group", "cones"],
    summary: "Carrier, tagger and support. On the tag, stop, turn and pass.",
    setup: "12 x 8 m grid. Groups of three: carrier, tagger and support player.",
    howToRun: "On the tag, the carrier stops, turns towards the support player and passes; the tagger returns the tag.",
    coachingCues: ["Stop safely", "Pass promptly", "Support close enough to receive", "Tagger retreats / resets as coached"],
    progressions: ["Add a second support player and a choice of receiver"],
    tags: ["tag", "support", "passing"],
    diagram: diagram(
      { w: 12, h: 8, zones: [], lines: [] },
      [
        ...corners(12, 8),
        ["c", "attacker", 2, 4, "teal", "C"],
        ["s", "attacker", 0.8, 6, "teal", "S"],
        ["d", "defender", 7, 4, "coral", "D"],
        ["ball", "ball", 0, 0],
      ],
      [
        { caption: "Set-up: carrier with the ball, support behind, tagger in front." },
        { caption: "Carrier runs forward; support follows behind the ball.", run: { c: [5, 4], s: [3.6, 5.8], d: [5.8, 4] } },
        { caption: "TAG! Carrier stops safely.", callouts: [[5.4, 3, "TAG!"]] },
        { caption: "Turn and pass to the support. Tagger returns the tag and retreats.", pass: [["c", "s"]], run: { d: [8, 3.6] } },
        { caption: "Support runs on with the ball.", run: { s: [10, 5.6] } },
      ],
      { ball: "c" },
    ),
  },

  // ── 13. Four-Corner Support ───────────────────────────────────────────────
  {
    slug: "four-corner-support",
    title: "Four-Corner Support",
    category: "support",
    ageGroups: MINIS,
    durationMin: 10,
    minPlayers: 3,
    area: "12 x 12 m with a cone gate on each side",
    equipment: ["cones", "ball", "bib for defender"],
    summary: "Keep the ball moving and score by receiving through an outside gate.",
    setup: "12 x 12 m grid with a cone gate on each side.",
    howToRun: "Three or four attackers keep the ball moving and score by receiving through any outside gate. One passive defender can be added.",
    coachingCues: ["Move after passing", "Spread out", "Show hands", "Stay available"],
    progressions: ["Add an active defender", "Limit holding time to three seconds"],
    tags: ["support", "passing", "width"],
    diagram: diagram(
      { w: 12, h: 12, zones: [], lines: [] },
      [
        ["gt1", "cone", 5.2, 0], ["gt2", "cone", 6.8, 0],
        ["gb1", "cone", 5.2, 12], ["gb2", "cone", 6.8, 12],
        ["gl1", "cone", 0, 5.2], ["gl2", "cone", 0, 6.8],
        ["gr1", "cone", 12, 5.2], ["gr2", "cone", 12, 6.8],
        ["a1", "attacker", 4, 4, "teal", "A"], ["a2", "attacker", 8, 4, "teal", "A"],
        ["a3", "attacker", 4, 8, "teal", "A"], ["a4", "attacker", 8, 8, "teal", "A"],
        ["ball", "ball", 0, 0],
      ],
      [
        { caption: "Set-up: attackers spread out, a gate on each side." },
        { caption: "Pass and move: never stand still after passing.", pass: [["a1", "a2"]], run: { a1: [3, 6.5, -0.5] } },
        { caption: "Spread out and show hands to stay available.", pass: [["a2", "a4"]], run: { a2: [9.5, 2.5], a3: [5.5, 9.8] } },
        { caption: "Receive through a gate to score!", run: { a3: [6, 11.2] }, pass: [["a4", "a3"]], callouts: [[7.8, 11, "Score!"]] },
      ],
      { ball: "a1" },
    ),
  },

  // ── 14. End-Zone Game ─────────────────────────────────────────────────────
  {
    slug: "end-zone-game",
    title: "End-Zone Game",
    category: "game",
    ageGroups: MINIS,
    durationMin: 12,
    minPlayers: 4,
    area: "15 x 10 m; 2 m end zones",
    equipment: ["cones", "ball", "bibs", "tag belts (later)"],
    summary: "Small-sided game: score by carrying across the line or receiving a pass in the end zone.",
    setup: "15 x 10 m pitch with 2 m end zones.",
    howToRun: "Small teams score by carrying across the line under control or receiving a pass in the end zone. Begin without tags, then add tags.",
    coachingCues: ["Run forward", "Support in space", "No diving", "Head up near the line"],
    progressions: ["Require a pass before scoring", "Progress to 3 v 3 / 4 v 4 tag"],
    tags: ["game", "support", "scoring"],
    diagram: diagram(
      { w: 15, h: 10, zones: [{ x: 0, y: 0, w: 2, h: 10, fill: "endzone" }, { x: 13, y: 0, w: 2, h: 10, fill: "endzone" }], lines: [] },
      [
        ["a1", "attacker", 4, 5, "teal"], ["a2", "attacker", 3.3, 2.5, "teal"], ["a3", "attacker", 3.3, 7.5, "teal"],
        ["d1", "defender", 9, 5, "coral"], ["d2", "defender", 10, 2.5, "coral"], ["d3", "defender", 10, 7.5, "coral"],
        ["ball", "ball", 0, 0],
      ],
      [
        { caption: "Set-up: 3 v 3, end zones at both ends." },
        { caption: "Carrier runs forward; supporters stay in space.", run: { a1: [7.2, 5], a2: [6, 2.5], a3: [6, 7.6], d1: [8, 5], d2: [9, 3], d3: [9, 7] } },
        { caption: "Defenders close in, so pass to the space.", pass: [["a1", "a3"]] },
        { caption: "Run in under control. Score on your feet: no diving!", run: { a3: [13.8, 8.2, 0.4] }, callouts: [[12.6, 9.4, "Try!"]] },
      ],
      { ball: "a1" },
    ),
  },

  // ── 15. U7 Tag ────────────────────────────────────────────────────────────
  {
    slug: "u7-tag",
    title: "U7 Tag",
    category: "game",
    ageGroups: ["U6", "U7"],
    durationMin: 12,
    minPlayers: 6,
    area: "Max 20 x 12 m",
    equipment: ["cones", "size 3 ball", "bibs", "tag belts"],
    summary: "Up to 4 v 4 tag played to RFU U7 rules of play.",
    setup: "Maximum 20 x 12 m pitch; use a smaller pitch if needed.",
    howToRun: "Play up to 4 v 4 with a size 3 ball. The coach-referee keeps play flowing, uses free passes for restarts and gives short prompts rather than lectures.",
    coachingCues: ["Run forward", "Pass backwards/sideways", "Support", "Tag safely, return tag", "Reset onside", "Score on feet"],
    progressions: ["Conditioned games: bonus for a pass, a wide try, two passes, or every player touching the ball"],
    tags: ["game", "tag", "rules"],
    diagram: diagram(
      { w: 20, h: 12, zones: [{ x: 0, y: 0, w: 1.5, h: 12, fill: "endzone" }, { x: 18.5, y: 0, w: 1.5, h: 12, fill: "endzone" }], lines: [] },
      [
        ["a1", "attacker", 4, 6, "teal"], ["a2", "attacker", 3, 3, "teal"], ["a3", "attacker", 3, 9, "teal"], ["a4", "attacker", 2.4, 11, "teal"],
        ["d1", "defender", 12, 6, "coral"], ["d2", "defender", 12, 3, "coral"], ["d3", "defender", 12, 9, "coral"], ["d4", "defender", 12, 11, "coral"],
        ["ball", "ball", 0, 0],
      ],
      [
        { caption: "Free pass to start: defenders back, receiver ready." },
        { caption: "Run forward; defenders come up to tag.", run: { a1: [8, 6], a2: [6.5, 3.5], a3: [6.5, 8.5], d1: [9, 6], d2: [10, 3.5], d3: [10, 8.5], d4: [11, 10.5] } },
        { caption: "TAG! Carrier stops; support stays behind the ball.", callouts: [[8.6, 4.9, "TAG!"]] },
        { caption: "Pass backwards to a teammate. Tagger returns the tag and retires onside.", pass: [["a1", "a3"]], run: { d1: [11, 6] } },
        { caption: "Run into space and score on your feet.", run: { a3: [19, 9.5, 0.4] }, callouts: [[17.4, 10.8, "Try!"]] },
      ],
      { ball: "a1" },
    ),
  },

  // ── 16. Fox Tails ─────────────────────────────────────────────────────────
  {
    slug: "fox-tails",
    title: "Fox Tails",
    category: "tag",
    ageGroups: MINIS,
    durationMin: 9,
    minPlayers: 4,
    area: "15 x 15 m",
    equipment: ["tags or bibs as tails", "4 cones", "spare tails for the coach"],
    summary: "Everyone chases tails while protecting their own. Great introduction to tagging.",
    setup: "15 x 15 m grid. Every child tucks a tag or bib into their shorts as a tail. Coach holds spares.",
    howToRun:
      "On \"go\", everyone chases tails while dodging to protect their own. Grab a tail and shout \"TAG!\". The player who lost a tail runs to the coach, collects a new one and rejoins straight away. Nobody is out for long.",
    coachingCues: ["Shout \"TAG!\" when you grab a tail and hand it back", "Dodge by changing direction rather than swatting hands away"],
    progressions: ["Shrink the grid to force more dodging"],
    tags: ["tag", "evasion", "warm-up"],
    diagram: diagram(
      { w: 15, h: 15, zones: [], lines: [] },
      [
        ...corners(15, 15),
        ["p1", "attacker", 3.5, 3.5, "teal"], ["p2", "attacker", 7.5, 3, "teal"], ["p3", "attacker", 11.5, 4, "teal"],
        ["p4", "attacker", 4.5, 9, "teal"], ["p5", "attacker", 8.5, 8, "teal"], ["p6", "attacker", 11, 11, "teal"],
        ["coach", "coach", 7.5, 14],
        ["t1", "tag", 3.9, 3.9], ["t2", "tag", 7.9, 3.4], ["t3", "tag", 11.9, 4.4],
        ["t4", "tag", 4.9, 9.4], ["t5", "tag", 8.9, 8.4], ["t6", "tag", 11.4, 11.4],
      ],
      [
        { caption: "Set-up: everyone has a tail tucked in. Coach holds spares." },
        {
          caption: "On \"go\", chase tails while dodging to protect your own.",
          run: { p1: [7, 3, 0.4], p2: [11, 4.5, 0.4], p3: [9, 8, 0.4], p5: [5, 10, 0.4], p4: [3, 12.5, 0.4] },
          move: { t1: [7.4, 3.4], t2: [11.4, 4.9], t3: [9.4, 8.4], t5: [5.4, 10.4], t4: [3.4, 12.9] },
        },
        { caption: "Grab a tail and shout \"TAG!\"", run: { p6: [5.6, 9.4, -0.4] }, move: { t5: [5.8, 9.2] }, callouts: [[4.8, 8.6, "TAG!"]] },
        { caption: "Lost your tail? Run to the coach, get a new one and rejoin straight away.", run: { p5: [7, 13.4] }, move: { t5: [7.4, 13.8] } },
      ],
    ),
  },

  // ── 17. Cross the River ───────────────────────────────────────────────────
  {
    slug: "cross-the-river",
    title: "Cross the River",
    category: "evasion",
    ageGroups: MINIS,
    durationMin: 9,
    minPlayers: 5,
    area: "10 m river between two banks",
    equipment: ["ball per player", "cones"],
    summary: "Carry a ball across the river past the crocodiles.",
    setup: "A 10 m-wide river between two banks. Players start on one bank with a ball each. Two crocodiles in the river.",
    howToRun:
      "On \"go\", players run across with the ball in two hands, stepping side to side to dodge. Anyone tagged becomes a crocodile. Run back the other way. Continue until one or two are left, then swap crocodiles.",
    coachingCues: ["Run forward", "Carry the ball in two hands", "Step side to side to get past"],
    progressions: ["Regression: crocodiles can only move sideways, so less confident children succeed"],
    tags: ["evasion", "carrying", "warm-up"],
    diagram: diagram(
      {
        w: 20,
        h: 12,
        zones: [
          { x: 0, y: 0, w: 5, h: 12, fill: "grid", label: "Bank" },
          { x: 5, y: 0, w: 10, h: 12, fill: "water", label: "River" },
          { x: 15, y: 0, w: 5, h: 12, fill: "grid", label: "Bank" },
        ],
        lines: [],
      },
      [
        ["p1", "attacker", 2.5, 2, "teal"], ["p2", "attacker", 2.5, 4, "teal"], ["p3", "attacker", 2.5, 6, "teal"],
        ["p4", "attacker", 2.5, 8, "teal"], ["p5", "attacker", 2.5, 10, "teal"],
        ["k1", "defender", 8, 4.5, "coral"], ["k2", "defender", 12, 7.5, "coral"], ["k3", "defender", 10, 6, "coral"],
        ["b1", "ball", 0, 0], ["b2", "ball", 0, 0], ["b3", "ball", 0, 0], ["b4", "ball", 0, 0], ["b5", "ball", 0, 0],
      ],
      [
        { caption: "Set-up: players with a ball on one bank, two crocodiles in the river.", hide: ["k3"] },
        {
          caption: "Go! Ball in two hands, step side to side to dodge.",
          run: { p1: [17.5, 2, -0.6], p2: [17.5, 4.2, 0.4], p3: [10, 6], p4: [17.5, 8.4, 1], p5: [17.5, 10, 0.4], k1: [9.5, 5.5] },
        },
        { caption: "Tagged! That player becomes a crocodile.", hide: ["p3", "b3"], show: ["k3"], callouts: [[11, 5, "Tagged"]] },
        { caption: "Run back the other way. Keep going until one or two are left.", run: { p1: [2.5, 2, 0.5], p2: [2.5, 4, -0.5], p4: [2.5, 8, 0.6], p5: [2.5, 10, -0.6] } },
      ],
      { b1: "p1", b2: "p2", b3: "p3", b4: "p4", b5: "p5" },
    ),
  },

  // ── 18. Try Time ──────────────────────────────────────────────────────────
  {
    slug: "try-time",
    title: "Try Time",
    category: "scoring",
    ageGroups: MINIS,
    durationMin: 9,
    minPlayers: 2,
    area: "10 m to a try line",
    equipment: ["balls", "cones for the try line"],
    summary: "Race to the rolled ball, pick it up and score a try.",
    setup: "Two lines of players 10 m from a try line marked with cones. Coach in the middle with the balls.",
    howToRun:
      "The coach rolls a ball out into the space between the two lines. The front player in each line races to pick it up with two hands. Whoever gets it runs forward and scores, pressing the ball down with both hands. Celebrate every try!",
    coachingCues: ["Pick the ball up with two hands", "Ground it with both hands pressing down", "No diving needed at this age"],
    progressions: ["Coach acts as a soft defender; players run around them on the way to the line"],
    tags: ["scoring", "pick-up", "running forward"],
    diagram: diagram(
      { w: 14, h: 10, zones: [{ x: 12, y: 0, w: 2, h: 10, fill: "endzone" }], lines: [{ x1: 12, y1: 0, x2: 12, y2: 10, label: "Try line" }] },
      [
        ["tc1", "cone", 12, 0.5], ["tc2", "cone", 12, 5], ["tc3", "cone", 12, 9.5],
        ["g1", "attacker", 2, 3.5, "teal"], ["g2", "attacker", 1.2, 3.5, "teal"], ["g3", "attacker", 0.4, 3.5, "teal"],
        ["v1", "attacker", 2, 6.5, "purple"], ["v2", "attacker", 1.2, 6.5, "purple"], ["v3", "attacker", 0.4, 6.5, "purple"],
        ["coach", "coach", 6, 1],
        ["ball", "ball", 6.5, 1.2],
      ],
      [
        { caption: "Set-up: two lines, coach with the balls." },
        { caption: "Coach rolls a ball into the space between the lines.", move: { ball: [7, 5] }, callouts: [] },
        { caption: "Front players race to pick it up with two hands.", run: { g1: [6.4, 4.7], v1: [6.2, 5.8] } },
        { caption: "Whoever gets it runs forward and scores, pressing down with both hands. Try!", carry: { ball: "g1" }, run: { g1: [12.8, 5] }, callouts: [[11.6, 4, "Try!"]] },
      ],
    ),
  },

  // ── 19. Mini Tag Game ─────────────────────────────────────────────────────
  {
    slug: "mini-tag-game",
    title: "Mini Tag Game",
    category: "game",
    ageGroups: ["U6"],
    durationMin: 10,
    minPlayers: 6,
    area: "About 20 x 15 m",
    equipment: ["cones", "ball", "bibs", "tag belts"],
    summary: "4 v 4 with minimal rules: putting it all together.",
    setup: "4 v 4 on roughly 20 x 15 m with a try line at each end. Teal attack left to right, coral defend.",
    howToRun:
      "The ball carrier runs forward; defenders move up to tag. On \"TAG!\" the carrier stops and passes backwards (or hands the ball) to a teammate behind them. The new carrier runs into space and scores. Restart with the other team attacking.",
    coachingCues: ["Keep the rules minimal and let the game flow", "Celebrate effort and tries", "Keep everyone involved", "Rotate teams often"],
    progressions: ["Add a free-pass restart", "Bonus for every player touching the ball"],
    tags: ["game", "tag"],
    diagram: diagram(
      { w: 20, h: 15, zones: [], lines: [{ x1: 1.5, y1: 0, x2: 1.5, y2: 15 }, { x1: 18.5, y1: 0, x2: 18.5, y2: 15 }] },
      [
        ["a1", "attacker", 4, 3, "teal"], ["a2", "attacker", 4, 6, "teal"], ["a3", "attacker", 4, 9, "teal"], ["a4", "attacker", 4, 12, "teal"],
        ["d1", "defender", 14, 3, "coral"], ["d2", "defender", 14, 6, "coral"], ["d3", "defender", 14, 9, "coral"], ["d4", "defender", 14, 12, "coral"],
        ["ball", "ball", 0, 0],
      ],
      [
        { caption: "Set-up: 4 v 4. Teal attack left to right." },
        { caption: "The ball carrier runs forward. Defenders move up to tag.", run: { a2: [8, 6], d2: [9, 6], d3: [11, 8] } },
        { caption: "Tagged! Carrier stops; support players stay behind the ball.", move: { a1: [6.5, 3.5], a3: [6.2, 8.4], a4: [6.5, 11.5] }, callouts: [[8.4, 4.8, "TAG!"]] },
        { caption: "Carrier passes backwards (or hands the ball) to a teammate behind.", pass: [["a2", "a3"]] },
        { caption: "The new carrier runs into space and scores!", run: { a3: [19, 12.5, 0.8] }, callouts: [[17.6, 13.8, "Try!"]] },
      ],
      { ball: "a2" },
    ),
  },
];
