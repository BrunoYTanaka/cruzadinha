CREATE TABLE "email_send_block" (
	"block_id" smallint PRIMARY KEY NOT NULL,
	"blocked_until" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_send_block_single_row" CHECK ("email_send_block"."block_id" = 1),
	CONSTRAINT "email_send_block_reason_check" CHECK ("email_send_block"."reason" IN ('daily_quota_exceeded', 'monthly_quota_exceeded'))
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"token_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "pending_registrations" (
	"pending_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_registrations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" DROP CONSTRAINT "rate_limit_attempts_action_check";--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" DROP CONSTRAINT "rate_limit_attempts_key_type_check";--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_open_user_unique" ON "password_reset_tokens" USING btree ("user_id") WHERE "password_reset_tokens"."used_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "pending_registrations_email_unique" ON "pending_registrations" USING btree ("email");--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" ADD CONSTRAINT "rate_limit_attempts_action_check" CHECK ("rate_limit_attempts"."action" IN ('LOGIN', 'REGISTER', 'PUZZLE_FETCH', 'SETTINGS_SAVE', 'FORGOT_PASSWORD', 'RESEND_VERIFICATION', 'VERIFY_TOKEN', 'EMAIL_SENT', 'RESET_PASSWORD'));--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" ADD CONSTRAINT "rate_limit_attempts_key_type_check" CHECK ("rate_limit_attempts"."key_type" IN ('EMAIL', 'NETWORK_ADDRESS', 'GLOBAL'));--> statement-breakpoint
CREATE TRIGGER pending_registrations_set_updated_at BEFORE UPDATE ON pending_registrations FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER password_reset_tokens_set_updated_at BEFORE UPDATE ON password_reset_tokens FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER email_send_block_set_updated_at BEFORE UPDATE ON email_send_block FOR EACH ROW EXECUTE FUNCTION set_updated_at();
