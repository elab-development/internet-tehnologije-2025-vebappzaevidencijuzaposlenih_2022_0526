import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/src/db";
import { users } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

/**
 * GET /api/admin/users
 * Vraća listu svih korisnika (SAMO ADMIN)
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = verifyAuthToken(token);

    // ko je ulogovan?
    const me = await db
      .select({
        id: users.id,
        roleId: users.roleId,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, Number(claims.sub)))
      .limit(1);

    const currentUser = me[0];

    // ❗ nije admin
    if (!currentUser || currentUser.roleId !== 1) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // admin → uzmi sve korisnike
    const allUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        roleId: users.roleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.id);

    return NextResponse.json({ users: allUsers }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/users error", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Menja rolu korisnika (SAMO ADMIN)
 * body: { userId: number, roleId: number }
 */
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = verifyAuthToken(token);

    // proveri da li je admin
    const me = await db
      .select({ roleId: users.roleId })
      .from(users)
      .where(eq(users.id, Number(claims.sub)))
      .limit(1);

    if (!me[0] || me[0].roleId !== 1) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, roleId } = body ?? {};

    if (!userId || !roleId) {
      return NextResponse.json(
        { error: "userId i roleId su obavezni" },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({ roleId })
      .where(eq(users.id, userId));

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/admin/users error", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
