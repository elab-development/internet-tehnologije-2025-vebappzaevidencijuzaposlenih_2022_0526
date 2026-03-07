// API ruta za menadžera:
// Vraća ukupno trajanje aktivnosti (u minutima) po članovima tima za zadati mesec
// Query param: month = "YYYY-MM"

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";
import { activities, roles, userGroups, users, workDayRecords } from "@/src/db/schema";

function monthRange(yyyyMm: string) {
  // ulaz: "2026-02"
  const [yStr, mStr] = yyyyMm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);

  // start: prvi dan meseca
  const start = new Date(y, m - 1, 1);
  // endExclusive: prvi dan sledećeg meseca
  const endExclusive = new Date(y, m, 1);

  const startDate = start.toISOString().slice(0, 10);
  const endDateExclusive = endExclusive.toISOString().slice(0, 10);

  return { startDate, endDateExclusive };
}

/**
 * @swagger
 * /api/reports/manager-team-month:
 *   get:
 *     summary: Ukupno trajanje aktivnosti clanova tima za mesec
 *     description: Za zadati mesec vraca ukupan broj minuta aktivnosti po svakom clanu tima menadzera.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-02"
 *         description: Mesec u formatu YYYY-MM
 *     responses:
 *       200:
 *         description: Uspesno vraceni podaci o timu
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: integer
 *                     example: "3"
 *                   fullName:
 *                     type: string
 *                     example: "Danica Jovanovic"
 *                   totalMinutes:
 *                     type: integer
 *                     example: "1260"
 *       400:
 *         description: Neispravan month parametar
 *       401:
 *         description: Korisnik nije ulogovan
 *       403:
 *         description: Pristup dozvoljen samo menadzeru
 *       500:
 *         description: Greska pri ucitavanju izvestaja
 */


export async function GET(req: Request) {
  try {
    // auth
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Niste ulogovani." }, { status: 401 });
    }

    const claims = verifyAuthToken(token);
    const managerId = Number(claims.sub);

    // query param month
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? "";
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Neispravan month param." }, { status: 400 });
    }

    // Provera da je korisnik MANAGER
    const me = await db
      .select({ roleName: roles.name })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, managerId))
      .limit(1);

    if (me[0]?.roleName !== "MANAGER") {
      return NextResponse.json({ error: "Nemate dozvolu (MANAGER)." }, { status: 403 });
    }

    // Menadžerove grupe
    const managerGroups = await db
      .select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(eq(userGroups.userId, managerId));

    const groupIds = managerGroups.map((g) => g.groupId);
    if (groupIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Svi članovi timova (grupa) tog menadžera
    const teamMembers = await db
      .select({
        userId: userGroups.userId,
        fullName: users.fullName,
      })
      .from(userGroups)
      .innerJoin(users, eq(userGroups.userId, users.id))
      .where(inArray(userGroups.groupId, groupIds));

    // Uklonimo duplikate (ako je korisnik u više grupa)
    const uniq = new Map<number, string>();
    for (const m of teamMembers) uniq.set(m.userId, m.fullName);

    // Ne prikazujemo menadžera u timu (po želji). Ako želite i njega, obrišite ovu liniju.
    uniq.delete(managerId);

    const memberIds = Array.from(uniq.keys());
    if (memberIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // opseg datuma za mesec
    const { startDate, endDateExclusive } = monthRange(month);

    // Sum(minutes_spent) po user-u za taj mesec
    const rows = await db
      .select({
        userId: workDayRecords.userId,
        totalMinutes: sql<number>`coalesce(sum(${activities.minutesSpent}), 0)`,
      })
      .from(workDayRecords)
      .innerJoin(activities, eq(activities.workDayId, workDayRecords.id))
      .where(
        and(
          inArray(workDayRecords.userId, memberIds),
          // date range: [startDate, endDateExclusive)
          sql`${workDayRecords.workDate} >= ${startDate}`,
          sql`${workDayRecords.workDate} < ${endDateExclusive}`
        )
      )
      .groupBy(workDayRecords.userId);

    const byUser = new Map<number, number>();
    for (const r of rows) byUser.set(Number(r.userId), Number(r.totalMinutes ?? 0));

    // Vraćamo sve članove, i one koji imaju 0
    const result = memberIds.map((uid) => ({
      userId: uid,
      fullName: uniq.get(uid) ?? `User ${uid}`,
      totalMinutes: byUser.get(uid) ?? 0,
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("manager-team-month error", err);
    return NextResponse.json({ error: "Greška pri učitavanju izveštaja." }, { status: 500 });
  }
}