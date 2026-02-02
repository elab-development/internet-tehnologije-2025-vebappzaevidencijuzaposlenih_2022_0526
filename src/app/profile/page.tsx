"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "../../components/nav";

type MeUser = {
  id: number;
  fullName: string;
  email: string;
  roleId: number;
  isActive: boolean;
  createdAt: string;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeUser | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const res = await fetch("/api/auth/me", { method: "GET" });
      const data = await res.json().catch(() => null);

      const u = data?.user ?? null;

      if (!u) {
        router.push("/login"); //ako korisnik nije ulogovan ne vidi stranicu, automatski se redirektuje na login
        return;
      }

      setUser(u);
      setLoading(false);
    }

    load();
  }, [router]);

  function roleLabel(roleId: number) {
    if (roleId === 1) return "Administrator";
    if (roleId === 2) return "Menadzer";
    return "Zaposleni";
  }

  return (
    <>
      <Nav />

      <main className="mx-auto max-w-3xl p-6 font-sans">
        <h1 className="mb-4 text-2xl font-semibold">Moj profil</h1>

        {loading && <p className="text-zinc-600">Ucitavanje...</p>}

        {!loading && user && ( //mora biti zavrsen fetch i mora postojati user da bi se prikazao profil
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="grid gap-3">
              <div>
                <p className="text-sm text-zinc-500">Ime i prezime</p>
                <p className="font-medium">{user.fullName}</p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">Uloga</p>
                <p className="font-medium">{roleLabel(user.roleId)}</p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">Status</p>
                <p className="font-medium">
                  {user.isActive ? "Aktivan" : "Neaktivan"}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">Kreiran</p>
                <p className="font-medium">
                  {new Date(user.createdAt).toLocaleString("sr-RS")}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}