"use client";

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
}
