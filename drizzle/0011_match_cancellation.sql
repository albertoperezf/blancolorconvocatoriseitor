ALTER TABLE "matches" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "cancel_reason" varchar(100);--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;