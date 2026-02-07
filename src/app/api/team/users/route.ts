
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/src/db";
import { users, userGroups } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claims = verifyAuthToken(token);
    const managerId = Number(claims.sub);

    // 1) proveri da li je ulogovani user MENADŽER (roleId = 2)
    const me = await db
      .select({
        id: users.id,
        roleId: users.roleId,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, managerId))
      .limit(1);

    const currentUser = me[0];
    if (!currentUser|| currentUser.roleId !== 2 || !currentUser.isActive) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) koje grupe ima ovaj menadžer?
    const myGroups = await db
      .select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(eq(userGroups.userId, managerId));

    const groupIds = myGroups.map((g) => g.groupId);
    if (groupIds.length === 0) {
      // nema grupa → nema tima
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    // 3) svi korisnici koji su u tim grupama (osim menadžera),
    // po želji filtriramo na roleId = 3 (Zaposleni)
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
          inArray(userGroups.groupId, groupIds),
          eq(users.isActive, true),
          eq(users.roleId, 3),         // samo zaposleni
        )
      )
      .orderBy(users.fullName);

    return NextResponse.json({ users: members }, { status: 200 });
  } catch (e) {
    console.error("GET /api/team/users error", e);
    return NextResponse.json(
      { error: "Greška pri učitavanju članova tima" },
      { status: 500 }
    );
  }
}