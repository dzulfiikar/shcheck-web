CREATE TABLE IF NOT EXISTS "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target" varchar(2048) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"options" jsonb,
	"result" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration" integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_status_idx" ON "scans" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_created_at_idx" ON "scans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_target_idx" ON "scans" USING btree ("target");