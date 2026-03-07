// src/app/api/activities/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/src/db";
import { activities, workDayRecords } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";
import {
  activitiesGetQuerySchema,
  activitiesCreateBodySchema,
  activitiesDeleteBodySchema,
} from "@/src/lib/validator";

// GET /api/activities?date=YYYY-MM-DD
// "09:00" -> "09:00:00" (kompatibilno sa SQL time)
function normalizeTime(t: string): string {
  const s = String(t ?? "").trim();
  if (!s) return "";
  return s.length === 5 ? `${s}:00` : s;
}

// XSS = trimujemo/normalizujemo tekst pre upisa u bazu
// ovde samo uklanjamo nove redove/NULL karaktere 
function sanitizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/\0/g, "")
    .replace(/\r?\n/g, " ")
    .trim();
}

// IDOR = userId vadimo iskljucivo iz JWT (cookie), necemo iz req 
async function getUserIdFromAuthCookie(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const claims = verifyAuthToken(token);
  const userId = Number(claims.sub);
  if (!userId) return null;

  return userId;
}

// GET 
export async function GET(req: Request) {
  try {
    // IDOR = ulogovan user sme da vidi SVOJE aktivnosti
    const userId = await getUserIdFromAuthCookie();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);

    // SQL injection + XSS = zod validacija query parametara (dozvoljavamo samo validan date format)
    const parsed = activitiesGetQuerySchema.safeParse({
      date: url.searchParams.get("date"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravan upit." },
        { status: 400 }
      );
    }

    const date = parsed.data.date;

    // SQL injection =  Drizzle koristi parametarske upite (eq/and), nema spajanja SQL stringova
    // IDOR =  workDayRecords trazimo samo za ovog usera
    const wdr = await db
      .select({ id: workDayRecords.id })
      .from(workDayRecords)
      .where(
        and(
          eq(workDayRecords.userId, userId),
          eq(workDayRecords.workDate, date as any)
        )
      )
      .limit(1);

    if (!wdr[0]) {
      return NextResponse.json({ activities: [] }, { status: 200 });
    }

    // SQL injection =  parametarski uslov
    const rows = await db
      .select({
        id: activities.id,
        title: activities.title,
        description: activities.description,
        minutesSpent: activities.minutesSpent,
        startTime: activities.startTime,
        endTime: activities.endTime,
      })
      .from(activities)
      .where(eq(activities.workDayId, wdr[0].id))
      .orderBy(activities.startTime);

    return NextResponse.json({ activities: rows }, { status: 200 });
  } catch (e) {
    console.error("GET /api/activities error", e);
    return NextResponse.json({ error: "Greska" }, { status: 500 });
  }
}

// POST body je: { date, title, description?, startTime, endTime }
export async function POST(req: Request) {
  try {
    // [IDOR] Aktivnost se uvek kreira za ulogovanog user-a (userId iz JWT)
    const userId = await getUserIdFromAuthCookie();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    // SQL injection + XSS =  Zod validacija bodyja (format datuma/vremena + duzine stringova)
    const parsed = activitiesCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." },
        { status: 400 }
);
    }

    let startTime = normalizeTime(parsed.data.startTime);
    let endTime = normalizeTime(parsed.data.endTime);

    // input type="time" obično šalje HH:MM -> dodamo :00
    if (startTime.length === 5) startTime = `${startTime}:00`;
    if (endTime.length === 5) endTime = `${endTime}:00`;

    // nađi ili kreiraj work_day_record za tog usera i datum
    const date = parsed.data.date;

    // XSS=  sanitizacija user inputa
    const title = sanitizeText(parsed.data.title);
    const description =
      typeof parsed.data.description === "string" && parsed.data.description.trim() !== ""
        ? sanitizeText(parsed.data.description)
        : null;

    

    // SQL injection =  parametarski upit
    // IDOR =  work_day_record pravimo/koristimo samo za ulogovanog usera
    const existing = await db
      .select({ id: workDayRecords.id })
      .from(workDayRecords)
      .where(
        and(
          eq(workDayRecords.userId, userId),
          eq(workDayRecords.workDate, date as any)
        )
      )
      .limit(1);

    let workDayId: number;

    if (existing[0]) {
      workDayId = existing[0].id;
    } else {
      const inserted = await db
        .insert(workDayRecords)
        .values({
          userId,
          workDate: date as any,
          checkIn: null,
          checkOut: null,
          note: null,
        })
        .returning({ id: workDayRecords.id });

      workDayId = inserted[0].id;
    }

    // SQL injection = insert je parametarski; nema concat string 
    const insertedActivity = await db
      .insert(activities)
      .values({
        workDayId,
        title,
        description,
        // minutesSpent: će ostati default 0 u bazi
        startTime: startTime as any,
        endTime: endTime as any,
      })
      .returning({
        id: activities.id,
        title: activities.title,
        description: activities.description,
        startTime: activities.startTime,
        endTime: activities.endTime,
      });

    return NextResponse.json({ activity: insertedActivity[0] }, { status: 201 });
  } catch (e) {
    console.error("POST /api/activities error", e);
    return NextResponse.json(
      { error: "Greska pri dodavanju aktivnosti" },
      { status: 500 }
    );
  }
}

// DELETE = { ids: number[] }
export async function DELETE(req: Request) {
  try {
    // IDOR =  brisanje dozvoljeno samo ulogovanom useru
    const userId = await getUserIdFromAuthCookie();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    // SQL injection + XSS = zod validacija bodyja (ids moraju biti pozitivni int brojevi)
    const parsed = activitiesDeleteBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." },
        { status: 400 }
      );
    }

    const ids = parsed.data.ids;

    // IDOR =  brisemo samo aktivnosti koje pripadaju ulogovanom useru
    // 1) uzmemo workDayRecords idjeve tog usera
    const myWorkDays = await db
      .select({ id: workDayRecords.id })
      .from(workDayRecords)
      .where(eq(workDayRecords.userId, userId));

    const myWorkDayIds = myWorkDays.map((x) => x.id);

    if (myWorkDayIds.length === 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 2) obrisemo samo aktivnosti koje su: u ids listi i pripadaju nekom od mojih workDayId
    // SQL injection = inArray/and su parametarski uslovi 
    await db
      .delete(activities)
      .where(
        and(
          inArray(activities.id, ids),
          inArray(activities.workDayId, myWorkDayIds)
        )
      );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("DELETE /api/activities error", e);
    return NextResponse.json({ error: "Greska pri brisanju" }, { status: 500 });
  }
}
