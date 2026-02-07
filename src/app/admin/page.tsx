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

type ActivityRow = {
  id: number;
  title: string;
  description: string | null;
  startTime: string; // HH:MM:SS
  endTime: string;   // HH:MM:SS
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

  // --- za CREATE korisnika ---
  const [showCreate, setShowCreate] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState<number>(3);
  const [creating, setCreating] = useState(false);

  // --- ADMIN CRUD nad aktivnostima ---
  const today = new Date().toISOString().slice(0, 10);

  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [actDate, setActDate] = useState<string>(today);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState("");
  const [activitiesRows, setActivitiesRows] = useState<ActivityRow[]>([]);

  const [actFormMode, setActFormMode] = useState<"create" | "edit" | null>(
    null
  );
  const [editingActivityId, setEditingActivityId] = useState<number | null>(
    null
  );
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);

  // ----------------- UČITAVANJE ADMIN PODATAKA -----------------
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
          setError(
            data?.error || `Greška pri učitavanju korisnika (${res.status})`
          );
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

  // ----------------- ROLE PROMENA -----------------
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

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, roleId } : u))
      );
      setSavingUserId(null);
    } catch {
      setError("Ne mogu da kontaktiram server pri izmeni role.");
      setSavingUserId(null);
    }
  }

  // ----------------- DELETE KORISNIKA -----------------
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

      // ako smo gledali aktivnosti tog korisnika, zatvori panel
      setSelectedUser((prev) => (prev && prev.id === userId ? null : prev));

      setDeletingUserId(null);
    } catch {
      setError("Ne mogu da kontaktiram server pri brisanju.");
      setDeletingUserId(null);
    }
  }

  // ----------------- CREATE KORISNIKA -----------------
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

  // ----------------- ADMIN AKTIVNOSTI – HELP FUNKCIJE -----------------

  function resetActivityForm() {
    setActFormMode(null);
    setEditingActivityId(null);
    setFormTitle("");
    setFormDescription("");
    setFormStartTime("");
    setFormEndTime("");
  }

  async function loadActivities() {
    if (!selectedUser) return;
    setActivitiesLoading(true);
    setActivitiesError("");

    try {
      const params = new URLSearchParams();
      params.set("userId", String(selectedUser.id));
      params.set("date", actDate);

      const res = await fetch(`/api/admin/activities?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setActivitiesError(
          data?.error || `Greška pri učitavanju aktivnosti (${res.status})`
        );
        setActivitiesRows([]);
        setActivitiesLoading(false);
        return;
      }

      setActivitiesRows((data?.activities ?? []) as ActivityRow[]);
      setActivitiesLoading(false);
    } catch {
      setActivitiesError("Ne mogu da kontaktiram server za aktivnosti.");
      setActivitiesRows([]);
      setActivitiesLoading(false);
    }
  }

  useEffect(() => {
    if (selectedUser) {
      loadActivities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, actDate]);

  function openCreateActivity() {
    if (!selectedUser) return;
    setActFormMode("create");
    setEditingActivityId(null);
    setFormTitle("");
    setFormDescription("");
    setFormStartTime("");
    setFormEndTime("");
  }

  function openEditActivity(row: ActivityRow) {
    setActFormMode("edit");
    setEditingActivityId(row.id);
    setFormTitle(row.title);
    setFormDescription(row.description ?? "");
    // u input="time" očekujemo HH:MM
    setFormStartTime(row.startTime.slice(0, 5));
    setFormEndTime(row.endTime.slice(0, 5));
  }

  async function handleSaveActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !actFormMode) return;

    setActivitiesError("");
    setSavingActivity(true);

    try {
      if (actFormMode === "create") {
        const res = await fetch("/api/admin/activities", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUser.id,
            date: actDate,
            title: formTitle,
            description: formDescription,
            startTime: formStartTime,
            endTime: formEndTime,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setActivitiesError(
            data?.error || `Greška pri dodavanju (${res.status})`
          );
          setSavingActivity(false);
          return;
        }

        const created = data?.activity as ActivityRow | undefined;
        if (created) {
          setActivitiesRows((prev) =>
            [...prev, created].sort((a, b) =>
              a.startTime.localeCompare(b.startTime)
            )
          );
        }
      } else if (actFormMode === "edit" && editingActivityId) {
        const res = await fetch("/api/admin/activities", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingActivityId,
            title: formTitle,
            description: formDescription,
            startTime: formStartTime,
            endTime: formEndTime,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setActivitiesError(
            data?.error || `Greška pri izmeni (${res.status})`
          );
          setSavingActivity(false);
          return;
        }

        const updated = data?.activity as ActivityRow | undefined;
        if (updated) {
          setActivitiesRows((prev) =>
            prev.map((a) => (a.id === updated.id ? updated : a))
          );
        }
      }

      setSavingActivity(false);
      resetActivityForm();
    } catch {
      setActivitiesError("Ne mogu da kontaktiram server za čuvanje aktivnosti.");
      setSavingActivity(false);
    }
  }

  async function handleDeleteActivity(id: number) {
    if (!confirm("Da li sigurno želiš da obrišeš ovu aktivnost?")) return;

    setActivitiesError("");

    try {
      const res = await fetch("/api/admin/activities", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setActivitiesError(
          data?.error || `Greška pri brisanju (${res.status})`
        );
        return;
      }

      setActivitiesRows((prev) => prev.filter((a) => a.id !== id));

      if (editingActivityId === id) {
        resetActivityForm();
      }
    } catch {
      setActivitiesError("Ne mogu da kontaktiram server za brisanje aktivnosti.");
    }
  }

  // ----------------- RENDER -----------------

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

            <Button
              text={creating ? "Kreiranje..." : "Sačuvaj"}
              type="submit"
              disabled={creating}
            />
          </form>
        </section>
      )}

      {loading && <p className="text-sm text-zinc-600">Učitavanje...</p>}

      {!loading && (
        <>
          {/* KORISNICI */}
          <section className="mb-8 rounded-xl bg-white p-4 shadow">
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

                        <td className="border px-3 py-2 space-x-2">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="rounded-lg border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                          >
                            Aktivnosti
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={deletingUserId === u.id}
                            className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
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

          {/* AKTIVNOSTI IZABRANOG KORISNIKA */}
          {selectedUser && (
            <section className="rounded-xl bg-white p-4 shadow">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    Aktivnosti korisnika {selectedUser.fullName}
                  </h2>
                  <p className="text-sm text-zinc-600">{selectedUser.email}</p>
                </div>

                <div className="flex items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Datum
                    </label>
                    <input
                      type="date"
                      value={actDate}
                      onChange={(e) => setActDate(e.target.value)}
                      className="rounded-lg border border-zinc-300 px-3 py-1 text-sm"
                    />
                  </div>

                  <Button text="Osveži" onClick={loadActivities} />
                </div>
              </div>

              {activitiesError && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {activitiesError}
                </p>
              )}

              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-zinc-600">
                  Broj aktivnosti: <b>{activitiesRows.length}</b>
                </p>

                <Button text="Dodaj aktivnost" onClick={openCreateActivity} />
              </div>

              {activitiesLoading && (
                <p className="text-sm text-zinc-600">Učitavanje aktivnosti...</p>
              )}

              {!activitiesLoading && activitiesRows.length === 0 && (
                <p className="text-sm text-zinc-600">
                  Nema aktivnosti za izabrani datum.
                </p>
              )}

              {!activitiesLoading && activitiesRows.length > 0 && (
                <div className="mb-4 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="border px-3 py-2 text-left">Vreme od</th>
                        <th className="border px-3 py-2 text-left">Vreme do</th>
                        <th className="border px-3 py-2 text-left">Naziv</th>
                        <th className="border px-3 py-2 text-left">Opis</th>
                        <th className="border px-3 py-2 text-left">Akcije</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activitiesRows.map((a) => (
                        <tr key={a.id} className="hover:bg-zinc-50">
                          <td className="border px-3 py-2">
                            {a.startTime.slice(0, 5)}
                          </td>
                          <td className="border px-3 py-2">
                            {a.endTime.slice(0, 5)}
                          </td>
                          <td className="border px-3 py-2">{a.title}</td>
                          <td className="border px-3 py-2">
                            {a.description ?? <span className="text-zinc-400">-</span>}
                          </td>
                          <td className="border px-3 py-2 space-x-2">
                            <button
                              onClick={() => openEditActivity(a)}
                              className="rounded-lg border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                            >
                              Izmeni
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(a.id)}
                              className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                            >
                              Obriši
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {actFormMode && (
                <section className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <h3 className="mb-2 text-sm font-semibold">
                    {actFormMode === "create"
                      ? "Dodaj aktivnost"
                      : "Izmeni aktivnost"}
                  </h3>

                  <form
                    onSubmit={handleSaveActivity}
                    className="grid gap-2 md:grid-cols-2"
                  >
                    <div className="md:col-span-2">
                      <input
                        className="w-full rounded-lg border border-zinc-300 px-3 py-1 text-sm"
                        placeholder="Naziv aktivnosti"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-zinc-600">
                        Vreme od
                      </label>
                      <input
                        type="time"
                        className="w-full rounded-lg border border-zinc-300 px-3 py-1 text-sm"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-zinc-600">
                        Vreme do
                      </label>
                      <input
                        type="time"
                        className="w-full rounded-lg border border-zinc-300 px-3 py-1 text-sm"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <textarea
                        className="h-20 w-full rounded-lg border border-zinc-300 px-3 py-1 text-sm"
                        placeholder="Opis (opciono)"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </div>

                    <div className="mt-2 flex gap-2 md:col-span-2">
                      <Button
                        text={
                          savingActivity
                            ? "Čuvanje..."
                            : actFormMode === "create"
                            ? "Sačuvaj"
                            : "Sačuvaj izmene"
                        }
                        type="submit"
                        disabled={savingActivity}
                      />
                      <Button
                        text="Otkaži"
                        onClick={resetActivityForm}
                        disabled={savingActivity}
                      />
                    </div>
                  </form>
                </section>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
