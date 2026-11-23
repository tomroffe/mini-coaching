CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('available', 'maybe', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."award_type" AS ENUM('player_of_week', 'certificate', 'badge', 'milestone');--> statement-breakpoint
CREATE TYPE "public"."block_type" AS ENUM('arrival', 'skill', 'water', 'game');--> statement-breakpoint
CREATE TYPE "public"."coach_role" AS ENUM('head', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('upload', 'youtube', 'vimeo', 'image', 'link');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('emerging', 'developing', 'game_ready');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'coach', 'parent');--> statement-breakpoint
CREATE TYPE "public"."week_status" AS ENUM('training', 'festival', 'cancelled', 'no_session');--> statement-breakpoint
CREATE TABLE "age_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"colour" text DEFAULT '#0f766e' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"rules_md" text DEFAULT '' NOT NULL,
	CONSTRAINT "age_groups_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"season_week_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"recorded_by" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_season_week_id_player_id_pk" PRIMARY KEY("season_week_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"season_week_id" uuid,
	"type" "award_type" NOT NULL,
	"title" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"awarded_on" date NOT NULL,
	"awarded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_assignments" (
	"user_id" uuid NOT NULL,
	"age_group_id" uuid NOT NULL,
	"role" "coach_role" DEFAULT 'assistant' NOT NULL,
	CONSTRAINT "coach_assignments_user_id_age_group_id_pk" PRIMARY KEY("user_id","age_group_id")
);
--> statement-breakpoint
CREATE TABLE "coach_attendance" (
	"season_week_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"attended" boolean NOT NULL,
	CONSTRAINT "coach_attendance_season_week_id_user_id_pk" PRIMARY KEY("season_week_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "coach_availability" (
	"season_week_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "availability" NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "coach_availability_season_week_id_user_id_pk" PRIMARY KEY("season_week_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "drill_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drill_id" uuid NOT NULL,
	"type" "media_type" NOT NULL,
	"storage_key" text,
	"url" text,
	"mime" text,
	"caption" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'skill' NOT NULL,
	"age_groups" text[] DEFAULT '{}'::text[] NOT NULL,
	"duration_min" integer DEFAULT 10 NOT NULL,
	"min_players" integer DEFAULT 2 NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"equipment" text[] DEFAULT '{}'::text[] NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"setup" text DEFAULT '' NOT NULL,
	"how_to_run" text DEFAULT '' NOT NULL,
	"coaching_cues" text[] DEFAULT '{}'::text[] NOT NULL,
	"progressions" text[] DEFAULT '{}'::text[] NOT NULL,
	"regressions" text[] DEFAULT '{}'::text[] NOT NULL,
	"safety_notes" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"diagram" jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"token" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "role" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_guardians" (
	"player_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "player_guardians_player_id_user_id_pk" PRIMARY KEY("player_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"dob" date,
	"age_group_id" uuid,
	"photo_key" text,
	"photo_consent" boolean DEFAULT false NOT NULL,
	"medical_notes" text DEFAULT '' NOT NULL,
	"emergency_contact" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"age_group_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start_time" text DEFAULT '09:30' NOT NULL,
	"end_time" text DEFAULT '10:15' NOT NULL,
	"status" "week_status" DEFAULT 'training' NOT NULL,
	"session_plan_id" uuid,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"current" boolean DEFAULT false NOT NULL,
	CONSTRAINT "seasons_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "session_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"duration_min" integer NOT NULL,
	"block_type" "block_type" DEFAULT 'skill' NOT NULL,
	"drill_id" uuid,
	"custom_title" text DEFAULT '' NOT NULL,
	"coach_focus" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"age_group_id" uuid,
	"theme" text DEFAULT '' NOT NULL,
	"outcome" text DEFAULT '' NOT NULL,
	"duration_min" integer DEFAULT 45 NOT NULL,
	"start_time" text DEFAULT '09:30' NOT NULL,
	"equipment" text DEFAULT '' NOT NULL,
	"checkpoint" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"sequence" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"skill" text NOT NULL,
	"rating" "rating" NOT NULL,
	"assessed_on" date NOT NULL,
	"assessed_by" uuid,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"role" "role" DEFAULT 'coach' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_season_week_id_season_weeks_id_fk" FOREIGN KEY ("season_week_id") REFERENCES "public"."season_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_season_week_id_season_weeks_id_fk" FOREIGN KEY ("season_week_id") REFERENCES "public"."season_weeks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_awarded_by_users_id_fk" FOREIGN KEY ("awarded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_age_group_id_age_groups_id_fk" FOREIGN KEY ("age_group_id") REFERENCES "public"."age_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_attendance" ADD CONSTRAINT "coach_attendance_season_week_id_season_weeks_id_fk" FOREIGN KEY ("season_week_id") REFERENCES "public"."season_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_attendance" ADD CONSTRAINT "coach_attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_availability" ADD CONSTRAINT "coach_availability_season_week_id_season_weeks_id_fk" FOREIGN KEY ("season_week_id") REFERENCES "public"."season_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_availability" ADD CONSTRAINT "coach_availability_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_media" ADD CONSTRAINT "drill_media_drill_id_drills_id_fk" FOREIGN KEY ("drill_id") REFERENCES "public"."drills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drills" ADD CONSTRAINT "drills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_guardians" ADD CONSTRAINT "player_guardians_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_guardians" ADD CONSTRAINT "player_guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_age_group_id_age_groups_id_fk" FOREIGN KEY ("age_group_id") REFERENCES "public"."age_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_weeks" ADD CONSTRAINT "season_weeks_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_weeks" ADD CONSTRAINT "season_weeks_age_group_id_age_groups_id_fk" FOREIGN KEY ("age_group_id") REFERENCES "public"."age_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_weeks" ADD CONSTRAINT "season_weeks_session_plan_id_session_plans_id_fk" FOREIGN KEY ("session_plan_id") REFERENCES "public"."session_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_blocks" ADD CONSTRAINT "session_blocks_plan_id_session_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."session_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_blocks" ADD CONSTRAINT "session_blocks_drill_id_drills_id_fk" FOREIGN KEY ("drill_id") REFERENCES "public"."drills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_plans" ADD CONSTRAINT "session_plans_age_group_id_age_groups_id_fk" FOREIGN KEY ("age_group_id") REFERENCES "public"."age_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_assessed_by_users_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "season_week_unique" ON "season_weeks" USING btree ("season_id","age_group_id","date");