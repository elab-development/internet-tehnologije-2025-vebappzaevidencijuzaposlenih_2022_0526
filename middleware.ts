import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_COOKIE = "auth";

//izvlacimo payload, pa citamo roleId, sub itd..
//ovu funkciju koristimo zbog routinga tj. da bismo odlucili ko sme na koju stranicu
function readJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isPublicPath(pathname: string) {
  if (pathname === "/" || pathname === "/login"  || pathname === "/login/admin")
    return true;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public")
  ) {
    return true;
  }

  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/forbidden")) return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;

  // 1) nije ulogovan? redirect na /login
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 2) dekoramo payload da znamo ulogu (roleId)
  const payload = readJwtPayload(token);
  const roleId = Number(payload?.roleId ?? 0);

  // redirect na forbidden 
  const redirectForbidden = () => {
    const url = req.nextUrl.clone();
    url.pathname = "/forbidden";
    return NextResponse.redirect(url);
  };

  // 3) RBAC
  if (pathname.startsWith("/admin")) {
    if (roleId !== 1) return redirectForbidden();
  }

  if (pathname.startsWith("/team")) {
    if (roleId !== 2) return redirectForbidden();
  }

  // ostalo: samo mora biti ulogovan
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};