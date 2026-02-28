// API ruta za dobijanje produktivnosti zaposlenog
// Vraća ukupan broj radnih sati po mesecu za poslednjih 6 meseci

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, gte, lte, eq, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { workDayRecords } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

export async function GET() {
  try {
    // Čitamo auth cookie
    const token = (await cookies()).get(AUTH_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Niste ulogovani." }, { status: 401 });
    }

    // Dekodiramo i proveravamo JWT
    const claims = verifyAuthToken(token);

    // ID ulogovanog korisnika (sub je userId)
    const userId = Number(claims.sub);

    // Uzimamo današnji datum (poslednjih 6 meseci uključujući tekući)
    const now = new Date();
    const endDate = now.toISOString().slice(0, 10);

    // Početni datum = prvi dan meseca pre 5 meseci
    const start = new Date(now);
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);
    const startDate = start.toISOString().slice(0, 10);

    // Uzimamo work_day_records
    // Filtriramo po: userId, datumu (između startDate i endDate)
    // Grupisanje po mesecu (YYYY-MM)
    // Sabiramo broj sati (sum(hours))
    const rows = await db
      .select({
        month: sql<string>`to_char(${workDayRecords.workDate}, 'YYYY-MM')`,
        totalHours: sql<number>`coalesce(sum(${workDayRecords.hours}), 0)`,
      })
      .from(workDayRecords)
      .where(
        and(
          eq(workDayRecords.userId, userId),
          gte(workDayRecords.workDate, startDate),
          lte(workDayRecords.workDate, endDate)
        )
      )
      .groupBy(sql`to_char(${workDayRecords.workDate}, 'YYYY-MM')`)
      .orderBy(sql`min(${workDayRecords.workDate})`);

    // Pretvaramo SQL rezultat u čist JSON
    const result = rows.map((r) => ({
      month: r.month,
      totalHours: Number(r.totalHours ?? 0),
    }));

    // Vraćamo JSON niz
    return NextResponse.json(result);
  } catch (err) {
    // Ako dođe do greške (DB, token, itd.) vraćamo 500
    console.error("employee-productivity error", err);

    return NextResponse.json(
      { error: "Greška pri učitavanju produktivnosti." },
      { status: 500 }
    );
  }
}