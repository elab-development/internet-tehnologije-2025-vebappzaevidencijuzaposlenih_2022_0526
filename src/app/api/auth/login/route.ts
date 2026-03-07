import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "@/src/db";
import { users } from "@/src/db/schema";
import { AUTH_COOKIE, cookieOpts, signAuthToken } from "@/src/lib/auth";
import { authLoginBodySchema } from "@/src/lib/validator";

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Prijava korisnika
 *     description: Prijavljuje korisnika na sistem i postavlja auth cookie.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: zorana@gmail.com
 *               password:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Uspesna prijava
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 2
 *                 email:
 *                   type: string
 *                   example: zorana@gmail.com
 *                 fullName:
 *                   type: string
 *                   example: Zorana Kostic
 *                 roleId:
 *                   type: integer
 *                   example: 2
 *       400:
 *         description: Neispravan zahtev
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Neispravan zahtev.
 *       401:
 *         description: Pogresni kredencijali
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Pogrešni kredencijali.
 *       500:
 *         description: Greska prilikom logina
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Greška prilikom logina.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    // SQL injection = validacija inputa pre rada sa bazom
    const parsed = authLoginBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;

    // SQL injection = Drizzle eq kreira se parametrizovan upit (bez SQL string konkatenacije)
    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = found[0];

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Pogrešni kredencijali." }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Pogrešni kredencijali." }, { status: 401 });
    }

    const token = signAuthToken({
      sub: String(user.id),
      email: user.email,
      name: user.fullName,
      roleId: user.roleId,
    });

    const res = NextResponse.json(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleId: user.roleId,
      },
      { status: 200 }
    );

    // XSS = httpOnly cookie, JS na klijentu ne moze da ga procita/ukrade
    res.cookies.set(AUTH_COOKIE, token, cookieOpts());

    return res;
  } catch (e) {
    console.error("POST /api/auth/login error", e);
    return NextResponse.json({ error: "Greška prilikom logina." }, { status: 500 });
  }
}
