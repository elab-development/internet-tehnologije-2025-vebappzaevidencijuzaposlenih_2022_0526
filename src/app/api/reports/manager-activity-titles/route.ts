// API ruta za menadžera:
// Vraća listu distinct title aktivnosti koje su članovi tima radili u zadatom mesecu
// Query param: month="YYYY-MM"

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";
import { activities, roles, userGroups, users, workDayRecords } from "@/src/db/schema";

function monthRange(yyyyMm: string) {
  const [yStr, mStr] = yyyyMm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);

  const start = new Date(y, m - 1, 1);
  const endExclusive = new Date(y, m, 1);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDateExclusive: endExclusive.toISOString().slice(0, 10),
  };
}

export async function GET(req: Request) {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Niste ulogovani." }, { status: 401 });

    const claims = verifyAuthToken(token);
    const managerId = Number(claims.sub);

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? "";
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Neispravan month param." }, { status: 400 });
    }

    // Provera MANAGER
    const me = await db
      .select({ roleName: roles.name })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, managerId))
      .limit(1);

    if (me[0]?.roleName !== "MANAGER") {
      return NextResponse.json({ error: "Nemate dozvolu (MANAGER)." }, { status: 403 });
    }

    // grupe menadžera
    const managerGroups = await db
      .select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(eq(userGroups.userId, managerId));

    const groupIds = managerGroups.map((g) => g.groupId);
    if (groupIds.length === 0) return NextResponse.json([], { status: 200 });

    // članovi
    const members = await db
      .select({ userId: userGroups.userId })
      .from(userGroups)
      .where(inArray(userGroups.groupId, groupIds));

    const memberIds = Array.from(new Set(members.map((m) => m.userId))).filter(
      (id) => id !== managerId
    );

    if (memberIds.length === 0) return NextResponse.json([], { status: 200 });

    const { startDate, endDateExclusive } = monthRange(month);

    // distinct title
    const rows = await db
      .select({
        title: sql<string>`trim(${activities.title})`,
        total: sql<number>`coalesce(sum(${activities.minutesSpent}), 0)`,
      })
      .from(workDayRecords)
      .innerJoin(activities, eq(activities.workDayId, workDayRecords.id))
      .where(
        and(
          inArray(workDayRecords.userId, memberIds),
          sql`${workDayRecords.workDate} >= ${startDate}`,
          sql`${workDayRecords.workDate} < ${endDateExclusive}`
        )
      )
      .groupBy(sql`trim(${activities.title})`)
      .having(sql`coalesce(sum(${activities.minutesSpent}), 0) > 0`)
      .orderBy(sql`trim(${activities.title})`);

    return NextResponse.json(rows.map((r) => r.title), { status: 200 });
  } catch (err) {
    console.error("manager-activity-titles error", err);
    return NextResponse.json({ error: "Greška pri učitavanju aktivnosti." }, { status: 500 });
  }
}