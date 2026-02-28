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

async function getUserIdFromAuthCookie(): Promise<number | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;

  // IDOR = bez validnog JWT nema pristupa
  if (!token) return null;

  const claims = verifyAuthToken(token);
  const userId = Number(claims.sub);

  // IDOR = nevalidan userid tretiramo kao unauthorized
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

    // SQL injection = Drizzle eq/and pravi parametrizovane upite (bez SQL string konkatenacije)
    const existing = await db
      .select({
        id: workDayRecords.id,
        checkIn: workDayRecords.checkIn,
        checkOut: workDayRecords.checkOut,
      })
      .from(workDayRecords)
      // IDOR = trazimo iskljucivo zapis ulogovanog usera za danas
      .where(
        and(
          eq(workDayRecords.userId, userId),
          eq(workDayRecords.workDate, workDate as any)
        )
      )
      .limit(1);

    // ako nema zapisa ili nema checkin, ne moze checkout
    if (!existing[0]?.checkIn) {
      return NextResponse.json(
        { error: "Ne možete check-out pre check-in." },
        { status: 409 }
      );
    }

    // ako je vec uradjen checkout ne moze opet
    if (existing[0].checkOut) {
      return NextResponse.json(
        { error: "Check-out je već evidentiran." },
        { status: 409 }
      );
    }
    const checkIn = existing[0].checkIn;

    const now = new Date();
    // razlika u ms
    const diffMs = now.getTime() - new Date(checkIn).getTime();

    // pretvori u sate
    const hours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));

    const updated = await db
      .update(workDayRecords)
      .set({ checkOut: now,hours: hours, })
      // IDOR = update ogranicavamo na (id + userId) da niko ne moze da updateuje tudji zapis
      .where(and(eq(workDayRecords.id, existing[0].id), eq(workDayRecords.userId, userId)))
      .returning({
        id: workDayRecords.id,
        workDate: workDayRecords.workDate,
        checkIn: workDayRecords.checkIn,
        checkOut: workDayRecords.checkOut,
        hours: workDayRecords.hours,
      });

    if (!updated[0]) {
      return NextResponse.json(
        { error: "Nije moguće evidentirati check-out." },
        { status: 409 }
      );
    }

    // XSS = vracamo JSON (ne renderujemo HTML)
    return NextResponse.json({ record: updated[0] }, { status: 200 });
  } catch (e) {
    console.error("POST /api/attendance/check-out error", e);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}

