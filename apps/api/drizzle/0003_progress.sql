CREATE TABLE "progress" (
	"user_id" uuid NOT NULL,
	"puzzle_id" uuid NOT NULL,
	"cells" jsonb NOT NULL,
	"elapsed_ms" integer NOT NULL,
	"status" text NOT NULL,
	"saved_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"finished_ms" integer,
	"best_ms" integer,
	"best_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_user_id_puzzle_id_pk" PRIMARY KEY("user_id","puzzle_id"),
	CONSTRAINT "progress_elapsed_ms_check" CHECK ("progress"."elapsed_ms" BETWEEN 0 AND 604800000),
	CONSTRAINT "progress_status_check" CHECK ("progress"."status" IN ('in_progress', 'completed')),
	CONSTRAINT "progress_completed_pair" CHECK (("progress"."status" = 'completed') = ("progress"."completed_at" IS NOT NULL AND "progress"."finished_ms" IS NOT NULL)),
	CONSTRAINT "progress_best_pair" CHECK (("progress"."best_ms" IS NULL) = ("progress"."best_at" IS NULL)),
	CONSTRAINT "progress_best_when_finished" CHECK ("progress"."finished_ms" IS NULL OR ("progress"."best_ms" IS NOT NULL AND "progress"."best_ms" <= "progress"."finished_ms"))
);
--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_puzzle_id_puzzles_puzzle_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("puzzle_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "progress_puzzle_id_idx" ON "progress" USING btree ("puzzle_id");
--> statement-breakpoint
CREATE TRIGGER progress_set_updated_at BEFORE UPDATE ON progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();
