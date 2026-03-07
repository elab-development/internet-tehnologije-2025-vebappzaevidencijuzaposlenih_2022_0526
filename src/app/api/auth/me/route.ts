import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/src/db";
<<<<<<< HEAD
import { users, roles } from "@/src/db/schema"; // <-- dodaj roles
=======
import { users, roles } from "@/src/db/schema";
>>>>>>> 9164f8a (Dodati automatizovani testovi)
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

// GET- vraca podatke o ulogovanom korisniku
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
<<<<<<< HEAD
        roleName: roles.name,          // <-- ovde
=======
        roleName: roles.name,
>>>>>>> 9164f8a (Dodati automatizovani testovi)
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
<<<<<<< HEAD
      .innerJoin(roles, eq(users.roleId, roles.id)) // <-- join
      .where(eq(users.id, Number(claims.sub)))
=======
      .innerJoin(roles, eq(users.roleId, roles.id))
      // SQL injection = Drizzle eq pravi parametarski upit
      .where(eq(users.id, userId))
>>>>>>> 9164f8a (Dodati automatizovani testovi)
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
