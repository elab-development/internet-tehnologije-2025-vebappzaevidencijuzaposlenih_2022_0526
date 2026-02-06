// src/app/api/activities/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/src/db";
import { activities, workDayRecords } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

// GET /api/activities?date=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = verifyAuthToken(token);
    const userId = Number(claims.sub);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const date = String(url.searchParams.get("date") ?? "").trim();
    if (!date) {
      return NextResponse.json(
        { error: "date je obavezan" },
        { status: 400 }
      );
    }

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

// POST /api/activities  { date, title, description?, startTime, endTime }
export async function POST(req: Request) {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = verifyAuthToken(token);
    const userId = Number(claims.sub);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const date = String(body?.date ?? "").trim();
    const title = String(body?.title ?? "").trim();
    const description =
      typeof body?.description === "string" && body.description.trim() !== ""
        ? body.description.trim()
        : null;
    let startTime = String(body?.startTime ?? "").trim();
    let endTime = String(body?.endTime ?? "").trim();

    if (!date || !title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "date, title, startTime i endTime su obavezni" },
        { status: 400 }
      );
    }

    // input type="time" obično šalje HH:MM -> dodamo :00
    if (startTime.length === 5) startTime = `${startTime}:00`;
    if (endTime.length === 5) endTime = `${endTime}:00`;

    // nađi ili kreiraj work_day_record za tog usera i datum
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

    const activity = insertedActivity[0];

    return NextResponse.json({ activity }, { status: 201 });
  } catch (e) {
    console.error("POST /api/activities error", e);
    return NextResponse.json(
      { error: "Greska pri dodavanju aktivnosti" },
      { status: 500 }
    );
  }
}

// DELETE /api/activities  { ids: number[] }
export async function DELETE(req: Request) {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    verifyAuthToken(token);

    const body = await req.json().catch(() => null);
    const ids = (body?.ids ?? []) as number[];

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Lista id-jeva je obavezna" },
        { status: 400 }
      );
    }

    await db.delete(activities).where(inArray(activities.id, ids));

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("DELETE /api/activities error", e);
    return NextResponse.json(
      { error: "Greska pri brisanju" },
      { status: 500 }
    );
  }
}
