// src/app/api/activities/export/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/src/db";
import { workDayRecords, activities } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";
import { dateSchema } from "@/src/lib/validator";

// ids query param: "1,2,3" prebacujemo u  [1, 2, 3]
function parseIdsParam(idsParam: string | null): number[] {
  if (!idsParam) return [];
  const s = idsParam.trim();
  if (!s) return [];

  // XSS = ovde dozvoljavamo samo pozitivne cele brojeve (ne proizvoljan string)
  return s
    .split(",")
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

// 09:00 ili 09:00:00 u ,,090000" (ICS zahteva HHMMSS)
function toICSTimePart(time: string): string {
  return String(time).replace(/:/g, "").padEnd(6, "0");
}

// XSS =  Sanitizacija za ICS tekst: uklanjamo nove redove da ne pokvare format fajla
function sanitizeIcsText(value: unknown): string {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .trim();
}


/**
 * @swagger
 * /api/activities/export:
 *   get:
 *     summary: Eksport aktivnosti u ICS fajl
 *     description: Vraca aktivnosti ulogovanog korisnika za izabrani datum kao .ics kalendarski fajl. Opcioni query parametar ids omogucava eksport samo odabranih aktivnosti.
 *     tags:
 *       - Activities
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-03-06"
 *         description: Datum za koji se eksportuju aktivnosti
 *       - in: query
 *         name: ids
 *         required: false
 *         schema:
 *           type: string
 *           example: "1,2,3"
 *         description: Zarezom odvojeni ID-jevi aktivnosti za parcijalni eksport
 *     responses:
 *       200:
 *         description: Uspesan eksport ICS fajla
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 *               example: "BEGIN:VCALENDAR..."
 *       400:
 *         description: Neispravan upit
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Nema aktivnosti za izabrani datum ili nema aktivnosti za eksport
 *       500:
 *         description: Greska pri eksportovanju aktivnosti
 */



export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // XSS =  Validacija query parametara (date mora da prodje dateSchema)
    const querySchema = z.object({
      date: dateSchema,
      ids: z.string().optional(),
    });

    const parsed = querySchema.safeParse({
      date: url.searchParams.get("date"),
      ids: url.searchParams.get("ids") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravan upit." },
        { status: 400 }
      );
    }

    const date = parsed.data.date;
    const ids = parseIdsParam(parsed.data.ids ?? null);

    // IDOR + Auth: Bez validnog cookie + tokena ne dozvoljavamo eksport
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = verifyAuthToken(token);
    const userId = Number(claims.sub);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // IDOR = Biramo work_day_record samo za ULOGOVANOG user-a (ne moze tudji)
    // SQL injection =  Drizzle eq/and pravi parametarske upite (ne spajamo SQL string)
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
      return NextResponse.json(
        { error: "Nema aktivnosti za izabrani datum." },
        { status: 404 }
      );
    }

    // SQL injection =  uslovi su parametarski; ids su brojevi filtrirani gore
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

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Nema aktivnosti za eksport." },
        { status: 404 }
      );
    }

    // Generisemo .ics sadrzaj
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
      // Uklanjamo nove redove da ne pokvare ICS format
      const summary = String(a.title).replace(/\n/g, " ");
      const description = String(a.description ?? "").replace(/\n/g, " ");

      ics +=
        "BEGIN:VEVENT\r\n" +
        `DTSTART;TZID=Europe/Belgrade:${start}\r\n`+
        `DTEND;TZID=Europe/Belgrade:${end}\r\n` +
        `SUMMARY:${summary}\r\n` +
        `DESCRIPTION:${description}\r\n` +
        "END:VEVENT\r\n";
    }

    ics += "END:VCALENDAR\r\n";

    // vrati fajl kao download
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
