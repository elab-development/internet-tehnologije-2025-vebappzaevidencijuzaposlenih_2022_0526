/** @jest-environment node */
import { GET } from "@/src/app/api/auth/me/route";
import { cookies } from "next/headers";
import { db } from "@/src/db";
import { verifyAuthToken } from "@/src/lib/auth";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/src/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("@/src/lib/auth", () => ({
  AUTH_COOKIE: "auth",
  verifyAuthToken: jest.fn(),
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn(() => "EQ_CONDITION"),
}));

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("vraca user: null kada nema tokena", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toBeNull();
  });

  it("vraca user: null kada token nema validan userId", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "token" }),
    });

    (verifyAuthToken as jest.Mock).mockReturnValue({
      sub: null,
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toBeNull();
  });

  it("vraca korisnika kada je token validan", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "token" }),
    });

    (verifyAuthToken as jest.Mock).mockReturnValue({
      sub: "1",
    });

    const selectChain = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          fullName: "Test User",
          email: "test@test.com",
          roleId: 2,
          roleName: "EMPLOYEE",
          isActive: true,
          createdAt: new Date(),
        },
      ]),
    };

    (db.select as jest.Mock).mockReturnValue(selectChain);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe("test@test.com");
  });

  it("vraca user: null kada korisnik nije aktivan", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "token" }),
    });

    (verifyAuthToken as jest.Mock).mockReturnValue({
      sub: "1",
    });

    const selectChain = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          fullName: "Test User",
          email: "test@test.com",
          roleId: 2,
          roleName: "EMPLOYEE",
          isActive: false,
          createdAt: new Date(),
        },
      ]),
    };

    (db.select as jest.Mock).mockReturnValue(selectChain);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toBeNull();
  });
});