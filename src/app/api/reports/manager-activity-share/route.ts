// API ruta za menadžera:
// Za zadati mesec i title aktivnosti vraća udeo članova tima u minutima (pie chart)
// Query params: month="YYYY-MM", title="..."

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

/**
 * @swagger
 * /api/reports/manager-activity-share:
 *   get:
 *     summary: Udeo clanova tima po aktivnosti
 *     description: Za zadati mesec i naslov aktivnosti vraca koliko je svaki clan tima menadzera utrosio minuta na tu aktivnost.
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
 *       - in: query
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *           example: "Razvoj funkcionalnosti"
 *         description: Naziv aktivnosti
 *     responses:
 *       200:
 *         description: Uspesno vraceni podaci za pie chart
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
 *                     example: "Andjela Kandic"
 *                   minutes:
 *                     type: integer
 *                     example: "540"
 *       400:
 *         description: Neispravan zahtev
 *       401:
 *         description: Korisnik nije ulogovan
 *       403:
 *         description: Pristup dozvoljen samo menadzeru
 *       500:
 *         description: Greska pri ucitavanju izvestaja
 */


//GET
export async function GET(req: Request) {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Niste ulogovani." }, { status: 401 });

    const claims = verifyAuthToken(token);
    const managerId = Number(claims.sub);

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? "";
    const title = (searchParams.get("title") ?? "").trim();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Neispravan month param." }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Parametar title je obavezan." }, { status: 400 });
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

    // Menadžerove grupe
    const managerGroups = await db
      .select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(eq(userGroups.userId, managerId));

    const groupIds = managerGroups.map((g) => g.groupId);
    if (groupIds.length === 0) return NextResponse.json([], { status: 200 });

    // Članovi timova
    const members = await db
      .select({ userId: userGroups.userId, fullName: users.fullName })
      .from(userGroups)
      .innerJoin(users, eq(userGroups.userId, users.id))
      .where(inArray(userGroups.groupId, groupIds));

    const uniq = new Map<number, string>();
    for (const m of members) uniq.set(m.userId, m.fullName);
    uniq.delete(managerId);

    const memberIds = Array.from(uniq.keys());
    if (memberIds.length === 0) return NextResponse.json([], { status: 200 });

    const { startDate, endDateExclusive } = monthRange(month);

    // Sum(minutesSpent) po user-u za dati title u mesecu
    const rows = await db
      .select({
        userId: workDayRecords.userId,
        minutes: sql<number>`coalesce(sum(${activities.minutesSpent}), 0)`,
      })
      .from(workDayRecords)
      .innerJoin(activities, eq(activities.workDayId, workDayRecords.id))
      .where(
        and(
          inArray(workDayRecords.userId, memberIds),
          sql`lower(trim(${activities.title})) = lower(trim(${title}))`,
          sql`${workDayRecords.workDate} >= ${startDate}`,
          sql`${workDayRecords.workDate} < ${endDateExclusive}`
        )
      )       
      .groupBy(workDayRecords.userId);

    const result = rows
      .map((r) => ({
        userId: Number(r.userId),
        fullName: uniq.get(Number(r.userId)) ?? `User ${r.userId}`,
        minutes: Number(r.minutes ?? 0),
      }))
      // izbacimo nule da pie chart ne bude pun praznih slice-ova
      //.filter((x) => x.minutes > 0);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("manager-activity-share error", err);
    return NextResponse.json({ error: "Greška pri učitavanju izveštaja." }, { status: 500 });
  }
}