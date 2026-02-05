import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/src/db";
import { users, roles } from "@/src/db/schema"; // <-- dodaj roles
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

// vraca podatke o ulogovanom korisniku na osnovu jwt tokena iz auth cookie-a
export async function GET() {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const claims = verifyAuthToken(token);

    const found = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        roleId: users.roleId,
        roleName: roles.name,          // <-- ovde
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id)) // <-- join
      .where(eq(users.id, Number(claims.sub)))
      .limit(1);

    const user = found[0];

    if (!user || !user.isActive) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
