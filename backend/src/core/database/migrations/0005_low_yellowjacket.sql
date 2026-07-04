ALTER TABLE "purchases" ADD COLUMN "stripe_session_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "receipt_url" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "amount_total" integer;