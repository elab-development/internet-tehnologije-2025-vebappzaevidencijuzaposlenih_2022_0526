import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/src/db";
import { activities, workDayRecords, users } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

//GET api/act?date=YYY-MM-DD
export async function GET(req: Request) {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const claims = verifyAuthToken(token);
    const userId = Number(claims.sub);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    //iz URLa vadimo query parametar date
    const url = new URL(req.url);
    const date = String(url.searchParams.get("date") ?? "").trim(); 
    if (!date) return NextResponse.json({ error: "date je obavezan" }, { status: 400 }); //ako nema date-a ili nije prosledjen

    //nadji work_day_record za tog usera i taj datum
    const wdr = await db
      .select({ id: workDayRecords.id })
      .from(workDayRecords)
      .where(and(eq(workDayRecords.userId, userId), eq(workDayRecords.workDate, date as any)))
      .limit(1);

    //ako ne postoji wdr onda nema ni aktivnosti
    if (!wdr[0]) return NextResponse.json({ activities: [] }, { status: 200 });

    //uzmamo sve aktivnosti za taj wdID
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
  } catch {
    return NextResponse.json({ error: "Greska" }, { status: 500 });
  }
}