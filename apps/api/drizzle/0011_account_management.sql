CREATE TABLE "email_change_requests" (
	"request_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"new_email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_change_requests_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" DROP CONSTRAINT "rate_limit_attempts_action_check";--> statement-breakpoint
ALTER TABLE "email_change_requests" ADD CONSTRAINT "email_change_requests_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_change_requests_user_unique" ON "email_change_requests" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" ADD CONSTRAINT "rate_limit_attempts_action_check" CHECK ("rate_limit_attempts"."action" IN ('LOGIN', 'REGISTER', 'PUZZLE_FETCH', 'SETTINGS_SAVE', 'FORGOT_PASSWORD', 'RESEND_VERIFICATION', 'VERIFY_TOKEN', 'EMAIL_SENT', 'RESET_PASSWORD', 'PROGRESS_SAVE', 'PASSWORD_CONFIRM', 'CHANGE_EMAIL'));--> statement-breakpoint
CREATE TRIGGER email_change_requests_set_updated_at BEFORE UPDATE ON email_change_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
