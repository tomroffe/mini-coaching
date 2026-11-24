import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Diagram } from "@/lib/diagram";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["admin", "coach", "parent"]);
export const weekStatusEnum = pgEnum("week_status", ["training", "cancelled", "no_session"]);
export const blockTypeEnum = pgEnum("block_type", ["arrival", "skill", "water", "challenge", "game"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "late"]);
export const availabilityEnum = pgEnum("availability", ["available", "maybe", "unavailable"]);
export const awardTypeEnum = pgEnum("award_type", ["player_of_week", "certificate", "badge", "milestone"]);
export const ratingEnum = pgEnum("rating", ["emerging", "developing", "game_ready"]);
export const mediaTypeEnum = pgEnum("media_type", ["upload", "youtube", "vimeo", "image", "link"]);
export const coachRoleEnum = pgEnum("coach_role", ["head", "assistant"]);

// ─── People ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: roleEnum("role").notNull().default("coach"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const invites = pgTable("invites", {
  token: text("token").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const ageGroups = pgTable("age_groups", {
  id: id(),
  code: text("code").notNull().unique(), // "U6"
  name: text("name").notNull(), // "Under 6s"
  colour: text("colour").notNull().default("#0f766e"),
  sortOrder: integer("sort_order").notNull().default(0),
  rulesMd: text("rules_md").notNull().default(""),
});

export const coachAssignments = pgTable(
  "coach_assignments",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ageGroupId: uuid("age_group_id").notNull().references(() => ageGroups.id, { onDelete: "cascade" }),
    role: coachRoleEnum("role").notNull().default("assistant"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.ageGroupId] })],
);

export const players = pgTable("players", {
  id: id(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dob: date("dob"),
  ageGroupId: uuid("age_group_id").references(() => ageGroups.id, { onDelete: "set null" }),
  photoKey: text("photo_key"),
  photoConsent: boolean("photo_consent").notNull().default(false),
  medicalNotes: text("medical_notes").notNull().default(""),
  emergencyContact: text("emergency_contact").notNull().default(""),
  active: boolean("active").notNull().default(true),
  /** enrolment_links.token used when a parent self-enrolled this child */
  enrolledVia: text("enrolled_via"),
  createdAt: createdAt(),
});

/** One-time QR codes a coach shows so a parent can create an account and enrol their child(ren). */
export const enrolmentLinks = pgTable("enrolment_links", {
  token: text("token").primaryKey(),
  ageGroupId: uuid("age_group_id").notNull().references(() => ageGroups.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
});

export const playerGuardians = pgTable(
  "player_guardians",
  {
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.userId] })],
);

// ─── Drills ──────────────────────────────────────────────────────────────────

export const drills = pgTable("drills", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull().default("skill"), // warm-up, skill, game, tag, evasion...
  ageGroups: text("age_groups").array().notNull().default(sql`'{}'::text[]`),
  durationMin: integer("duration_min").notNull().default(10),
  minPlayers: integer("min_players").notNull().default(2),
  area: text("area").notNull().default(""),
  equipment: text("equipment").array().notNull().default(sql`'{}'::text[]`),
  summary: text("summary").notNull().default(""),
  setup: text("setup").notNull().default(""),
  howToRun: text("how_to_run").notNull().default(""),
  coachingCues: text("coaching_cues").array().notNull().default(sql`'{}'::text[]`),
  progressions: text("progressions").array().notNull().default(sql`'{}'::text[]`),
  regressions: text("regressions").array().notNull().default(sql`'{}'::text[]`),
  safetyNotes: text("safety_notes").notNull().default(""),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  diagram: jsonb("diagram").$type<Diagram>(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const drillMedia = pgTable("drill_media", {
  id: id(),
  drillId: uuid("drill_id").notNull().references(() => drills.id, { onDelete: "cascade" }),
  type: mediaTypeEnum("type").notNull(),
  storageKey: text("storage_key"),
  url: text("url"),
  mime: text("mime"),
  caption: text("caption").notNull().default(""),
  createdAt: createdAt(),
});

// ─── Plans & season ──────────────────────────────────────────────────────────

export const sessionPlans = pgTable("session_plans", {
  id: id(),
  title: text("title").notNull(),
  ageGroupId: uuid("age_group_id").references(() => ageGroups.id, { onDelete: "set null" }),
  theme: text("theme").notNull().default(""), // "Love the ball"
  outcome: text("outcome").notNull().default(""),
  durationMin: integer("duration_min").notNull().default(45),
  startTime: text("start_time").notNull().default("09:30"),
  equipment: text("equipment").notNull().default(""),
  checkpoint: text("checkpoint").notNull().default(""),
  notes: text("notes").notNull().default(""),
  sequence: integer("sequence"), // position in the season pathway
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionBlocks = pgTable("session_blocks", {
  id: id(),
  planId: uuid("plan_id").notNull().references(() => sessionPlans.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  durationMin: integer("duration_min").notNull(),
  blockType: blockTypeEnum("block_type").notNull().default("skill"),
  drillId: uuid("drill_id").references(() => drills.id, { onDelete: "set null" }),
  customTitle: text("custom_title").notNull().default(""),
  coachFocus: text("coach_focus").notNull().default(""),
});

export const seasons = pgTable("seasons", {
  id: id(),
  name: text("name").notNull().unique(), // "2026-27"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  current: boolean("current").notNull().default(false),
});

export const seasonWeeks = pgTable(
  "season_weeks",
  {
    id: id(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
    ageGroupId: uuid("age_group_id").notNull().references(() => ageGroups.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startTime: text("start_time").notNull().default("09:30"),
    endTime: text("end_time").notNull().default("10:15"),
    status: weekStatusEnum("status").notNull().default("training"),
    sessionPlanId: uuid("session_plan_id").references(() => sessionPlans.id, { onDelete: "set null" }),
    notes: text("notes").notNull().default(""),
  },
  (t) => [uniqueIndex("season_week_unique").on(t.seasonId, t.ageGroupId, t.date)],
);

// ─── Register, coaches, awards ───────────────────────────────────────────────

export const attendance = pgTable(
  "attendance",
  {
    seasonWeekId: uuid("season_week_id").notNull().references(() => seasonWeeks.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    status: attendanceStatusEnum("status").notNull(),
    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.seasonWeekId, t.playerId] })],
);

export const coachAvailability = pgTable(
  "coach_availability",
  {
    seasonWeekId: uuid("season_week_id").notNull().references(() => seasonWeeks.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: availabilityEnum("status").notNull(),
    note: text("note").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.seasonWeekId, t.userId] })],
);

export const coachAttendance = pgTable(
  "coach_attendance",
  {
    seasonWeekId: uuid("season_week_id").notNull().references(() => seasonWeeks.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    attended: boolean("attended").notNull(),
  },
  (t) => [primaryKey({ columns: [t.seasonWeekId, t.userId] })],
);

export const awards = pgTable("awards", {
  id: id(),
  playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  seasonWeekId: uuid("season_week_id").references(() => seasonWeeks.id, { onDelete: "set null" }),
  type: awardTypeEnum("type").notNull(),
  title: text("title").notNull(),
  reason: text("reason").notNull().default(""),
  awardedOn: date("awarded_on").notNull(),
  awardedBy: uuid("awarded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const skillAssessments = pgTable("skill_assessments", {
  id: id(),
  playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  skill: text("skill").notNull(),
  rating: ratingEnum("rating").notNull(),
  assessedOn: date("assessed_on").notNull(),
  assessedBy: uuid("assessed_by").references(() => users.id, { onDelete: "set null" }),
  note: text("note").notNull().default(""),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const sessionPlanRelations = relations(sessionPlans, ({ many, one }) => ({
  blocks: many(sessionBlocks),
  ageGroup: one(ageGroups, { fields: [sessionPlans.ageGroupId], references: [ageGroups.id] }),
}));
export const sessionBlockRelations = relations(sessionBlocks, ({ one }) => ({
  plan: one(sessionPlans, { fields: [sessionBlocks.planId], references: [sessionPlans.id] }),
  drill: one(drills, { fields: [sessionBlocks.drillId], references: [drills.id] }),
}));
export const drillRelations = relations(drills, ({ many }) => ({ media: many(drillMedia) }));
export const drillMediaRelations = relations(drillMedia, ({ one }) => ({
  drill: one(drills, { fields: [drillMedia.drillId], references: [drills.id] }),
}));
