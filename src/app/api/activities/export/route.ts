import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/src/db";
import { workDayRecords, activities } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

// Pomoćna funkcija:
// "09:00" ili "09:00:00" prebacujemo u "090000"
// jer ICS zahteva HHMMSS
function toICSTimePart(time: string): string {
  return time.replace(/:/g, "").padEnd(6, "0");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // 1. datum je obavezan
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Datum je obavezan." },
        { status: 400 }
      );
    }

    // 2. opciono: ids=1,2,3 za selektovane aktivnosti
    const idsParam = searchParams.get("ids"); // npr "32,43"
    let ids: number[] = [];

    if (idsParam && idsParam.trim() !== "") {
      ids = idsParam
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => !Number.isNaN(n));
    }

    // 3. provera autentifikacije
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Niste ulogovani." },
        { status: 401 }
      );
    }

    const claims = verifyAuthToken(token);
    const userId = Number(claims.sub);

    if (!userId) {
      return NextResponse.json(
        { error: "Niste ulogovani." },
        { status: 401 }
      );
    }

    // 4. nalazenje work_day_record za tog usera i datum
    const record = await db
      .select({ id: workDayRecords.id })
      .from(workDayRecords)
      .where(
        and(
          eq(workDayRecords.userId, userId),
          eq(workDayRecords.workDate, date as any)
        )
      )
      .limit(1);

    if (!record[0]) {
      // nema radnog dana → nema ni aktivnosti
      return NextResponse.json(
        { error: "Nema aktivnosti za izabrani datum." },
        { status: 404 }
      );
    }

    // 5. učitavanje aktivnosti (sve ili samo selektovane)
    const baseCondition = eq(activities.workDayId, record[0].id);

    const whereCondition =
      ids.length > 0
        ? and(baseCondition, inArray(activities.id, ids))
        : baseCondition;

    const rows = await db
      .select({
        id: activities.id,
        title: activities.title,
        description: activities.description,
        startTime: activities.startTime,
        endTime: activities.endTime,
      })
      .from(activities)
      .where(whereCondition)
      .orderBy(activities.startTime);

    // 6. Generisanje .ics fajla

    // YYYYMMDD format
    const yyyymmdd = date.replace(/-/g, "");

    let ics =
      "BEGIN:VCALENDAR\r\n" +
      "VERSION:2.0\r\n" +
      "PRODID:-//ITEH//Aktivnosti//SR\r\n" +
      "CALSCALE:GREGORIAN\r\n" +
      "BEGIN:VTIMEZONE\r\n" +
      "TZID:Europe/Belgrade\r\n" +
      "BEGIN:STANDARD\r\n" +
      "TZOFFSETFROM:+0200\r\n" +
      "TZOFFSETTO:+0100\r\n" +
      "DTSTART:19701025T030000\r\n" +
      "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\n" +
      "END:STANDARD\r\n" +
      "BEGIN:DAYLIGHT\r\n" +
      "TZOFFSETFROM:+0100\r\n" +
      "TZOFFSETTO:+0200\r\n" +
      "DTSTART:19700329T020000\r\n" +
      "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\n" +
      "END:DAYLIGHT\r\n" +
      "END:VTIMEZONE\r\n";

    for (const a of rows) {
      const start = `${yyyymmdd}T${toICSTimePart(String(a.startTime))}`;
      const end = `${yyyymmdd}T${toICSTimePart(String(a.endTime))}`;

      ics +=
        "BEGIN:VEVENT\r\n" +
        `DTSTART;TZID=Europe/Belgrade:${start}\r\n` +
        `DTEND;TZID=Europe/Belgrade:${end}\r\n` +
        `SUMMARY:${String(a.title).replace(/\n/g, " ")}\r\n` +
        `DESCRIPTION:${String(a.description ?? "").replace(/\n/g, " ")}\r\n` +
        "END:VEVENT\r\n";
    }

    ics += "END:VCALENDAR\r\n";

    // 7. vraćanje fajla
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="aktivnosti_${date}.ics"`,
      },
    });
  } catch (e) {
    console.error("GET /api/activities/export error", e);
    return NextResponse.json(
      { error: "Greška pri eksportovanju aktivnosti." },
      { status: 500 }
    );
  }
}
