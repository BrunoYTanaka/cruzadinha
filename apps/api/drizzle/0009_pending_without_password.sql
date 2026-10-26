ALTER TABLE "rate_limit_attempts" DROP CONSTRAINT "rate_limit_attempts_action_check";--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_open_user_unique" ON "password_reset_tokens" USING btree ("user_id") WHERE "password_reset_tokens"."used_at" IS NULL;--> statement-breakpoint
ALTER TABLE "pending_registrations" DROP COLUMN "password_hash";--> statement-breakpoint
ALTER TABLE "pending_registrations" DROP COLUMN "last_sent_at";--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" ADD CONSTRAINT "rate_limit_attempts_action_check" CHECK ("rate_limit_attempts"."action" IN ('LOGIN', 'REGISTER', 'INVITE_CREATE', 'PUZZLE_FETCH', 'SETTINGS_SAVE', 'FORGOT_PASSWORD', 'RESEND_VERIFICATION', 'VERIFY_TOKEN', 'EMAIL_SENT', 'RESET_PASSWORD'));