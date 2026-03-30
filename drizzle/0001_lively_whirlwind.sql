CREATE TABLE "cal_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cal_event_uid" text NOT NULL,
	"trigger_event" text NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cal_event_uid_idx" ON "cal_event" USING btree ("cal_event_uid");