"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MeUser = {
  id: number;
  fullName: string;
  email: string;
  roleId: number;
};

export default function Nav() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeUser | null>(null);

  //proveravamo da li je korisnik ulogovan
  useEffect(() => {
    async function loadMe() {
      const res = await fetch("/api/auth/me");
      const data = await res.json().catch(() => null);
      setUser(data?.user ?? null);
      setLoading(false);
    }

    loadMe();
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  //dok cekamo odgovor od backenda, ne renderujemo nista
  if (loading) return null;

  return (
    <nav className="mb-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <Link href="/" className="text-sm font-semibold text-zinc-900">
        Evidencija prisustva zaposlenih
      </Link>

      {/*KORISNIK NIJE ULOGOVAN*/}
      {!user && (
        <Link
          href="/login"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Login
        </Link>
      )}

      {/*KORISNIK ULOGOVAN */}
      {user && (
        <div className="flex items-center gap-2">
          <Link
            href="/home"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
          >
            Home
          </Link>

          <Link
            href="/profile"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
          >
            Moj profil
          </Link>

          <Link
            href="/activities"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
          >
            Aktivnosti
          </Link>

          <Link
            href="/reports"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
          >
            Izvestaji
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}



/*"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Nav() {

  const router = useRouter();
  async function handleLogout(){
    await fetch ("/api/auth/logout",{method: "POST"});
    router.push("/login");
    router.refresh();
  }


  return (
    <nav className="mb-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <Link href="/" className="text-sm font-semibold text-zinc-900">
        Evidencija prisustva
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/home"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Home
        </Link>

        <Link
          href="/profile"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Moj profil
        </Link>

        <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Izvestaji
        </Link>
         <Link
          href="/activities"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Aktivnosti
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Log out
        </button>
        
      </div>
    </nav>
  );
}*/