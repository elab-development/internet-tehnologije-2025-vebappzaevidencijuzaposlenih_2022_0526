/** @jest-environment node */
import { POST as checkInPOST } from "@/src/app/api/attendance/check-in/route";
import { POST as checkOutPOST } from "@/src/app/api/attendance/check-out/route";
import { cookies } from "next/headers";
import { db } from "@/src/db";
import { verifyAuthToken } from "@/src/lib/auth";

jest.mock("next/headers", () => ({
    cookies: jest.fn(),
}));

jest.mock("@/src/db", () => ({
    db: {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
    },
}));

jest.mock("@/src/lib/auth", () => ({
    AUTH_COOKIE: "auth",
    verifyAuthToken: jest.fn(),
}));

jest.mock("drizzle-orm", () => ({
    and: jest.fn(() => "AND_CONDITION"),
    eq: jest.fn(() => "EQ_CONDITION"),
}));

describe("attendance API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("POST /api/attendance/check-in", () => {
        it("vraca 401 kada korisnik nije ulogovan", async () => {
            (cookies as jest.Mock).mockResolvedValue({
                get: jest.fn().mockReturnValue(undefined),
            });

            const res = await checkInPOST();
            const data = await res.json();

            expect(res.status).toBe(401);
            expect(data.error).toBe("Niste ulogovani.");
        });

        it("upisuje check-in i vraca 201 kada zapis ne postoji", async () => {
            (cookies as jest.Mock).mockResolvedValue({
                get: jest.fn().mockReturnValue({ value: "valid-token" }),
            });

            (verifyAuthToken as jest.Mock).mockReturnValue({
                sub: "1",
            });

            const selectChain = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
            };

            const insertReturning = jest.fn().mockResolvedValue([
                {
                    id: 10,
                    workDate: "2026-03-07",
                    checkIn: new Date("2026-03-07T09:00:00"),
                    checkOut: null,
                },
            ]);

            const insertValues = jest.fn().mockReturnValue({
                returning: insertReturning,
            });

            const insertChain = {
                values: insertValues,
            };

            (db.select as jest.Mock).mockReturnValue(selectChain);
            (db.insert as jest.Mock).mockReturnValue(insertChain);

            const res = await checkInPOST();
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.record).toBeDefined();
            expect(db.insert).toHaveBeenCalled();
        });

        it("vraca 409 ako je check-in vec evidentiran", async () => {
            (cookies as jest.Mock).mockResolvedValue({
                get: jest.fn().mockReturnValue({ value: "valid-token" }),
            });

            (verifyAuthToken as jest.Mock).mockReturnValue({
                sub: "1",
            });

            const selectChain = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([
                    {
                        id: 10,
                        checkIn: new Date("2026-03-07T09:00:00"),
                        checkOut: null,
                    },
                ]),
            };

            (db.select as jest.Mock).mockReturnValue(selectChain);

            const res = await checkInPOST();
            const data = await res.json();

            expect(res.status).toBe(409);
            expect(data.error).toBe("Check-in je već evidentiran.");
        });
    });

    describe("POST /api/attendance/check-out", () => {
        it("vraca 401 kada korisnik nije ulogovan", async () => {
            (cookies as jest.Mock).mockResolvedValue({
                get: jest.fn().mockReturnValue(undefined),
            });

            const res = await checkOutPOST();
            const data = await res.json();

            expect(res.status).toBe(401);
            expect(data.error).toBe("Niste ulogovani.");
        });

        it("vraca 409 kada nema check-in pre check-out", async () => {
            (cookies as jest.Mock).mockResolvedValue({
                get: jest.fn().mockReturnValue({ value: "valid-token" }),
            });

            (verifyAuthToken as jest.Mock).mockReturnValue({
                sub: "1",
            });

            const selectChain = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
            };

            (db.select as jest.Mock).mockReturnValue(selectChain);
            const res = await checkOutPOST();
            const data = await res.json();

            expect(res.status).toBe(409);
            expect(data.error).toBe("Ne možete check-out pre check-in.");
        });

        it("upisuje check-out i vraca 200 kada check-in postoji", async () => {
            (cookies as jest.Mock).mockResolvedValue({
                get: jest.fn().mockReturnValue({ value: "valid-token" }),
            });

            (verifyAuthToken as jest.Mock).mockReturnValue({
                sub: "1",
            });

            const selectChain = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([
                    {
                        id: 10,
                        checkIn: new Date("2026-03-07T09:00:00"),
                        checkOut: null,
                    },
                ]),
            };

            const updateReturning = jest.fn().mockResolvedValue([
                {
                    id: 10,
                    workDate: "2026-03-07",
                    checkIn: new Date("2026-03-07T09:00:00"),
                    checkOut: new Date("2026-03-07T17:00:00"),
                },
            ]);

            const updateWhere = jest.fn().mockReturnValue({
                returning: updateReturning,
            });

            const updateSet = jest.fn().mockReturnValue({
                where: updateWhere,
            });

            const updateChain = {
                set: updateSet,
            };

            (db.select as jest.Mock).mockReturnValue(selectChain);
            (db.update as jest.Mock).mockReturnValue(updateChain);

            const res = await checkOutPOST();
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.record).toBeDefined();
            expect(db.update).toHaveBeenCalled();
        });
    });
});
