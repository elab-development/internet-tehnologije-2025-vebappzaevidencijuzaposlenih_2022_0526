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

  // IDOR = bez validnog JWT nema pristupa (vracamo record null)
  if (!token) return null;

  const claims = verifyAuthToken(token);
  const userId = Number(claims.sub);

  // IDOR = nevalidan userId tretiramo kao da nema ulogovanog
  if (!Number.isInteger(userId) || userId <= 0) return null;

  return userId;
}


/**
 * @swagger
 * /api/attendance/today:
 *   get:
 *     summary: Vraca danasnji attendance zapis ulogovanog korisnika
 *     description: Vraca check-in i check-out podatke za danasnji dan za trenutno ulogovanog korisnika. Ako zapis ne postoji, vraca record kao null.
 *     tags:
 *       - Attendance
 *     responses:
 *       200:
 *         description: Uspesan odgovor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 record:
 *                   nullable: true
 *                   oneOf:
 *                     - type: "null"
 *                     - type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: "15"
 *                         workDate:
 *                           type: string
 *                           example: "2026-03-06"
 *                         checkIn:
 *                           type: string
 *                           format: date-time
 *                         checkOut:
 *                           nullable: true
 *                           oneOf:
 *                             - type: "null"
 *                             - type: string
 *                               format: date-time
 */




// GET 
export async function GET() {
  try {
    const userId = await getUserIdFromAuthCookie();

    // IDOR = ruta nikad ne prihvata userId iz query/body, vec uvek koristi userId iz tokena
    if (!userId) {
      return NextResponse.json({ record: null }, { status: 200 });
    }

    const workDate = todayISO();

    const found = await db
      .select({
        id: workDayRecords.id,
        workDate: workDayRecords.workDate,
        checkIn: workDayRecords.checkIn,
        checkOut: workDayRecords.checkOut,
      })
      .from(workDayRecords)
      // SQL injection = eq/and u Drizzle prave parametrizovan upit 
      // IDOR = filtriramo po userId iz tokena + danasnji datum
      .where(
        and(
          eq(workDayRecords.userId, userId),
          eq(workDayRecords.workDate, workDate as any)
        )
      )
      .limit(1);

    // XSS = vracamo JSON
    return NextResponse.json({ record: found[0] ?? null }, { status: 200 });
  } catch (e) {
    console.error("GET /api/attendance/today error", e);
    return NextResponse.json({ record: null }, { status: 200 });
  }
}