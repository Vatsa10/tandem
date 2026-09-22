ALTER TABLE "meetings" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "action_items" jsonb;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "highlights" jsonb;