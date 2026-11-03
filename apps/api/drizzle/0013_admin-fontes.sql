CREATE TABLE "source_setting_changes" (
	"source_setting_change_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_settings" (
	"source_setting_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_settings_source_check" CHECK ("source_settings"."source_id" IN ('oglobo', 'cruzadaonline', 'cruzadasbrasil', 'clube')),
	CONSTRAINT "source_settings_position_check" CHECK ("source_settings"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "source_setting_changes" ADD CONSTRAINT "source_setting_changes_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "source_settings_source_unique" ON "source_settings" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_settings_position_unique" ON "source_settings" USING btree ("position");--> statement-breakpoint
CREATE TRIGGER source_settings_set_updated_at BEFORE UPDATE ON source_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER source_setting_changes_set_updated_at BEFORE UPDATE ON source_setting_changes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
