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
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST() {
  try {
    //cita se auth cookie
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Niste ulogovani." }, { status: 401 });

    //dekodira se JWT token i vadi se userId
    const claims = verifyAuthToken(token);
    const userId = Number(claims.sub);
    const workDate = todayISO();

    //trazimo zapis za ovog korisnika i danasnji datum
    const existing = await db
      .select({ id: workDayRecords.id, checkIn: workDayRecords.checkIn, checkOut: workDayRecords.checkOut })
      .from(workDayRecords)
      .where(and(eq(workDayRecords.userId, userId), eq(workDayRecords.workDate, workDate)))
      .limit(1);

    //ako nema checkin, ne moze checkout
    if (!existing[0]?.checkIn) {
      return NextResponse.json({ error: "Ne možete check-out pre check-in." }, { status: 409 });
    }

    //ako je vec uradjen checkout ne moze ponovo
    if (existing[0].checkOut) {
      return NextResponse.json({ error: "Check-out je već evidentiran." }, { status: 409 });
    }

    //UPISUJEMO TRENUTNO vreme kao checkout
    const updated = await db
      .update(workDayRecords)
      .set({ checkOut: new Date() })
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


