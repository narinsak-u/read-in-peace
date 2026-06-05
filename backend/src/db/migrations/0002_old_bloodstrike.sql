ALTER TABLE "books" ADD COLUMN "in_stock" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "is_available" boolean DEFAULT true NOT NULL;