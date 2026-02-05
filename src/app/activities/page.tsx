"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "../../components/button";
import Table from "../../components/table";

type ActivityRow = {
  id: number;
  title: string;
  description: string | null;
  startTime: string; // "09:00:00"
  endTime: string;   // "11:00:00"
};

export default function ActivitiesPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ActivityRow[]>([]);

  const columns = useMemo(
    () => [
      { header: "Vreme od", accessor: "startTime" },
      { header: "Vreme do", accessor: "endTime" },
      { header: "Naziv", accessor: "title" },
      { header: "Opis", accessor: "description" },
    ],
    []
  );

  // učitavanje aktivnosti za izabrani dan
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/activities?date=${encodeURIComponent(date)}`,
          {
            method: "GET",
            credentials: "include", // šalje auth cookie
          }
        );

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setError(data?.error || `Greška (${res.status})`);
          setRows([]);
          setLoading(false);
          return;
        }

        setRows((data?.activities ?? []) as ActivityRow[]);
        setLoading(false);
      } catch {
        setError("Ne mogu da kontaktiram server. Problem sa mrežom.");
        setRows([]);
        setLoading(false);
      }
    }

    load();
  }, [date]);

  // eksport svih aktivnosti za dan (bez selekcije)
  async function handleExport() {
    setError("");

    try {
      const res = await fetch(
        `/api/activities/export?date=${encodeURIComponent(date)}`
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || `Eksport nije uspeo (${res.status})`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `aktivnosti_${date}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch {
      setError("Ne mogu da kontaktiram server za eksport.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6 font-sans">
      <h1 className="mb-4 text-2xl font-semibold">Aktivnosti</h1>

      {/* filter datuma + eksport dugme */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-xl bg-white p-4 shadow">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Izaberi datum
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <p className="mt-2 text-sm text-zinc-600">
            Izabrani datum: <b>{date}</b>
          </p>
        </div>

        <div className="flex gap-2">
          <Button text="Eksportuj" onClick={handleExport} disabled={loading} />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-xl font-semibold">
          Aktivnosti za izabrani dan
        </h2>

        {loading && <p className="text-sm text-zinc-600">Učitavanje...</p>}

        {!loading && rows.length === 0 && (
          <p className="text-sm text-zinc-600">
            Nema aktivnosti za izabrani datum.
          </p>
        )}

        {!loading && rows.length > 0 && (
          <Table columns={columns} data={rows} />
        )}
      </section>
    </main>
  );
}
