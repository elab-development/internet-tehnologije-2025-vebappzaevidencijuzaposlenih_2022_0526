"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import Button from "./button";

export default function Nav() {
  const { status, user, logout } = useAuth();
  const pathname = usePathname();

  const isAuthenticated = status === "authenticated";
  const isAdmin = user?.roleId === 1;

  //uopšte NE prikazuj nav
  const isLoginPage =
    pathname === "/login" || pathname === "/login/admin";

  if (isLoginPage) {
    return null;
  }

  // Niko nije ulogovan (npr. neka public stranica) → samo naslov + link za login
  if (!isAuthenticated) {
    return (
      <nav className="flex items-center justify-between border-b bg-white px-6 py-3 text-sm">
        <span className="font-semibold">
          Evidencija prisustva zaposlenih
        </span>

        <Link
          href="/login"
          className="text-blue-600 hover:underline"
        >
          Login
        </Link>
      </nav>
    );
  }

  const onAdminPage = pathname.startsWith("/admin");

  //3) ADMIN na /admin → samo „Admin panel“ + Logout
  if (isAdmin && onAdminPage) {
    return (
      <nav className="flex items-center justify-between border-b bg-white px-6 py-3 text-sm">
        <span className="font-semibold">Admin panel</span>

        <Button text="Logout" onClick={logout} />
      </nav>
    );
  }

  //4) Svi ostali slučajevi – normalan navbar
  return (
    <nav className="flex items-center justify-between border-b bg-white px-6 py-3 text-sm">
      <div className="flex items-center gap-5">
        <span className="font-semibold">
          Evidencija prisustva zaposlenih
        </span>

        <Link href="/home" className="hover:underline">
          Home
        </Link>
        <Link href="/profile" className="hover:underline">
          Moj profil
        </Link>
        <Link href="/activities" className="hover:underline">
          Aktivnosti
        </Link>
        <Link href="/reports" className="hover:underline">
          Izveštaji
        </Link>

        {/* opcioni Admin link, samo adminima */}
        {isAdmin && (
          <Link
            href="/admin"
            className="font-medium text-blue-600 hover:underline"
          >
            Admin
          </Link>
        )}
      </div>

      <Button text="Logout" onClick={logout} />
    </nav>
  );
}

/*"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function Nav() {
  const { status, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // nema nav bara dok korisnik nije ulogovan
  if (status !== "authenticated" || !user) {
    return null;
  }

  const isActive = (href: string) => pathname === href;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <span className="text-sm font-semibold">
          Evidencija prisustva zaposlenih
        </span>

        <div className="flex items-center gap-4 text-sm">
          <NavLink href="/home" active={isActive("/home")}>
            Home
          </NavLink>
          <NavLink href="/profile" active={isActive("/profile")}>
            Moj profil
          </NavLink>
          <NavLink href="/activities" active={isActive("/activities")}>
            Aktivnosti
          </NavLink>
          <NavLink href="/reports" active={isActive("/reports")}>
            Izveštaji
          </NavLink>

          <button
            onClick={handleLogout}
            className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "transition-colors hover:text-black" +
        (active ? " font-semibold text-black" : " text-zinc-600")
      }
    >
      {children}
    </Link>
  );
}*/
