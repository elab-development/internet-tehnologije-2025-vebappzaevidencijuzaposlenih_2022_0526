/** @jest-environment node */

import {
    GET,
    POST,
    PATCH,
    DELETE,
} from "@/src/app/api/admin/users/route";
import { cookies } from "next/headers";
import { db } from "@/src/db";
import { verifyAuthToken } from "@/src/lib/auth";
import bcrypt from "bcrypt";

jest.mock("next/headers", () => ({
    cookies: jest.fn(),
}));

jest.mock("@/src/db", () => ({
    db: {
        select: jest.fn(),
        update: jest.fn(),
        insert: jest.fn(),
        delete: jest.fn(),
    },
}));

jest.mock("@/src/lib/auth", () => ({
    AUTH_COOKIE: "auth",
    verifyAuthToken: jest.fn(),
}));

jest.mock("bcrypt", () => ({
    hash: jest.fn(),
}));

jest.mock("drizzle-orm", () => ({
    and: jest.fn(() => "AND_CONDITION"),
    eq: jest.fn(() => "EQ_CONDITION"),
}));

function mockAdminAuth() {
    (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: "valid-token" }),
    });

    (verifyAuthToken as jest.Mock).mockReturnValue({
        sub: "1",
    });

    const adminSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
            {
                id: 1,
                roleId: 1,
                isActive: true,
            },
        ]),
    };

    (db.select as jest.Mock).mockReturnValue(adminSelectChain);
}

describe("admin users API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /api/admin/users", () => {
        it("vraca 401 kada nema tokena", async () => {
            (cookies as jest.Mock).mockResolvedValue({
                get: jest.fn().mockReturnValue(undefined),
            });

            const res = await GET();
            const data = await res.json();

            expect(res.status).toBe(401);
            expect(data.error).toBe("Unauthorized");
        });

        it("vraca listu korisnika kada je admin ulogovan", async () => {
            mockAdminAuth();

            const allUsersChain = {
                from: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockResolvedValue([
                    {
                        id: 1,
                        fullName: "Admin",
                        email: "admin@test.com",
                        roleId: 1,
                        isActive: true,
                        createdAt: new Date(),
                    },
                    {
                        id: 2,
                        fullName: "Danica",
                        email: "danica@test.com",
                        roleId: 3,
                        isActive: true,
                        createdAt: new Date(),
                    },
                ]),
            };

            (db.select as jest.Mock)
                .mockReturnValueOnce({
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockResolvedValue([
                        { id: 1, roleId: 1, isActive: true },
                    ]),
                })
                .mockReturnValueOnce(allUsersChain);

            const res = await GET();
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.users).toHaveLength(2);
        });
    });

    describe("POST /api/admin/users", () => {
        it("vraca 400 za neispravan body", async () => {
            mockAdminAuth();

            const req = new Request("http://localhost/api/admin/users", {
                method: "POST",
                body: JSON.stringify({
                    fullName: "",
                    email: "nije-email",
                    password: "123",
                    roleId: -1,
                }),
                headers: { "Content-Type": "application/json" },
            });

            const res = await POST(req);
            expect(res.status).toBe(400);
        });

        it("vraca 409 kada email vec postoji", async () => {
            mockAdminAuth();

            (db.select as jest.Mock)
                .mockReturnValueOnce({
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockResolvedValue([
                        { id: 1, roleId: 1, isActive: true },
                    ]),
                })
                .mockReturnValueOnce({
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockResolvedValue([{ id: 5 }]),
                });

            const req = new Request("http://localhost/api/admin/users", {
                method: "POST",
                body: JSON.stringify({
                    fullName: "Novi Korisnik",
                    email: "postoji@test.com",
                    password: "123456",
                    roleId: 3,
                }),
                headers: { "Content-Type": "application/json" },
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(409);
            expect(data.error).toBe("Email već postoji");
        });

        it("kreira korisnika i vraca 201", async () => {
            mockAdminAuth();
            (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

            (db.select as jest.Mock)
                .mockReturnValueOnce({
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockResolvedValue([
                        { id: 1, roleId: 1, isActive: true },
                    ]),
                })
                .mockReturnValueOnce({
                    from: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockResolvedValue([]),
                });

            (db.insert as jest.Mock).mockReturnValue({
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([
                        {
                            id: 10,
                            fullName: "Novi Korisnik",
                            email: "novi@test.com",
                            roleId: 3,
                            isActive: true,
                            createdAt: new Date(),
                        },
                    ]),
                }),
            });

            const req = new Request("http://localhost/api/admin/users", {
                method: "POST",
                body: JSON.stringify({
                    fullName: "Novi Korisnik",
                    email: "novi@test.com",
                    password: "123456",
                    roleId: 3,
                }),
                headers: { "Content-Type": "application/json" },
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.user.email).toBe("novi@test.com");
        });
    });

    describe("PATCH /api/admin/users", () => {
        it("vraca 400 kada admin pokusa sebi da promeni ulogu", async () => {
            mockAdminAuth();

            const req = new Request("http://localhost/api/admin/users", {
                method: "PATCH",
                body: JSON.stringify({
                    userId: 1,
                    roleId: 2,
                }),
                headers: { "Content-Type": "application/json" },
            });

            const res = await PATCH(req);
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error).toBe("Ne možete menjati sopstvenu ulogu");
        });

        it("uspesno menja ulogu korisnika", async () => {
            mockAdminAuth();

            (db.update as jest.Mock).mockReturnValue({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([{ id: 2 }]),
                    }),
                }),
            });

            const req = new Request("http://localhost/api/admin/users", {
                method: "PATCH",
                body: JSON.stringify({
                    userId: 2,
                    roleId: 2,
                }),
                headers: { "Content-Type": "application/json" },
            });

            const res = await PATCH(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.ok).toBe(true);
        });
    });

    describe("DELETE /api/admin/users", () => {
        it("vraca 400 kada admin pokusa da obrise sebe", async () => {
            mockAdminAuth();

            const req = new Request("http://localhost/api/admin/users", {
                method: "DELETE",
                body: JSON.stringify({
                    userId: 1,
                }),
                headers: { "Content-Type": "application/json" },
            });

            const res = await DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error).toBe("Ne možete obrisati sopstveni nalog.");
        });

        it("uspesno brise korisnika", async () => {
            mockAdminAuth();

            (db.delete as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([{ id: 2 }]),
                }),
            });

            const req = new Request("http://localhost/api/admin/users", {
                method: "DELETE",
                body: JSON.stringify({
                    userId: 2,
                }),
                headers: { "Content-Type": "application/json" },
            });

            const res = await DELETE(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.ok).toBe(true);
        });
    });
});
