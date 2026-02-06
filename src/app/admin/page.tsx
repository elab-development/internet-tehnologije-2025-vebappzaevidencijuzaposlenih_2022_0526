"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../../components/button";

type MeUser = {
  id: number;
  fullName: string;
  email: string;
  roleId: number;
  isActive: boolean;
  createdAt: string;
};

type AdminUserRow = {
  id: number;
  fullName: string;
  email: string;
  roleId: number;
  isActive: boolean;
  createdAt: string;
};

const ROLE_OPTIONS = [
  { id: 1, label: "Administrator" },
  { id: 2, label: "Menadžer" },
  { id: 3, label: "Zaposleni" },
];

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeUser | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  // 1) proveravamo da li je korisnik ulogovan i da li je ADMIN (roleId = 1)
  useEffect(() => {
    async function loadAdminData() {
      setLoading(true);
      setError("");

      try {
        // prvo: ko sam ja?
        const meRes = await fetch("/api/auth/me", { method: "GET" });
        const meData = await meRes.json().catch(() => null);
        const u: MeUser | null = meData?.user ?? null;

        if (!u) {
          // nije ulogovan → na login
          router.push("/login");
          return;
        }

        if (u.roleId !== 1) {
          // nije admin → nazad na home ili profil
          router.push("/home");
          return;
        }

        setMe(u);

        // drugo: učitaj sve korisnike (admin-only API)
        const res = await fetch("/api/admin/users", { method: "GET" });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setError(data?.error || `Greška pri učitavanju korisnika (${res.status})`);
          setLoading(false);
          return;
        }

        setUsers((data?.users ?? []) as AdminUserRow[]);
        setLoading(false);
      } catch {
        setError("Ne mogu da kontaktiram server (admin).");
        setLoading(false);
      }
    }

    loadAdminData();
  }, [router]);

  function roleLabel(roleId: number) {
    return ROLE_OPTIONS.find((r) => r.id === roleId)?.label || `Rola ${roleId}`;
  }

  async function handleChangeRole(userId: number, newRoleId: number) {
    setError("");
    setSavingUserId(userId);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          roleId: newRoleId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || `Greška pri izmeni role (${res.status})`);
        setSavingUserId(null);
        return;
      }

      // update u lokalnom state-u
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, roleId: newRoleId }
            : u
        )
      );

      setSavingUserId(null);
    } catch {
      setError("Ne mogu da kontaktiram server pri izmeni role.");
      setSavingUserId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 font-sans">
      <h1 className="mb-2 text-2xl font-semibold">Admin panel</h1>

      {me && (
        <p className="mb-6 text-sm text-zinc-600">
          Ulogovani administrator: <b>{me.fullName}</b> ({me.email})
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-zinc-600">Učitavanje...</p>}

      {!loading && (
        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 text-xl font-semibold">Korisnici i uloge</h2>

          {users.length === 0 && (
            <p className="text-sm text-zinc-600">Nema korisnika u sistemu.</p>
          )}

          {users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="border px-3 py-2 text-left">Ime i prezime</th>
                    <th className="border px-3 py-2 text-left">Email</th>
                    <th className="border px-3 py-2 text-left">Uloga</th>
                    <th className="border px-3 py-2 text-left">Status</th>
                    <th className="border px-3 py-2 text-left">Kreiran</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50">
                      <td className="border px-3 py-2">
                        {u.fullName}
                      </td>
                      <td className="border px-3 py-2">
                        {u.email}
                      </td>
                      <td className="border px-3 py-2">
                        <select
                          value={u.roleId}
                          onChange={(e) =>
                            handleChangeRole(u.id, Number(e.target.value))
                          }
                          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                          disabled={savingUserId === u.id}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border px-3 py-2">
                        {u.isActive ? "Aktivan" : "Neaktivan"}
                      </td>
                      <td className="border px-3 py-2">
                        {new Date(u.createdAt).toLocaleString("sr-RS")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* OVDE kasnije možemo dodati blok: aktivnosti po useru, CRUD nad aktivnostima itd. */}
    </main>
  );
}
