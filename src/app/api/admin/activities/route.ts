// src/app/api/admin/activities/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/src/db";
import { activities, workDayRecords, users } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

// proveravamo da li je trenutni user ADMIN ili MENADZER
async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) {
    return { error: "Unauthorized" as const, status: 401 as const };
  }

  const claims = verifyAuthToken(token);

  const me = await db
    .select({ id: users.id, roleId: users.roleId })
    .from(users)
    .where(eq(users.id, Number(claims.sub)))
    .limit(1);

  const currentUser = me[0];

  if (!currentUser || (currentUser.roleId !== 1 && currentUser.roleId !== 2)) {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  return { currentUser };
}

// GET /api/admin/activities?userId=3&date=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const adminCheck = await requireAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const url = new URL(req.url);
    const userId = Number(url.searchParams.get("userId") ?? 0);
    const date = String(url.searchParams.get("date") ?? "").trim();

    if (!userId || !date) {
      return NextResponse.json(
        { error: "userId i date su obavezni" },
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
        startTime: activities.startTime,
        endTime: activities.endTime,
      })
      .from(activities)
      .where(eq(activities.workDayId, wdr[0].id))
      .orderBy(activities.startTime);

    return NextResponse.json({ activities: rows }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/activities error", e);
    return NextResponse.json(
      { error: "Greška pri učitavanju aktivnosti" },
      { status: 500 }
    );
  }
}

// POST /api/admin/activities
// body: { userId, date, title, description?, startTime, endTime }
export async function POST(req: Request) {
  try {
    const adminCheck = await requireAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const body = await req.json().catch(() => null);

    const userId = Number(body?.userId ?? 0);
    const date = String(body?.date ?? "").trim();
    const title = String(body?.title ?? "").trim();
    const description =
      typeof body?.description === "string" && body.description.trim() !== ""
        ? body.description.trim()
        : null;
    let startTime = String(body?.startTime ?? "").trim();
    let endTime = String(body?.endTime ?? "").trim();

    if (!userId || !date || !title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "userId, date, title, startTime i endTime su obavezni" },
        { status: 400 }
      );
    }

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

    return NextResponse.json(
      { activity: insertedActivity[0] },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/admin/activities error", e);
    return NextResponse.json(
      { error: "Greška pri dodavanju aktivnosti" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/activities
// body: { id, title?, description?, startTime?, endTime? }
export async function PATCH(req: Request) {
  try {
    const adminCheck = await requireAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const body = await req.json().catch(() => null);
    const id = Number(body?.id ?? 0);

    if (!id) {
      return NextResponse.json(
        { error: "id je obavezan" },
        { status: 400 }
      );
    }

    const updates: any = {};

    if (typeof body?.title === "string") {
      const t = body.title.trim();
      if (t) updates.title = t;
    }

    if (typeof body?.description === "string") {
      const d = body.description.trim();
      updates.description = d === "" ? null : d;
    }

    if (typeof body?.startTime === "string") {
      let s = body.startTime.trim();
      if (s.length === 5) s = `${s}:00`;
      updates.startTime = s as any;
    }

    if (typeof body?.endTime === "string") {
      let e = body.endTime.trim();
      if (e.length === 5) e = `${e}:00`;
      updates.endTime = e as any;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nema polja za izmenu" },
        { status: 400 }
      );
    }

    const updated = await db
      .update(activities)
      .set(updates)
      .where(eq(activities.id, id))
      .returning({
        id: activities.id,
        title: activities.title,
        description: activities.description,
        startTime: activities.startTime,
        endTime: activities.endTime,
      });

    if (!updated[0]) {
      return NextResponse.json(
        { error: "Aktivnost nije pronađena" },
        { status: 404 }
      );
    }

    return NextResponse.json({ activity: updated[0] }, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/admin/activities error", e);
    return NextResponse.json(
      { error: "Greška pri izmeni aktivnosti" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/activities
// body: { ids: number[] }
export async function DELETE(req: Request) {
  try {
    const adminCheck = await requireAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

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
    console.error("DELETE /api/admin/activities error", e);
    return NextResponse.json(
      { error: "Greška pri brisanju aktivnosti" },
      { status: 500 }
    );
  }
}
