import * as jwt from "jsonwebtoken";

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
};

// kreiranje JWT tokena (poziva se prilikom logina ili registracije)
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
  };
}

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

