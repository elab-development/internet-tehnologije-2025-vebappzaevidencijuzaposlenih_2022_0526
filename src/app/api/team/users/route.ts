import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/src/db";
import { users, userGroups } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

/**
 * @swagger
 * /api/team/users:
 *   get:
 *     summary: Lista clanova tima menadzera
 *     description: Vraca sve aktivne zaposlene koji pripadaju grupama ulogovanog menadzera.
 *     tags:
 *       - Team
 *     responses:
 *       200:
 *         description: Uspesno vracena lista clanova tima
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 3
 *                       fullName:
 *                         type: string
 *                         example: Andjela Kandic
 *                       email:
 *                         type: string
 *                         example: andjela@gmail.com
 *                       roleId:
 *                         type: integer
 *                         example: 3
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       403:
 *         description: Forbidden - samo menadzer ima pristup
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Forbidden
 *       500:
 *         description: Greska pri ucitavanju clanova tima
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Greška pri učitavanju članova tima
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;

    // IDOR =  bez validnog JWT tokena nema pristupa
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = verifyAuthToken(token);
    const managerId = Number(claims.sub);

    // console.log("TEAM USERS claims:", claims);
    // console.log("TEAM USERS managerId:", managerId);


    // IDOR = ako token nema validan userId
    if (!managerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1) proveri da li je ulogovani user MENADZER (roleId=2) i aktivan
    const me = await db
      .select({
        id: users.id,
        roleId: users.roleId,
        isActive: users.isActive,
      })
      // SQL injection =  Drizzle eq pravi parametarski upit (bez SQL string konkatenacije)
      .from(users)
      .where(eq(users.id, managerId))
      .limit(1);

    const currentUser = me[0];
  //  console.log("TEAM USERS currentUser:", currentUser);


    // IDOR / RBAC = samo aktivan menadzer sme da vidi listu tima
    if (!currentUser || currentUser.roleId!==2) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) koje grupe ima ovaj menadzer
    const myGroups = await db
      .select({ groupId: userGroups.groupId })
      .from(userGroups)
      // SQL injection = parametarski where
      .where(eq(userGroups.userId, managerId));

    const groupIds = myGroups.map((g) => g.groupId);

  //  console.log("TEAM USERS groupIds:", groupIds);

    if (groupIds.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }
  // 3) svi zaposleni koji su u tim grupama
    const members = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        roleId: users.roleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(userGroups, eq(users.id, userGroups.userId))
      .where(
        and(
          // SQL injection = inArray je parametarski (bez string konkatenacije)
          inArray(userGroups.groupId, groupIds),
          eq(users.isActive, true),
          eq(users.roleId, 3) // samo zaposleni
        )
      )
      .orderBy(users.fullName);

    // XSS = Vracamo JSON (ne renderujemo HTML)
    return NextResponse.json({ users: members }, { status: 200 });
  } catch (e) {
    console.error("GET /api/team/users error", e);
    return NextResponse.json(
      { error: "Greška pri učitavanju članova tima" },
      { status: 500 }
    );
  }
}