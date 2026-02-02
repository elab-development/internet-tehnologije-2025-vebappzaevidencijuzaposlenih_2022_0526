import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/src/db";
import { users } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

// vraca podatke o ulogovanom korisniku na osnovu jwt tokena iz auth cookie-a
export async function GET() { //iplementiramo GET rutu; URL = api/auth/me
  try {
    //uzimamo sve cookije iz zahteva, .get=>trazimo onaj koji se zove auth i uzimamo njegov value tj. JWT string
    const token = (await cookies()).get(AUTH_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 }); //status 200 jer je zahtev ispravan ali nema ulogovanog kor.
    }

    const claims = verifyAuthToken(token); 

    const found = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        roleId: users.roleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, Number(claims.sub))) //number jer je claims.sub string a nama treba id int
      .limit(1);

    const user = found[0];

    if (!user || !user.isActive) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user }, { status: 200 }); //sve ok
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}