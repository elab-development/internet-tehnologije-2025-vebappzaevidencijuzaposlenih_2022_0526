//ova ruta je da bi vratila danasnji checkin, checkout za ulogovanog korisnika


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

export async function GET() {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) return NextResponse.json({ record: null }, { status: 200 });

    const claims = verifyAuthToken(token);
    const userId = Number(claims.sub);
    if (!Number.isFinite(userId)) return NextResponse.json({ record: null }, { status: 200 });

    const workDate = todayISO();

    //trazimo zapis za danas
    const found = await db
      .select({
        id: workDayRecords.id,
        workDate: workDayRecords.workDate,
        checkIn: workDayRecords.checkIn,
        checkOut: workDayRecords.checkOut,
      })
      .from(workDayRecords)
      .where(and(eq(workDayRecords.userId, userId), eq(workDayRecords.workDate, workDate)))
      .limit(1);

    return NextResponse.json({ record: found[0] ?? null }, { status: 200 }); //vracamo ili record ili null
  } catch {
    return NextResponse.json({ record: null }, { status: 200 });
  }
}