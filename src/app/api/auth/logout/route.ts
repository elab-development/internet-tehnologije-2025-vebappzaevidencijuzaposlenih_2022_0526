import { NextResponse } from "next/server";
import { AUTH_COOKIE, cookieOpts } from "@/src/lib/auth";

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Odjava korisnika
 *     description: Brise auth cookie i odjavljuje trenutno ulogovanog korisnika.
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Uspesna odjava
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: "true"
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });

  // brisemo auth cookie
  res.cookies.set(AUTH_COOKIE, "", { ...cookieOpts(), maxAge: 0, expires: new Date(0) });

  return res;
}