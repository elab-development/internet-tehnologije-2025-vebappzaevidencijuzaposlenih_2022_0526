import * as jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

export const AUTH_COOKIE = "auth_token";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET in env file");
  }
  return secret;
}

type AuthTokenPayload = {
  sub: string;
  roleId: number;
  email: string;
};

export function signAuthToken(payload: AuthTokenPayload) {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES || "7d") as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, getJwtSecret(), options);
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload & {
    iat: number;
    exp: number;
  };
}



/*import * as jwt from "jsonwebtoken";

export const AUTH_COOKIE = "auth";
const JWT_SECRET = process.env.JWT_SECRET!;
// ako secret ne postoji, aplikacija ne sme da se pokrene
if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in env file");
}
// tip podataka koji cuvamo u JWT tokenu
export type JwtUserClaims = {
  sub: string; // subject (najcesce user id)
  email: string;
  name?: string;
  roleId: number;
};

// kreiranje JWT tokena (poziva se prilikom logina)
export function signAuthToken(claims: JwtUserClaims) {
  return jwt.sign(claims, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

// verifikacija JWT tokena
export function verifyAuthToken(token: string): JwtUserClaims {
  const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & JwtUserClaims;
// proveravamo da li token sadrzi obavezna polja
  if (!payload  || !payload.sub || !payload.email) {
    throw new Error("Invalid token");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    roleId: payload.roleId,
  };
}*/

// opcije za cookie
export function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

