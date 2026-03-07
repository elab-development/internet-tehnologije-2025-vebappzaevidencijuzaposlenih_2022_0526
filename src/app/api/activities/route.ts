import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/src/db";
import { activities, workDayRecords } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";
import {
activitiesGetQuerySchema,
activitiesCreateBodySchema,
activitiesDeleteBodySchema,
} from "@/src/lib/validator";
import { isHoliday } from "@/src/lib/holidays";

// "09:00" -> "09:00:00" (kompatibilno sa SQL time)
function normalizeTime(t: string): string {
const s = String(t ?? "").trim();
if (!s) return "";
return s.length === 5 ? `${s}:00` : s;
}

// XSS = trimujemo/normalizujemo tekst pre upisa u bazu
function sanitizeText(value: unknown): string {
return String(value ?? "")
.replace(/\0/g, "")
.replace(/\r?\n/g, " ")
.trim();
}

// minutesSpent = razlika izmedju pocetka i kraja u minutima
function calculateMinutesSpent(startTime: string, endTime: string): number {
const [startH, startM] = startTime.slice(0, 5).split(":").map(Number);
const [endH, endM] = endTime.slice(0, 5).split(":").map(Number);

const startTotal = startH * 60 + startM;
const endTotal = endH * 60 + endM;

return endTotal - startTotal;
}

// IDOR = userId vadimo iskljucivo iz JWT (cookie), necemo iz req
async function getUserIdFromAuthCookie(): Promise<number | null> {
const cookieStore = await cookies();
const token = cookieStore.get(AUTH_COOKIE)?.value;
if (!token) return null;

const claims = verifyAuthToken(token);
const userId = Number(claims.sub);
if (!userId) return null;

return userId;
}
/**
 * @swagger
 * /api/activities:
 *   get:
 *     summary: Vraca aktivnosti ulogovanog korisnika za izabrani datum
 *     description: Na osnovu query parametra date vraca sve aktivnosti korisnika za taj dan.
 *     tags:
 *       - Activities
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-03-06"
 *         description: Datum za koji se vracaju aktivnosti
 *     responses:
 *       200:
 *         description: Uspesno vracene aktivnosti
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: "1"
 *                       title:
 *                         type: string
 *                         example: "Razvoj funkcionalnosti"
 *                       description:
 *                         type: string
 *                         example: "Implementacija zadataka"
 *                       minutesSpent:
 *                         type: integer
 *                         example: "180"
 *                       startTime:
 *                         type: string
 *                         example: "09:00:00"
 *                       endTime:
 *                         type: string
 *                         example: "12:00:00"
 *       400:
 *         description: Neispravan upit
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Greska na serveru
 *
 *   post:
 *     summary: Dodavanje nove aktivnosti
 *     description: Kreira novu aktivnost za ulogovanog korisnika za izabrani datum.
 *     tags:
 *       - Activities
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - title
 *               - startTime
 *               - endTime
 *             properties:
 *               date:
 *                 type: string
 *                 example: "2026-03-06"
 *               title:
 *                 type: string
 *                 example: "Razvoj funkcionalnosti"
 *               description:
 *                 type: string
 *                 example: "Implementacija zadataka"
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "12:00"
 *     responses:
 *       201:
 *         description: Aktivnost uspesno dodata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activity:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: "1"
 *                     title:
 *                       type: string
 *                       example: "Razvoj funkcionalnosti"
 *                     description:
 *                       type: string
 *                       example: "Implementacija zadataka"
 *                     minutesSpent:
 *                       type: integer
 *                       example: "180"
 *                     startTime:
 *                       type: string
 *                       example: "09:00:00"
 *                     endTime:
 *                       type: string
 *                       example: "12:00:00"
 *       400:
 *         description: Neispravan zahtev ili neispravan vremenski opseg
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Dodavanje aktivnosti nije dozvoljeno za praznik
 *       500:
 *         description: Greska pri dodavanju aktivnosti
 *
 *   delete:
 *     summary: Brisanje aktivnosti
*     description: Brise jednu ili vise aktivnosti koje pripadaju ulogovanom korisniku.
 *     tags:
 *       - Activities
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: "[1, 2]"
 *     responses:
 *       200:
 *         description: Aktivnosti uspesno obrisane
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: "true"
 *       400:
 *         description: Neispravan zahtev
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Greska pri brisanju aktivnosti
 */


export async function GET(req: Request) {
try {
// IDOR = ulogovan user sme da vidi SVOJE aktivnosti
const userId = await getUserIdFromAuthCookie();
if (!userId) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const url = new URL(req.url);

// SQL injection + XSS = zod validacija query parametara
const parsed = activitiesGetQuerySchema.safeParse({
date: url.searchParams.get("date"),
});

if (!parsed.success) {
return NextResponse.json(
{ error: parsed.error.issues[0]?.message ?? "Neispravan upit." },
{ status: 400 }
);
}

const date = parsed.data.date;

// SQL injection = Drizzle koristi parametarske upite
// IDOR = workDayRecords trazimo samo za ovog usera
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


export async function POST(req: Request) {
try {
// IDOR = aktivnost se uvek kreira za ulogovanog usera
const userId = await getUserIdFromAuthCookie();
if (!userId) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const body = await req.json().catch(() => null);

// SQL injection + XSS = Zod validacija bodyja
const parsed = activitiesCreateBodySchema.safeParse(body);
if (!parsed.success) {
return NextResponse.json(
{ error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." },
{ status: 400 }
);
}

const date = parsed.data.date;

const holiday = await isHoliday(date, "RS");
if (holiday) {
return NextResponse.json(
{
error: `Izabrani datum je praznik (${holiday.localName}) - dodavanje aktivnosti nije dozvoljeno.`,
},
{ status: 409 }
);
}

// XSS = sanitizacija user inputa
const title = sanitizeText(parsed.data.title);
const description =
typeof parsed.data.description === "string" &&
parsed.data.description.trim() !== ""
? sanitizeText(parsed.data.description)
: null;

let startTime = normalizeTime(parsed.data.startTime);
let endTime = normalizeTime(parsed.data.endTime);

// input type="time" obicno salje HH:MM -> dodamo :00
if (startTime.length === 5) startTime = `${startTime}:00`;
if (endTime.length === 5) endTime = `${endTime}:00`;

const minutesSpent = calculateMinutesSpent(startTime, endTime);

if (minutesSpent <= 0) {
return NextResponse.json(
{ error: "Vreme zavrsetka mora biti posle vremena pocetka." },
{ status: 400 }
);
}

// SQL injection = parametarski upit
// IDOR = work_day_record pravimo/koristimo samo za ulogovanog usera
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
hours: 0,
note: null,
})
.returning({ id: workDayRecords.id });

workDayId = inserted[0].id;
}

// SQL injection = insert je parametarski
const insertedActivity = await db
.insert(activities)
.values({
workDayId,
title,
description,
minutesSpent,
startTime: startTime as any,
endTime: endTime as any,
})
.returning({
id: activities.id,
title: activities.title,
description: activities.description,
minutesSpent: activities.minutesSpent,
startTime: activities.startTime,
endTime: activities.endTime,
});

return NextResponse.json({ activity: insertedActivity[0] }, { status: 201 });
} catch (e) {
console.error("POST /api/activities error", e);
return NextResponse.json(
{ error: "Greska pri dodavanju aktivnosti" },
{ status: 500 }
);
}
}

export async function DELETE(req: Request) {
try {
// IDOR = brisanje dozvoljeno samo ulogovanom useru
const userId = await getUserIdFromAuthCookie();
if (!userId) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const body = await req.json().catch(() => null);

// SQL injection + XSS = zod validacija bodyja
const parsed = activitiesDeleteBodySchema.safeParse(body);
if (!parsed.success) {
return NextResponse.json(
{ error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." },
{ status: 400 }
);
}

const ids = parsed.data.ids;

// IDOR = brisemo samo aktivnosti koje pripadaju ulogovanom useru
const myWorkDays = await db
.select({ id: workDayRecords.id })
.from(workDayRecords)
.where(eq(workDayRecords.userId, userId));

const myWorkDayIds = myWorkDays.map((x) => x.id);

if (myWorkDayIds.length === 0) {
return NextResponse.json({ ok: true }, { status: 200 });
}

// SQL injection = inArray/and su parametarski uslovi
await db
.delete(activities)
.where(
and(
inArray(activities.id, ids),
inArray(activities.workDayId, myWorkDayIds)
)
);

return NextResponse.json({ ok: true }, { status: 200 });
} catch (e) {
console.error("DELETE /api/activities error", e);
return NextResponse.json(
{ error: "Greska pri brisanju aktivnosti" },
{ status: 500 }
);
}
}
