"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "../../components/nav";
import Button from "../../components/button";
import Table from "../../components/table";

type ActivityRow = {
  title: string;
  description: string | null;
  startTime: string; // npr "09:00:00" ili "09:00"
  endTime: string;   // npr "11:00:00" ili "11:00"
};

export default function ActivitiesPage() {
  //da vratimo u atribut today danasnji datum u ispravnom formatu
  //useMemo da bismo izracunali samo jedanput, ne pri svakom renderu ponovo
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ActivityRow[]>([]);

  // kolone za reusable Table komponentu
  const columns = useMemo(
    () => [
      { header: "Vreme od", accessor: "startTime" },
      { header: "Vreme do", accessor: "endTime" },
      { header: "Naziv", accessor: "title" },
      { header: "Opis", accessor: "description" },
    ],
    []
  );

  // ucitavanje aktivnosti za izabrani datum, svaki put kada se promeni izabrani datum
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        //saljemo zahtev beku GET /api/activities?date=YYYY-MM-DD
        //credentials include, bitno je da posaljemo auth cookie
        const res = await fetch(`/api/activities?date=${encodeURIComponent(date)}`, {
          method: "GET",
          credentials: "include",
        });

        //citamo json odgovor ili ako nije json vracamo null
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setError(data?.error || `Greska (${res.status})`);
          setRows([]); //cistimo tabelu da ne ostanu stari podaci
          setLoading(false);
          return;
        }

        setRows((data?.activities ?? []) as ActivityRow[]);
        setLoading(false);
      } catch { 
        setError("Ne mogu da kontaktiram server. Problem sa mrezom.");
        setRows([]);
        setLoading(false);
      }
    }

    load();
  }, [date]);

  //eksport aktivnosti za izabrani datum
  //poziva se ruta GET api/act/export?date=YYYY-MM-DD
  //bek vraca .ics fajl kao response body
  async function handleExport() {
  try {
    const res = await fetch(
      `/api/activities/export?date=${encodeURIComponent(date)}`
    );

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || `Eksport nije uspeo (${res.status})`);
      return;
    }

    //res.blob() uzima sirov fajl iz odgovora
    const blob = await res.blob();
    //napravicemo privremeni URL u browseru koji prestavlja taj blob
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `aktivnosti_${date}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    //oslobadja se memorija za blob URL 
    URL.revokeObjectURL(url);
  } catch {
    setError("Ne mogu da kontaktiram server za eksport.");
  }
}
  return (
    <>
      <Nav />

      <main className="mx-auto max-w-4xl p-6 font-sans">
        <h1 className="mb-4 text-2xl font-semibold">Aktivnosti</h1>

        {/* filter datuma + eksport dugme */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-xl bg-white p-4 shadow">
          <div>
            <label className="mb-2 block text-sm font-medium">Izaberi datum</label>
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

        {/* tabela */}
        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 text-xl font-semibold">Aktivnosti za izabrani dan</h2>
          {loading && <p className="text-sm text-zinc-600">Ucitavanje...</p>}

          {!loading && rows.length === 0 && (
            <p className="text-sm text-zinc-600">Nema aktivnosti za izabrani datum.</p>
          )}

          {!loading && rows.length > 0 && (
            <Table columns={columns} data={rows} />
          )}
        </section>
      </main>
    </>
  );
}