import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, gte, lt, inArray } from "drizzle-orm";

import { db } from "@/src/db";
import { workDayRecords, activities } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

// helper: "2026-02" prebacuje u { start: "2026-02-01", end: "2026-03-01" }
function getMonthRange(month: string) {
  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;

  const startDate = new Date(year, monthIdx, 1);
  const endDate = new Date(year, monthIdx + 1, 1);

  const toISODate = (d: Date) => d.toISOString().slice(0, 10);

  return {
    start: toISODate(startDate),
    end: toISODate(endDate),
  };
}

// helper: "HH:MM:SS" prebaci u minute
function timeToMinutes(t: string): number {
  const [hStr, mStr, sStr] = t.split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  return h * 60 + m;
}

/**
 * 
 * /api/reports/employee-month:
 *   get:
 *     summary: Mesecni izvestaj zaposlenog
 *     description: Vraca broj radnih dana, ukupan broj aktivnosti i zbir minuta po naslovu aktivnosti za zadati mesec trenutno ulogovanog korisnika.
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
 *         description: Uspesno generisan izvestaj
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 month:
 *                   type: string
 *                   example: "2026-02"
 *                 workDaysCount:
 *                   type: integer
 *                   example: "20"
 *                 totalActivities:
 *                   type: integer
 *                   example: "42"
 *                 activitiesByTitle:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                         example: "Razvoj funkcionalnosti"
 *                       minutes:
 *                         type: integer
 *                         example: "960"
 *       400:
 *         description: Neispravan month parametar
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Greska pri generisanju izvestaja
 */

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = verifyAuthToken(token);
    const userId = Number(claims.sub);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = (searchParams.get("month") ?? "").trim();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Parametar 'month' je obavezan u formatu YYYY-MM." },
        { status: 400 }
      );
    }

    const { start, end } = getMonthRange(month);

    // work_day_records za korisnika u tom mesecu
    const days = await db
      .select({
        id: workDayRecords.id,
        workDate: workDayRecords.workDate,
        checkIn: workDayRecords.checkIn,
        checkOut: workDayRecords.checkOut,
      })
      .from(workDayRecords)
      .where(
        and(
          eq(workDayRecords.userId, userId),
          gte(workDayRecords.workDate, start as any),
          lt(workDayRecords.workDate, end as any)
        )
      );

    const workDaysCount = days.filter(
      (d) => d.checkIn !== null && d.checkOut !== null
    ).length;

    const dayIds = days.map((d) => d.id);

    if (dayIds.length === 0) {
      return NextResponse.json(
        {
          month,
          workDaysCount: 0,
          totalActivities: 0,
          activitiesByTitle: [] as { title: string; minutes: number }[],
        },
        { status: 200 }
      );
    }

    // aktivnosti za te dane
    const activityRows = await db
      .select({
        title: activities.title,
        startTime: activities.startTime,
        endTime: activities.endTime,
      })
      .from(activities)
      .where(inArray(activities.workDayId, dayIds));

    const totalActivities = activityRows.length;

    //saberi minute po nazivu aktivnosti
    const byTitle = new Map<string, number>();

    for (const a of activityRows) {
      const startStr = String(a.startTime); // "HH:MM:SS"
      const endStr = String(a.endTime);
      const startMin = timeToMinutes(startStr);
      const endMin = timeToMinutes(endStr);
      const diff = Math.max(0, endMin - startMin); // za svaki slučaj

      const prev = byTitle.get(a.title) ?? 0;
      byTitle.set(a.title, prev + diff);
    }

    const activitiesByTitle = Array.from(byTitle.entries()).map(
      ([title, minutes]) => ({ title, minutes })
    );

    return NextResponse.json(
      {
        month,
        workDaysCount,
        totalActivities,
        activitiesByTitle,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/reports/employee-month error", e);
    return NextResponse.json(
      { error: "Greška pri generisanju izveštaja." },
      { status: 500 }
    );
  }
}