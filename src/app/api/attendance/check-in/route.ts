import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/src/db";
import { workDayRecords } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`
};

export async function POST() {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Niste ulogovani." }, { status: 401 });

    const claims = verifyAuthToken(token);
    const userId = Number(claims.sub);
    const workDate = todayISO();

    //da li vec postoji zapis danas??
    const existing = await db
      .select({ id: workDayRecords.id, checkIn: workDayRecords.checkIn, checkOut: workDayRecords.checkOut })
      .from(workDayRecords)
      .where(and(eq(workDayRecords.userId, userId), eq(workDayRecords.workDate, workDate)))
      .limit(1);

    //ne moze 2x checkin
    if (existing[0]?.checkIn) {
      return NextResponse.json({ error: "Check-in je već evidentiran." }, { status: 409 });
    }

    const now = new Date();

    // ako nema zapisa, pravimo ga
    if (!existing[0]) {
      const inserted = await db
        .insert(workDayRecords)
        .values({
          userId,
          workDate,
          checkIn: now,
        })
        .returning({
          id: workDayRecords.id,
          workDate: workDayRecords.workDate,
          checkIn: workDayRecords.checkIn,
          checkOut: workDayRecords.checkOut,
        });

      return NextResponse.json({ record: inserted[0] }, { status: 201 });
    }

    //ako zapis postoji ali nema checkIn, updateujemo ga
    const updated = await db
      .update(workDayRecords)
      .set({ checkIn: now })
      .where(eq(workDayRecords.id, existing[0].id))
      .returning({
        id: workDayRecords.id,
        workDate: workDayRecords.workDate,
        checkIn: workDayRecords.checkIn,
        checkOut: workDayRecords.checkOut,
      });

    return NextResponse.json({ record: updated[0] }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}



