"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function Nav() {
  const { user, status, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // dok se učitava ili nema ulogovanog korisnika → ne prikazuj nav
  if (status === "loading" || !user) return null;

  //sakrivamp nav na login
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return null;
  }


  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // čak i ako pukne poziv, samo ga otkačimo lokalno
    }

    await refresh();
    router.replace("/login");
  }

  //ADMIN – poseban nav (samo admin panel + logout)
  if (user.roleId === 1) {
    return (
      <nav className="mb-6 flex items-center justify-between bg-black px-6 py-3 text-sm text-white">
        <div className="flex items-center gap-4">
          <span className="font-semibold">Admin panel</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-300">
            {user.fullName} (admin)
          </span>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/30 px-3 py-1 text-xs hover:bg-white hover:text-black"
          >
           Odjavi se
          </button>
        </div>
      </nav>
    );
  }

  // MENADŽER + ZAPOSLENI – zajednički nav
// ako je menadžer (roleId === 2) vodi na /reports/manager
const reportsHref = user.roleId === 2 ? "/reports/manager" : "/reports";

const links = [
  { href: "/home", label: "Početna" },
  { href: "/profile", label: "Moj profil" },
  { href: "/activities", label: "Aktivnosti" },
  { href: reportsHref, label: "Izveštaji" },
];
  // samo menadžeru dodaj "Moj tim"
  if (user.roleId === 2) {
    links.push({ href: "/team", label: "Moj tim" });
  }

  return (
    <nav className="mb-6 flex items-center justify-between bg-black px-6 py-3 text-sm text-white">
      <div className="flex items-center gap-4">
        <span className="font-semibold">Evidencija prisustva</span>

        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                "rounded-md px-3 py-1 " +
                (active ? "bg-white text-black" : "hover:bg-white/10")
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-zinc-300">{user.fullName}</span>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-white/30 px-3 py-1 text-xs hover:bg-white hover:text-black"
        >
          Odjavi se
        </button>
      </div>
    </nav>
  );
}

