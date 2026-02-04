import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/src/db";
import { workDayRecords, activities } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

//Pomocna funkcija:
//"09:00" ili "09:00:00" prebacujemo u "090000"
//jer ICS zahteva HHMMSS
function toICSTimePart(time: string): string {
  return time.replace(/:/g, "").padEnd(6, "0");
}

export async function GET(req: Request) {
  try {
    //1. uzimamo datum iz upita
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); 

    if (!date) {
      return NextResponse.json(
        { error: "Datum je obavezan." },
        { status: 400 }
      );
    }

    //2. provera autentifikacije
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Niste ulogovani." },
        { status: 401 }
      );
    }

    const claims = verifyAuthToken(token);
    const userId = Number(claims.sub);

    //3. nalazenje wdr
    const record = await db
      .select({ id: workDayRecords.id })
      .from(workDayRecords)
      .where(
        and(
          eq(workDayRecords.userId, userId),
          eq(workDayRecords.workDate, date)
        )
      )
      .limit(1);

    if (!record[0]) {
      return NextResponse.json(
        { error: "Nema aktivnosti za izabrani datum." },
        { status: 404 }
      );
    }

    //4. ucitavanje aktivnosti
    const rows = await db
      .select({
        title: activities.title,
        description: activities.description,
        startTime: activities.startTime,
        endTime: activities.endTime,
      })
      .from(activities)
      .where(eq(activities.workDayId, record[0].id))
      .orderBy(activities.startTime);

    //5. Generisanje .ics fajla

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

    //6. Vracanje kao fajl
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="aktivnosti_${date}.ics"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Greška pri eksportovanju aktivnosti." },
      { status: 500 }
    );
  }
}