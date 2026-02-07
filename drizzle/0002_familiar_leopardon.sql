ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "work_day_records" ADD COLUMN "hours" integer DEFAULT 0 NOT NULL;

ALTER TABLE "work_day_records"
ADD CONSTRAINT "work_day_records_chk_checkout_gt_checkin"
CHECK (
  check_in IS NULL
  OR check_out IS NULL
  OR check_out > check_in
);
--> statement-breakpoint

ALTER TABLE "work_day_records"
ADD CONSTRAINT "work_day_records_chk_hours_max_8"
CHECK (
  hours >= 0 AND hours <= 8
);
