ALTER TYPE "public"."role" ADD VALUE 'editor';--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "result_by" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_result_by_users_id_fk" FOREIGN KEY ("result_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;