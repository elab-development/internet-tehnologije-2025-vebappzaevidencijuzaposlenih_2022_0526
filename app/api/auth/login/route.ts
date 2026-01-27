import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "@/src/db";
import { users } from "@/src/db/schema";
import { AUTH_COOKIE, cookieOpts, signAuthToken } from "@/src/lib/auth";

//login korisnika
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email i lozinka su obavezni." }, { status: 400 });
    }
//trazimo korisnika po email-u
    const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = found[0];
//ako korisnik ne postoji ili nije vise zaposlen 
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Pogrešni kredencijali." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Pogrešni kredencijali." }, { status: 401 });
    }
//kreiramo JWT token
    const token = signAuthToken({
      sub: String(user.id),
      email: user.email,
      name: user.fullName,
    });

    const res = NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleId: user.roleId,
    });
//upisali smo token u cookie
    res.cookies.set(AUTH_COOKIE, token, cookieOpts());
    return res;
  } catch {
    return NextResponse.json({ error: "Greška prilikom logina." }, { status: 500 });
  }
}