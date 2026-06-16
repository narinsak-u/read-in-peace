CREATE TABLE "reading_goals" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"year" integer NOT NULL,
	"goal" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "total_pages" integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE "borrows" ADD COLUMN "due_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "borrows" ADD COLUMN "current_page" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "borrows" ADD COLUMN "total_pages" integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_goals" ADD CONSTRAINT "reading_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;