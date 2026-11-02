CREATE TABLE "duel_participants" (
	"duel_participant_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duel_id" uuid NOT NULL,
	"role" text NOT NULL,
	"user_id" uuid,
	"nickname" text NOT NULL,
	"token_hash" text NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"elapsed_ms" integer,
	"helps_used" integer DEFAULT 0 NOT NULL,
	"penalty_ms" integer DEFAULT 0 NOT NULL,
	"end_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "duel_participants_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "duel_participants_role_check" CHECK ("duel_participants"."role" IN ('creator', 'opponent')),
	CONSTRAINT "duel_participants_nickname_check" CHECK (char_length("duel_participants"."nickname") BETWEEN 1 AND 24),
	CONSTRAINT "duel_participants_end_pair" CHECK (("duel_participants"."finished_at" IS NULL) = ("duel_participants"."end_reason" IS NULL)),
	CONSTRAINT "duel_participants_end_reason_check" CHECK ("duel_participants"."end_reason" IS NULL OR "duel_participants"."end_reason" IN ('completed', 'forfeit', 'timeout')),
	CONSTRAINT "duel_participants_completed_elapsed" CHECK ("duel_participants"."end_reason" IS DISTINCT FROM 'completed' OR "duel_participants"."elapsed_ms" IS NOT NULL),
	CONSTRAINT "duel_participants_helps_check" CHECK ("duel_participants"."helps_used" BETWEEN 0 AND 1000)
);
--> statement-breakpoint
CREATE TABLE "duels" (
	"duel_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"puzzle_id" uuid NOT NULL,
	"link_token" text NOT NULL,
	"code" text NOT NULL,
	"state" text NOT NULL,
	"help_mode" text NOT NULL,
	"help_penalty_ms" integer,
	"max_ms" integer,
	"start_deadline_at" timestamp with time zone NOT NULL,
	"outcome" text,
	"outcome_reason" text,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "duels_link_token_unique" UNIQUE("link_token"),
	CONSTRAINT "duels_state_check" CHECK ("duels"."state" IN ('open', 'running', 'finished', 'cancelled')),
	CONSTRAINT "duels_help_mode_check" CHECK ("duels"."help_mode" IN ('free', 'forbidden', 'penalty')),
	CONSTRAINT "duels_help_penalty_check" CHECK (("duels"."help_mode" = 'penalty') = ("duels"."help_penalty_ms" IS NOT NULL AND "duels"."help_penalty_ms" > 0)),
	CONSTRAINT "duels_max_ms_check" CHECK ("duels"."max_ms" IS NULL OR "duels"."max_ms" BETWEEN 60000 AND 7200000),
	CONSTRAINT "duels_outcome_check" CHECK ("duels"."outcome" IS NULL OR "duels"."outcome" IN ('creator', 'opponent', 'tie')),
	CONSTRAINT "duels_outcome_reason_check" CHECK ("duels"."outcome_reason" IS NULL OR "duels"."outcome_reason" IN ('time', 'forfeit', 'timeout', 'walkover', 'declined'))
);
--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" DROP CONSTRAINT "rate_limit_attempts_action_check";--> statement-breakpoint
ALTER TABLE "duel_participants" ADD CONSTRAINT "duel_participants_duel_id_duels_duel_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."duels"("duel_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_participants" ADD CONSTRAINT "duel_participants_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_puzzle_id_puzzles_puzzle_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("puzzle_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "duel_participants_duel_role_unique" ON "duel_participants" USING btree ("duel_id","role");--> statement-breakpoint
CREATE INDEX "duel_participants_user_id_idx" ON "duel_participants" USING btree ("user_id") WHERE "duel_participants"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "duels_open_code_unique" ON "duels" USING btree ("code") WHERE "duels"."state" = 'open';--> statement-breakpoint
CREATE INDEX "duels_state_deadline_idx" ON "duels" USING btree ("state","start_deadline_at");--> statement-breakpoint
CREATE INDEX "duels_puzzle_id_idx" ON "duels" USING btree ("puzzle_id");--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" ADD CONSTRAINT "rate_limit_attempts_action_check" CHECK ("rate_limit_attempts"."action" IN ('LOGIN', 'REGISTER', 'PUZZLE_FETCH', 'SETTINGS_SAVE', 'FORGOT_PASSWORD', 'RESEND_VERIFICATION', 'VERIFY_TOKEN', 'EMAIL_SENT', 'RESET_PASSWORD', 'PROGRESS_SAVE', 'PASSWORD_CONFIRM', 'CHANGE_EMAIL', 'DUEL_CREATE', 'DUEL_LOOKUP', 'DUEL_MINE'));--> statement-breakpoint
CREATE TRIGGER duels_set_updated_at BEFORE UPDATE ON duels FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER duel_participants_set_updated_at BEFORE UPDATE ON duel_participants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
