import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/src/db";
import { workDayRecords } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";
import { isHoliday } from "@/src/lib/holidays";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getUserIdFromAuthCookie(): Promise<number | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;

  // IDOR = bez validnog JWT nema pristupa
  if (!token) return null;

  const claims = verifyAuthToken(token);
  const userId = Number(claims.sub);

  // IDOR = ako token nema validan userId, onda ga tretiramo kao unauthorized
  if (!Number.isInteger(userId) || userId <= 0) return null;

  return userId;
}

export async function POST() {
  try {
    const userId = await getUserIdFromAuthCookie();
    if (!userId) {
      return NextResponse.json({ error: "Niste ulogovani." }, { status: 401 });
    }


    const workDate = todayISO();

    //provera praznika (backend zastita)
    const holiday = await isHoliday(workDate, "RS");
    if (holiday) {
      return NextResponse.json(
        { error: `Danas je praznik (${holiday.localName}) – check-in nije dozvoljen.` },
        { status: 409 }
      );
    }

    const now = new Date();

    // SQL injection = Drizzle eq/and pravi parametrizovane upite (bez SQL konkatenacije)
    const existing = await db
      .select({
        id: workDayRecords.id,
        checkIn: workDayRecords.checkIn,
        checkOut: workDayRecords.checkOut,
      })
      .from(workDayRecords)
      // IDOR = selektujemo iskljucivo zapis ulogovanog usera za danas
      .where(and(eq(workDayRecords.userId, userId), eq(workDayRecords.workDate, workDate as any)))
      .limit(1);

    // ne moze 2x checkin
    if (existing[0]?.checkIn) {
      return NextResponse.json(
        { error: "Check-in je već evidentiran." },
        { status: 409 }
      );
    }

    // ako nema zapisa, pravimo ga
    if (!existing[0]) {
      const inserted = await db
        .insert(workDayRecords)
        .values({
          userId, // IDOR = zapis je vezan za ulogovanog usera (ne moze za nikoga drugoga)
          workDate: workDate as any,
          hours: 0,
          checkIn: now,
        })
        .returning({
          id: workDayRecords.id,
          workDate: workDayRecords.workDate,
          checkIn: workDayRecords.checkIn,
          checkOut: workDayRecords.checkOut,
        });

      //XSS =  vracamo JSON (ne renderujemo HTML)
      return NextResponse.json({ record: inserted[0] }, { status: 201 });
    }

    // ako zapis postoji ali nema checkIn, updateujemo ga
    const updated = await db
      .update(workDayRecords)
      .set({ checkIn: now })
      // IDOR = update samo zapis koji pripada ulogovanom useru za danas
      .where(and(eq(workDayRecords.id, existing[0].id), eq(workDayRecords.userId, userId)))
      .returning({
        id: workDayRecords.id,
        workDate: workDayRecords.workDate,
        checkIn: workDayRecords.checkIn,
        checkOut: workDayRecords.checkOut,
      });
    if (!updated[0]) {
      return NextResponse.json({ error: "Nije moguće evidentirati check-in." }, { status: 409 });
    }

    // XSS = JSON response
    return NextResponse.json({ record: updated[0] }, { status: 200 });
  } catch (e) {
    console.error("POST /api/attendance/check-in error", e);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
