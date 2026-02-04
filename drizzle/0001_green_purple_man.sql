ALTER TABLE "work_day_records" ALTER COLUMN "check_in" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "start_time" time NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "end_time" time NOT NULL;