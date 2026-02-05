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

    // pronađi radni dan za tog usera i taj datum
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
      // nema radnog dana => nema aktivnosti
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

// DELETE /api/activities  { ids: number[] }
export async function DELETE(req: Request) {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    verifyAuthToken(token); // ako pukne, baca grešku

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
