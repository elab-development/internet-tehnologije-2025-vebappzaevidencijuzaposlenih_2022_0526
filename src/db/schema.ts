import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  date,
  pgEnum,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// 3 tipa korisnika
export const roleNameEnum = pgEnum("role_name", ["ADMIN", "MANAGER", "EMPLOYEE"]);

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: roleNameEnum("name").notNull().unique(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),

    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
  })
);

// veza korisnik–grupa (više-na-više)
export const userGroups = pgTable(
  "user_groups",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.groupId] }),
  })
);

// evidencija prisustva (po danu)
export const workDayRecords = pgTable(
  "work_day_records",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    workDate: date("work_date").notNull(),
    checkIn: timestamp("check_in").notNull(),
    checkOut: timestamp("check_out"),
    note: text("note"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueUserDate: uniqueIndex("work_day_user_date_unique").on(t.userId, t.workDate),
  })
);

// aktivnosti (vezuju se za work day record)
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  workDayId: integer("work_day_id")
    .notNull()
    .references(() => workDayRecords.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  minutesSpent: integer("minutes_spent").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});