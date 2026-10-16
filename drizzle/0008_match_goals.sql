CREATE TABLE "match_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"team" "team" NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"goals" smallint NOT NULL,
	CONSTRAINT "match_goals_matchId_team_userId_unique" UNIQUE("match_id","team","user_id"),
	CONSTRAINT "match_goals_matchId_team_guestId_unique" UNIQUE("match_id","team","guest_id"),
	CONSTRAINT "match_goals_one_scorer" CHECK (("match_goals"."user_id" is null) <> ("match_goals"."guest_id" is null)),
	CONSTRAINT "match_goals_positive" CHECK ("match_goals"."goals" > 0)
);
--> statement-breakpoint
ALTER TABLE "match_goals" ADD CONSTRAINT "match_goals_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_goals" ADD CONSTRAINT "match_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_goals" ADD CONSTRAINT "match_goals_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;