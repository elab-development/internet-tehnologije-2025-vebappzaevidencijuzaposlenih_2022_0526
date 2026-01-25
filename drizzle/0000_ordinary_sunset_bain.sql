CREATE TYPE "public"."role_name" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');
--> statement-breakpoint

CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_day_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"minutes_spent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "groups_name_unique" UNIQUE ("name")
);
--> statement-breakpoint

CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" "role_name" NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE ("name")
);
--> statement-breakpoint

CREATE TABLE "user_groups" (
	"user_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_groups_user_id_group_id_pk"
	PRIMARY KEY ("user_id", "group_id")
);
--> statement-breakpoint

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- evidencija radnog dana zaposlenog
CREATE TABLE "work_day_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"work_date" date NOT NULL,
	"check_in" timestamp NOT NULL,
	"check_out" timestamp,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- fk: aktivnost pripada određenom radnom danu
ALTER TABLE "activities"
ADD CONSTRAINT "activities_work_day_id_work_day_records_id_fk"
FOREIGN KEY ("work_day_id")
REFERENCES "public"."work_day_records" ("id")
ON DELETE cascade;
--> statement-breakpoint

-- fk: korisnik u grupi
ALTER TABLE "user_groups"
ADD CONSTRAINT "user_groups_user_id_users_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."users" ("id")
ON DELETE cascade;
--> statement-breakpoint

-- fk: grupa kojoj korisnik pripada
ALTER TABLE "user_groups"
ADD CONSTRAINT "user_groups_group_id_groups_id_fk"
FOREIGN KEY ("group_id")
REFERENCES "public"."groups" ("id")
ON DELETE cascade;
--> statement-breakpoint

-- fk: uloga korisnika
ALTER TABLE "users"
ADD CONSTRAINT "users_role_id_roles_id_fk"
FOREIGN KEY ("role_id")
REFERENCES "public"."roles" ("id");
--> statement-breakpoint

-- fk: radni dan pripada korisniku
ALTER TABLE "work_day_records"
ADD CONSTRAINT "work_day_records_user_id_users_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."users" ("id")
ON DELETE cascade;
--> statement-breakpoint

-- jedinstveni email za korisnike
CREATE UNIQUE INDEX "users_email_unique"
ON "users" USING btree ("email");
--> statement-breakpoint

-- jedinstvena evidencija po korisniku i datumu
CREATE UNIQUE INDEX "work_day_user_date_unique"
ON "work_day_records"
USING btree ("user_id", "work_date");