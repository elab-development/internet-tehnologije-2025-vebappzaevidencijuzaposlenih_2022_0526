import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "@/src/db";
import { users, roles } from "@/src/db/schema";
import { AUTH_COOKIE, cookieOpts, signAuthToken } from "@/src/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Sva polja su obavezna." },
        { status: 400 }
      );
    }

    // proveravamo da li email vec postoji
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      return NextResponse.json(
        { error: "Email je vec zauzet." },
        { status: 409 }
      );
    }

    // uzimamo EMPLOYEE ulogu
    const role = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "EMPLOYEE"))
      .limit(1);

    if (!role[0]) {
      return NextResponse.json(
        { error: "Uloga EMPLOYEE ne postoji." },
        { status: 500 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // ubacivanje korisnika u bazu
    const inserted = await db
      .insert(users)
      .values({
        fullName,
        email,
        passwordHash,
        isActive: true,
        roleId: role[0].id,
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
      });

    // automatski loginujemo korisnika nakon registracije
    const token = signAuthToken({
      sub: String(inserted[0].id),
      email: inserted[0].email,
      name: inserted[0].fullName,
    });

    const res = NextResponse.json(
      { user: inserted[0] },
      { status: 201 }
    );

    // setujemo auth cookie
    res.cookies.set(AUTH_COOKIE, token, cookieOpts());

    return res;
  } catch {
    return NextResponse.json(
      { error: "Greška prilikom registracije." },
      { status: 500 }
    );
  }
}