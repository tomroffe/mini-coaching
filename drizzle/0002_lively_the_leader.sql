CREATE TABLE "enrolment_links" (
	"token" text PRIMARY KEY NOT NULL,
	"age_group_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by" uuid
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "enrolled_via" text;--> statement-breakpoint
ALTER TABLE "enrolment_links" ADD CONSTRAINT "enrolment_links_age_group_id_age_groups_id_fk" FOREIGN KEY ("age_group_id") REFERENCES "public"."age_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment_links" ADD CONSTRAINT "enrolment_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment_links" ADD CONSTRAINT "enrolment_links_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;