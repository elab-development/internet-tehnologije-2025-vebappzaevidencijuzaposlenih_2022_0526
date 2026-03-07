import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/src/db";
import { users, roles } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Podaci o ulogovanom korisniku
 *     description: Vraca podatke o trenutno ulogovanom korisniku na osnovu auth cookie-ja. Ako korisnik nije ulogovan ili nije aktivan, vraca user kao null.
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Uspesan odgovor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   nullable: true
 *                   oneOf:
 *                     - type: "null"
 *                     - type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: "2"
 *                         fullName:
 *                           type: string
 *                           example: "Zorana Kostic"
 *                         email:
 *                           type: string
 *                           example: "zorana@gmail.com"
 *                         roleId:
 *                           type: integer
 *                           example: "2"
 *                         roleName:
 *                           type: string
 *                           example: "MANAGER"
 *                         isActive:
 *                           type: boolean
 *                           example: "true"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;

    // IDOR = ako nema tokena, nema ni korisnika
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const claims = verifyAuthToken(token);

    const userId = Number(claims.sub);

    // IDOR = Ako token nema validan ID onda tretiramo kao da nema usera
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const found = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        roleId: users.roleId,
        roleName: roles.name,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      // SQL injection = Drizzle eq pravi parametarski upit
      .where(eq(users.id, userId))
      .limit(1);

    const user = found[0];

    // IDOR = ako user ne postoji ili nije aktivan, vracamo null
    if (!user || !user.isActive) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // XSS = vracamo JSON, ne renderujemo HTML
    return NextResponse.json({ user }, { status: 200 });
  } catch {
    // u slucaju bilo kakve greske ne odajemo detalje
    return NextResponse.json({ user: null }, { status: 200 });
  }
}