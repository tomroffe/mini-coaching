ALTER TABLE "season_weeks" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
-- Festival status removed: existing festival weeks become training weeks
UPDATE "season_weeks" SET "status" = 'training' WHERE "status" = 'festival';--> statement-breakpoint
ALTER TABLE "season_weeks" ALTER COLUMN "status" SET DEFAULT 'training'::text;--> statement-breakpoint
DROP TYPE "public"."week_status";--> statement-breakpoint
CREATE TYPE "public"."week_status" AS ENUM('training', 'cancelled', 'no_session');--> statement-breakpoint
ALTER TABLE "season_weeks" ALTER COLUMN "status" SET DEFAULT 'training'::"public"."week_status";--> statement-breakpoint
ALTER TABLE "season_weeks" ALTER COLUMN "status" SET DATA TYPE "public"."week_status" USING "status"::"public"."week_status";