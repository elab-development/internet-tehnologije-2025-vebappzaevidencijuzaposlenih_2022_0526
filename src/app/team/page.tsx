"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/components/AuthProvider";
import Button from "@/src/components/button";
import Table from "@/src/components/table";

type TeamMember = {
  id: number;
  fullName: string;
  email: string;
};

type ActivityRow = {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
};

export default function TeamPage() {
  const router = useRouter();
  const { status, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [date, setDate] = useState(
    () => new Date().toISOString().slice(0, 10) // danas
  );

  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [error, setError] = useState("");

  // forma za dodavanje aktivnosti
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  const columns = useMemo(
    () => [
      { header: "Vreme od", accessor: "startTime" },
      { header: "Vreme do", accessor: "endTime" },
      { header: "Naziv", accessor: "title" },
      { header: "Opis", accessor: "description" },
    ],
    []
  );

  // 1) zastita rute: samo menadžer
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !user) {
      router.replace("/login");
      return;
    }

    if (user.roleId !== 2) {
      router.replace("/forbidden");
      return;
    }
  }, [status, user, router]);

  // 2) učitaj članove tima
  useEffect(() => {
    async function loadMembers() {
      if (status !== "authenticated" || !user) return;

      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/team/users", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setError(data?.error || `Greška pri učitavanju tima (${res.status})`);
          setMembers([]);
          setLoading(false);
          return;
        }

        const list = (data?.users ?? []) as TeamMember[];
        setMembers(list);
        if (list.length > 0) {
          setSelectedUserId(list[0].id);
        }
        setLoading(false);
      } catch {
        setError("Ne mogu da kontaktiram server (tim).");
        setLoading(false);
      }
    }

    if (status === "authenticated" && user?.roleId === 2) {
      loadMembers();
    }
  }, [status, user]);

  // 3) učitaj aktivnosti za izabranog člana i datum
  useEffect(() => {
    async function loadActivities() {
      if (!selectedUserId || !date) {
        setRows([]);
        return;
      }

      setError("");

      try {
        const params = new URLSearchParams();
        params.set("userId", String(selectedUserId));
        params.set("date", date);

        const res = await fetch(`/api/admin/activities?${params.toString()}`, {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setError(data?.error || `Greška pri učitavanju aktivnosti (${res.status})`);
          setRows([]);
          return;
        }

        setRows((data?.activities ?? []) as ActivityRow[]);
      } catch {
        setError("Ne mogu da kontaktiram server (aktivnosti).");
        setRows([]);
      }
    }

    if (selectedUserId) {
      loadActivities();
    }
  }, [selectedUserId, date]);

  async function handleAddActivity(e: FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/activities", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          date,
          title,
          description: description || null,
          startTime,
          endTime,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || `Greška pri dodavanju aktivnosti (${res.status})`);
        setSaving(false);
        return;
      }

      const newAct = data?.activity as ActivityRow | undefined;
      if (newAct) {
        setRows((prev) => [...prev, newAct].sort((a, b) => a.startTime.localeCompare(b.startTime)));
      }

      // reset forme
      setTitle("");
      setDescription("");
      setStartTime("09:00");
      setEndTime("10:00");
      setSaving(false);
    } catch {
      setError("Ne mogu da kontaktiram server pri dodavanju aktivnosti.");
      setSaving(false);
    }
  }

  // UI
  return (
    <main className="mx-auto max-w-5xl p-6 font-sans">
      <h1 className="mb-4 text-2xl font-semibold">Moj tim</h1>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-zinc-600">Učitavanje članova tima...</p>}

      {!loading && members.length === 0 && (
        <p className="text-sm text-zinc-600">
          Nemate dodeljene članove tima.
        </p>
      )}

      {!loading && members.length > 0 && (
        <>
          {/* Filter: član tima + datum */}
          <section className="mb-6 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Član tima</label>
              <select
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm min-w-[220px]"
                value={selectedUserId ?? ""}
                onChange={(e) =>
                  setSelectedUserId(e.target.value ? Number(e.target.value) : null)
                }
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Datum</label>
              <input
                type="date"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </section>

          {/* Aktuelne aktivnosti */}
          <section className="mb-6 rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 text-xl font-semibold">
              Aktivnosti za izabrani dan
            </h2>

            {rows.length === 0 ? (
              <p className="text-sm text-zinc-600">
                Nema aktivnosti za odabrani datum.
              </p>
            ) : (
              <Table columns={columns} data={rows} />
            )}
          </section>

          {/* Forma za dodavanje aktivnosti */}
          <section className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 text-xl font-semibold">Dodaj aktivnost</h2>

            <form onSubmit={handleAddActivity} className="grid gap-3 max-w-xl">
              <input
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Naziv aktivnosti"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <textarea
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Opis (nije obavezan)"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="flex gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm">Vreme od</label>
                  <input
                    type="time"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm">Vreme do</label>
                  <input
                    type="time"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  text={saving ? "Dodavanje..." : "Dodaj aktivnost"}
                  disabled={saving || !selectedUserId}
                />
              </div>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
