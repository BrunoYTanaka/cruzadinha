CREATE TABLE "generated_source_settings" (
	"generated_source_setting_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"grid_size" smallint DEFAULT 11 NOT NULL,
	"difficulty" text DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generated_source_settings_source_check" CHECK ("generated_source_settings"."source_id" IN ('casa')),
	CONSTRAINT "generated_source_settings_grid_size_check" CHECK ("generated_source_settings"."grid_size" BETWEEN 9 AND 15),
	CONSTRAINT "generated_source_settings_difficulty_check" CHECK ("generated_source_settings"."difficulty" IN ('easy', 'medium', 'hard'))
);
--> statement-breakpoint
ALTER TABLE "puzzles" DROP CONSTRAINT "puzzles_source_check";--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" DROP CONSTRAINT "rate_limit_attempts_action_check";--> statement-breakpoint
ALTER TABLE "source_settings" DROP CONSTRAINT "source_settings_source_check";--> statement-breakpoint
CREATE UNIQUE INDEX "generated_source_settings_source_unique" ON "generated_source_settings" USING btree ("source_id");--> statement-breakpoint
ALTER TABLE "puzzles" ADD CONSTRAINT "puzzles_source_check" CHECK ("puzzles"."source" IN ('oglobo', 'cruzadaonline', 'cruzadasbrasil', 'clube', 'casa'));--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" ADD CONSTRAINT "rate_limit_attempts_action_check" CHECK ("rate_limit_attempts"."action" IN ('LOGIN', 'REGISTER', 'PUZZLE_FETCH', 'SETTINGS_SAVE', 'FORGOT_PASSWORD', 'RESEND_VERIFICATION', 'VERIFY_TOKEN', 'EMAIL_SENT', 'RESET_PASSWORD', 'PROGRESS_SAVE', 'PASSWORD_CONFIRM', 'CHANGE_EMAIL', 'DUEL_CREATE', 'DUEL_LOOKUP', 'DUEL_MINE', 'PUZZLE_GENERATE'));--> statement-breakpoint
ALTER TABLE "source_settings" ADD CONSTRAINT "source_settings_source_check" CHECK ("source_settings"."source_id" IN ('oglobo', 'cruzadaonline', 'cruzadasbrasil', 'clube', 'casa'));--> statement-breakpoint
CREATE TRIGGER generated_source_settings_set_updated_at BEFORE UPDATE ON generated_source_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
-- Feature 064: a Casa nasce com a configuração padrão e escondida, no fim da ordem das fontes.
INSERT INTO "generated_source_settings" ("source_id") VALUES ('casa') ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "source_settings" ("source_id", "visible", "position")
SELECT 'casa', false, COALESCE(MAX("position"), -1) + 1 FROM "source_settings"
ON CONFLICT DO NOTHING;
