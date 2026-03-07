// src/app/api/admin/activities/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/src/db";
import { activities, workDayRecords, users, userGroups } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";
import {
  adminActivitiesCreateBodySchema,
  adminActivitiesPatchBodySchema,
  activitiesDeleteBodySchema,
  dateSchema,
} from "@/src/lib/validator";

// 09:00 prabcujemo u 09:00:00 (da bi bilo kompatibilno sa SQL time)
function normalizeTime(t: string): string {
  const s = String(t ?? "").trim();
  if (!s) return "";
  return s.length === 5 ? `${s}:00` : s;
}

// ADMIN ili MENADZER (roleId 1 ili 2) + mora biti aktivan
async function requireAdminOrManager() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) {
    return { error: "Unauthorized" as const, status: 401 as const };
  }

  const claims = verifyAuthToken(token);

  const me = await db
    .select({ id: users.id, roleId: users.roleId, isActive: users.isActive })
    .from(users)
    // [SQLi] Drizzle koristi parametre, ne spaja SQL string
    .where(eq(users.id, Number(claims.sub)))
    .limit(1);

  const currentUser = me[0];

  // IDOR = blokiramo neaktivne naloge (ne smeju nista da rade)
  if (!currentUser || !currentUser.isActive) {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  // IDOR RBAC: samo ADMIN (1) ili MENADZER (2) 
  if (currentUser.roleId !== 1 && currentUser.roleId !== 2) {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  return { currentUser };
}

// MENADZER sme samo nad zaposlenim koji deli bar jednu grupu sa njim
async function managerCanAccessUser(managerId: number, employeeId: number) {
  // IDOR = menadzer sme samo nad svojim timom 

  const mgrGroups = await db
    .select({ groupId: userGroups.groupId })
    .from(userGroups)
    // SQL injection = parametarski upit
    .where(eq(userGroups.userId, managerId));

  const groupIds = mgrGroups.map((g) => g.groupId);
  if (groupIds.length === 0) return false;

  const shared = await db
    .select({ ok: users.id })
    .from(userGroups)
    .innerJoin(users, eq(users.id, userGroups.userId))
    .where(
      and(
        // SQL injection = parametarski upit + inArray
        eq(userGroups.userId, employeeId),
        inArray(userGroups.groupId, groupIds),
        eq(users.isActive, true),
        eq(users.roleId, 3) // zaposleni
      )
    )
    .limit(1);

  return Boolean(shared[0]);
}

/**
 * @swagger
 * /api/admin/activities:
 *   get:
 *     summary: Vraca aktivnosti za izabranog korisnika i datum
 *     description: Admin ili menadzer vraca aktivnosti za odredjenog zaposlenog i odredjeni datum. Menadzer moze samo nad clanovima svog tima.
 *     tags:
 *       - Admin Activities
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           example: "3"
 *         description: ID korisnika
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
 *                         example: "11"
 *                       title:
 *                         type: string
 *                         example: "Razvoj funkcionalnosti"
 *                       description:
 *                         nullable: true
 *                         oneOf:
 *                           - type: "null"
 *                           - type: string
 *                             example: "Implementacija zadataka"
 *                       startTime:
 *                         type: string
 *                         example: "09:00:00"
 *                       endTime:
 *                         type: string
 *                         example: "12:00:00"
 *       400:
 *         description: Neispravan zahtev
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Greska pri ucitavanju aktivnosti
 *
 *   post:
 *     summary: Dodaje aktivnost zaposlenom
 *     description: Admin ili menadzer dodaje aktivnost zaposlenom za izabrani datum. Menadzer moze samo zaposlenom iz svog tima.
 *     tags:
 *       - Admin Activities
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - date
 *               - title
 *               - startTime
 *               - endTime
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: "3"
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
 *                       example: "11"
 *                     title:
 *                       type: string
 *                       example: "Razvoj funkcionalnosti"
 *                     description:
 *                       nullable: true
 *                       oneOf:
 *                         - type: "null"
 *                         - type: string
 *                           example: "Implementacija zadataka"
 *                     startTime:
 *                       type: string
*                       example: "09:00:00"
 *                     endTime:
 *                       type: string
 *                       example: "12:00:00"
 *       400:
 *         description: Neispravan zahtev
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Greska pri dodavanju aktivnosti
 *
 *   patch:
 *     summary: Menja aktivnost
 *     description: Samo admin moze da menja postojecu aktivnost.
 *     tags:
 *       - Admin Activities
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 example: "11"
 *               title:
 *                 type: string
 *                 example: "Izmenjen naslov aktivnosti"
 *               description:
 *                 nullable: true
 *                 oneOf:
 *                   - type: "null"
 *                   - type: string
 *                     example: "Izmenjen opis"
 *               startTime:
 *                 type: string
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 example: "13:00"
 *     responses:
 *       200:
 *         description: Aktivnost uspesno izmenjena
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
 *                       example: "11"
 *                     title:
 *                       type: string
 *                       example: "Izmenjen naslov aktivnosti"
 *                     description:
 *                       nullable: true
 *                       oneOf:
 *                         - type: "null"
 *                         - type: string
 *                           example: "Izmenjen opis"
 *                     startTime:
 *                       type: string
 *                       example: "10:00:00"
 *                     endTime:
 *                       type: string
 *                       example: "13:00:00"
 *       400:
 *         description: Neispravan zahtev
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Aktivnost nije pronadjena
 *       500:
 *         description: Greska pri izmeni aktivnosti
 *
 *   delete:
 *     summary: Brise aktivnosti
 *     description: Samo admin moze da obrise jednu ili vise aktivnosti.
 *     tags:
 *       - Admin Activities
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
 *                 example: "[11, 12]"
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
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Greska pri brisanju aktivnosti
 */


// GET /api/admin/activities?userId=3&date=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const userId = Number(url.searchParams.get("userId") ?? 0);
    const dateRaw = String(url.searchParams.get("date") ?? "").trim();

    // XSS = validacija inputa (ne pustamo proizvoljan tekst u bazu)
    if (!userId || !dateRaw) {
      return NextResponse.json(
        { error: "userId i date su obavezni" },
        { status: 400 }
      );
    }

    // XSS = zod validacija datuma (format + realan datum)
    const dateParsed = dateSchema.safeParse(dateRaw);
    if (!dateParsed.success) {
      return NextResponse.json(
        { error: dateParsed.error.issues[0]?.message ?? "Neispravan datum." },
        { status: 400 }
      );
    }
    const date = dateParsed.data;

    // IDOR = menadzer sme samo nad svojim timom
    if (auth.currentUser.roleId === 2) {
      const ok = await managerCanAccessUser(auth.currentUser.id, userId);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const wdr = await db
      .select({ id: workDayRecords.id })
      .from(workDayRecords)
      // SQL injection =  parametarski uslovi (eq/and)
      .where(
        and(
          eq(workDayRecords.userId, userId),
          eq(workDayRecords.workDate, date as any)
        )
      )
      .limit(1);

    if (!wdr[0]) {
      // XSS = vraćamo JSON (ne renderujemo HTML)
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
      // SQL Injection = parametarski where
      .where(eq(activities.workDayId, wdr[0].id))
      .orderBy(activities.startTime);

    // XSS = vraćamo JSON (ne renderujemo HTML)
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
export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrManager();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);

    // XSS = zod validacija bodyja (tipovi, duzine, format)
    const parsed = adminActivitiesCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." },
        { status: 400 }
      );
    }

    const userId = parsed.data.userId;
    const date = parsed.data.date;

    // ZSS = normalizacija teksta (trim + null ako je prazan opis)
    const title = parsed.data.title.trim();
    const description =
      typeof parsed.data.description === "string" &&
        parsed.data.description.trim() !== ""
        ? parsed.data.description.trim()
        : null;

    const startTime = normalizeTime(parsed.data.startTime);
    const endTime = normalizeTime(parsed.data.endTime);

    // IDOR = menadzer sme samo nad svojim timom
    if (auth.currentUser.roleId === 2) {
      const ok = await managerCanAccessUser(auth.currentUser.id, userId);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const existing = await db
      .select({ id: workDayRecords.id })
      .from(workDayRecords)
      // SQL Injection =  parametarski uslovi
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
        // SQL Injection = insert kroz ORM (parametarski)
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

    const insertedActivity = await db
      .insert(activities)
      // SQL Injection = insert kroz ORM (parametarski)
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

    // XSS = vraćamo JSON (ne renderujemo HTML)
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

// PATCH (sme samo ADMIN)
export async function PATCH(req: Request) {
  try {
    const auth = await requireAdminOrManager();
    if ("error" in auth) {
      return NextResponse.json({
        error: auth.
          error
      }, { status: auth.status });
    }

    //IDOR = samo ADMIN sme da menja aktivnosti
    if (auth.currentUser.roleId !== 1) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);

    // XSS =  zod validacija patch bodyja
    const parsed = adminActivitiesPatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

    // XSS =  setujemo samo validna polja
    const updates: Record<string, any> = {};

    if (parsed.data.title !== undefined) {
      const t = parsed.data.title.trim();
      if (t) updates.title = t;
    }

    if (parsed.data.description !== undefined) {
      const d = parsed.data.description;
      if (d === null) updates.description = null;
      else updates.description = d.trim() === "" ? null : d.trim();
    }

    if (parsed.data.startTime !== undefined) {
      const s = normalizeTime(parsed.data.startTime);
      if (s) updates.startTime = s as any;
    }

    if (parsed.data.endTime !== undefined) {
      const e = normalizeTime(parsed.data.endTime);
      if (e) updates.endTime = e as any;
    }

    const updated = await db
      .update(activities)
      // SQL injecition =  update kroz ORM (parametarski)
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

    // XSS = vraćamo JSON (ne renderujemo HTML)
    return NextResponse.json({ activity: updated[0] }, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/admin/activities error", e);
    return NextResponse.json(
      { error: "Greška pri izmeni aktivnosti" },
      { status: 500 }
    );
  }
}

// DELETE  (sme samo ADMIN)
export async function DELETE(req: Request) {
  try {
    const auth = await requireAdminOrManager();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // IDOR = samo ADMIN sme da brise aktivnosti
    if (auth.currentUser.roleId !== 1) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);

    // XSS =  Zod validacija body-ja (ids mora biti niz pozitivnih int)
    const parsed = activitiesDeleteBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." },
        { status: 400 }
      );
    }

    const ids = parsed.data.ids;

    await db
      .delete(activities)
      // SQL injection =  delete kroz ORM (parametarski + inArray)
      .where(inArray(activities.id, ids));

    // XSS =  vracamo JSON
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("DELETE /api/admin/activities error", e);
    return NextResponse.json(
      { error: "Greška pri brisanju aktivnosti" },
      { status: 500 }
    );
  }
}
