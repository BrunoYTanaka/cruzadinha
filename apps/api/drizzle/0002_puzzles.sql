CREATE TABLE "puzzles" (
	"puzzle_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"level" text NOT NULL,
	"date" date NOT NULL,
	"data" jsonb NOT NULL,
	"solution" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "puzzles_source_check" CHECK ("puzzles"."source" IN ('oglobo')),
	CONSTRAINT "puzzles_level_check" CHECK ("puzzles"."level" IN ('daily'))
);
--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" DROP CONSTRAINT "rate_limit_attempts_action_check";--> statement-breakpoint
CREATE UNIQUE INDEX "puzzles_source_level_date_unique" ON "puzzles" USING btree ("source","level","date");--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" ADD CONSTRAINT "rate_limit_attempts_action_check" CHECK ("rate_limit_attempts"."action" IN ('LOGIN', 'REGISTER', 'INVITE_CREATE', 'PUZZLE_FETCH'));
--> statement-breakpoint
CREATE TRIGGER puzzles_set_updated_at BEFORE UPDATE ON puzzles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
