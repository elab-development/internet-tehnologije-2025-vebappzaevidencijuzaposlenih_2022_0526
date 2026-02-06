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
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  // --- za CREATE (modal/forma) ---
  const [showCreate, setShowCreate] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState<number>(3);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function loadAdminData() {
      setLoading(true);
      setError("");

      try {
        // 1) ko sam ja?
        const meRes = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });
        const meData = await meRes.json().catch(() => null);
        const u: MeUser | null = meData?.user ?? null;

        if (!u) {
          router.push("/login");
          return;
        }
        if (u.roleId !== 1) {
          router.push("/home");
          return;
        }

        setMe(u);

        // 2) svi korisnici
        const res = await fetch("/api/admin/users", {
          method: "GET",
          credentials: "include",
        });
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

  async function handleChangeRole(userId: number, roleId: number) {
    setError("");
    setSavingUserId(userId);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || `Greška pri izmeni role (${res.status})`);
        setSavingUserId(null);
        return;
      }

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, roleId } : u)));
      setSavingUserId(null);
    } catch {
      setError("Ne mogu da kontaktiram server pri izmeni role.");
      setSavingUserId(null);
    }
  }

  // ✅ OVO JE BRISANJE KOJE IDE SA TVOJOM RUTOM (DELETE /api/admin/users + body)
  async function handleDeleteUser(userId: number) {
    setError("");

    if (!confirm("Da li sigurno želiš da obrišeš ovog korisnika?")) return;

    setDeletingUserId(userId);

    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || `Greška pri brisanju (${res.status})`);
        setDeletingUserId(null);
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeletingUserId(null);
    } catch {
      setError("Ne mogu da kontaktiram server pri brisanju.");
      setDeletingUserId(null);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newFullName,
          email: newEmail,
          password: newPassword,
          roleId: newRoleId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || `Greška pri kreiranju (${res.status})`);
        setCreating(false);
        return;
      }

      const created = data?.user as AdminUserRow | undefined;
      if (created) {
        setUsers((prev) => [...prev, created].sort((a, b) => a.id - b.id));
      }

      setShowCreate(false);
      setNewFullName("");
      setNewEmail("");
      setNewPassword("");
      setNewRoleId(3);
      setCreating(false);
    } catch {
      setError("Ne mogu da kontaktiram server pri kreiranju korisnika.");
      setCreating(false);
    }
  }

  function roleLabel(roleId: number) {
    return ROLE_OPTIONS.find((r) => r.id === roleId)?.label || `Rola ${roleId}`;
  }

  return (
    <main className="mx-auto max-w-5xl p-6 font-sans">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin panel</h1>

        <Button
          text={showCreate ? "Zatvori" : "Dodaj korisnika"}
          onClick={() => setShowCreate((v) => !v)}
        />
      </div>

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

      {showCreate && (
        <section className="mb-6 rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Kreiraj korisnika</h2>

          <form onSubmit={handleCreateUser} className="grid gap-3">
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Ime i prezime"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
            />

            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />

            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Lozinka"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <select
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={newRoleId}
              onChange={(e) => setNewRoleId(Number(e.target.value))}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>

            <Button text={creating ? "Kreiranje..." : "Sačuvaj"} type="submit" disabled={creating} />
          </form>
        </section>
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

                    {/* ✅ NOVA KOLONA */}
                    <th className="border px-3 py-2 text-left">Akcije</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50">
                      <td className="border px-3 py-2">{u.fullName}</td>
                      <td className="border px-3 py-2">{u.email}</td>

                      <td className="border px-3 py-2">
                        <select
                          value={u.roleId}
                          onChange={(e) => handleChangeRole(u.id, Number(e.target.value))}
                          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                          disabled={savingUserId === u.id}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>

                        <div className="mt-1 text-xs text-zinc-500">
                          Trenutno: {roleLabel(u.roleId)}
                        </div>
                      </td>

                      <td className="border px-3 py-2">
                        {u.isActive ? "Aktivan" : "Neaktivan"}
                      </td>

                      <td className="border px-3 py-2">
                        {new Date(u.createdAt).toLocaleString("sr-RS")}
                      </td>

                      {/* ✅ DUGME OBRISI */}
                      <td className="border px-3 py-2">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={deletingUserId === u.id}
                          className="rounded-lg border border-red-300 px-2 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingUserId === u.id ? "Brisanje..." : "Obriši"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
