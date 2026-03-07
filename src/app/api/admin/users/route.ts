// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db } from "@/src/db";
import { users } from "@/src/db/schema";
import { AUTH_COOKIE, verifyAuthToken } from "@/src/lib/auth";
import { z } from "zod";

//  VALIDACIJA (SQL injection i XSS)
// SQL injection + XSS = ZOD validacija ogranicava tipove, duzine, normalizuje inpute
const adminUserCreateSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(6).max(200),
  roleId: z.number().int().positive(),
});

const adminUserPatchSchema = z.object({
  userId: z.number().int().positive(),
  roleId: z.number().int().positive(),
});

const adminUserDeleteSchema = z.object({
  userId: z.number().int().positive(),
});

// XSS = ciscenje teksta pre upisa u bazu 
function sanitizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/\0/g, "")
    .replace(/\r?\n/g, " ")
    .trim();
}

// IDOR = identitet uzimamo samo iz JWT cookie-ja (ne iz body/query)
async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) {
    return { error: "Unauthorized" as const, status: 401 as const };
  }

  const claims = verifyAuthToken(token);
  const adminId = Number(claims.sub);
  if (!adminId) {
    return { error: "Unauthorized" as const, status: 401 as const };
  }

  const me = await db
    .select({ id: users.id, roleId: users.roleId, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  const currentUser = me[0];

  // IDOR / RBAC =  samo admin (roleId=1) i mora biti aktivan
  if (!currentUser || !currentUser.isActive || currentUser.roleId !== 1) {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  return { currentUser };
}

// GET
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

<<<<<<< HEAD
    const claims = verifyAuthToken(token);

    // ko je ulogovan proveravamoo
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

    // nije admin
    if (!currentUser || currentUser.roleId !== 1) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // admin → uzmi sve korisnike
=======
    // SQL injection =  Drizzle parametarski upiti; nema SQL konkatenacije
>>>>>>> 9164f8a (Dodati automatizovani testovi)
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
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

//PATCH
export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);

    // SQL injection + XSS = validacija inputa
    const parsed = adminUserPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." },
        { status: 400 }
      );
    }

    const { userId, roleId } = parsed.data;

    // IDOR = zabranjujemo da sam sebi menja ulogu
    if (userId === auth.currentUser.id) {
      return NextResponse.json(
        { error: "Ne možete menjati sopstvenu ulogu" },
        { status: 400 }
      );
    }

    //  dozvoli samo roleId = 1, 2, 3
    if (![1, 2, 3].includes(roleId)) {
      return NextResponse.json({ error: "Neispravna uloga." }, { status: 400 });
    }
    const updated = await db
      .update(users)
      .set({ roleId })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (!updated[0]) {
      return NextResponse.json({ error: "Korisnik nije pronađen." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/admin/users error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

//POST
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);

    // SQL injection + XSS = validacija inputa 
    const parsed = adminUserCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." },
        { status: 400 }
      );
    }

    const fullName = sanitizeText(parsed.data.fullName); // XSS
    const email = parsed.data.email; // trim+lower+email kroz zod
    const password = parsed.data.password;
    const roleId = parsed.data.roleId;

    if (![1, 2, 3].includes(roleId)) {
      return NextResponse.json({ error: "Neispravna uloga." }, { status: 400 });
    }

    // SQL injection =  parametarski where
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      return NextResponse.json({ error: "Email već postoji" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await db
      .insert(users)
      .values({
        fullName,
        email,
        passwordHash,
        roleId,
        isActive: true,
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        roleId: users.roleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return NextResponse.json({ user: inserted[0] }, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/users error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);

    // SQL injection + XSS = validacija inputa
    const parsed = adminUserDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;

    // IDOR = admin ne sme obrisati samog sebe
    if (userId === auth.currentUser.id) {
      return NextResponse.json(
        { error: "Ne možete obrisati sopstveni nalog." },
        { status: 400 }
      );
    }

    // SQL injection =  parametarski delete
    const deleted = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (!deleted[0]) {
      return NextResponse.json({ error: "Korisnik nije pronađen." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("DELETE /api/admin/users error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
