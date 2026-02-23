"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../../components/button";
import ActivityPieChart from "../../components/ActivityPieChart";

type ActivityShare = {
  title: string;
  minutes: number;
};

type EmployeeMonthReport = {
  month: string; // "YYYY-MM"
  workDaysCount: number;
  totalActivities: number;
  activitiesByTitle: ActivityShare[];
};

export default function ReportsPage() {
  async function handleRefresh() {
  if (!authChecked || !month) return;

  setLoading(true);
  setError("");
  setReport(null);

  try {
    const params = new URLSearchParams();
    params.set("month", month);

    const res = await fetch(
      `/api/reports/employee-month?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (res.status === 401) {
      router.replace("/login?next=/reports");
      return;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(
        data?.error || `Greška (${res.status}) pri učitavanju izveštaja.`
      );
      return;
    }

    setReport(data as EmployeeMonthReport);
  } catch {
    setError("Ne mogu da kontaktiram server.");
  } finally {
    setLoading(false);
  }
}
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  // lista dozvoljenih meseci: npr. poslednjih 6 prošlih meseci
  const monthOptions = useMemo(() => {
    const now = new Date();
    const result: string[] = [];

    // i = 1 je prošli mesec, i = 2 je pretprošli, ...
    for (let i = 0; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      result.push(`${y}-${m}`); // "YYYY-MM"
    }

    return result;
  }, []);

  const [month, setMonth] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<EmployeeMonthReport | null>(null);

  
  useEffect(() => {
  if (!authChecked || !month) return;
  handleRefresh();
}, [authChecked, month]);

  // AUTH
  useEffect(() => {
    async function checkAuth() {
      try {
        const meRes = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });
        const meData = await meRes.json().catch(() => null);
        const u = meData?.user ?? null;

        if (!u) {
          router.replace("/login?next=/reports");
          return;
        }

        setAuthChecked(true);
      } catch {
        router.replace("/login?next=/reports");
      }
    }

    checkAuth();
  }, [router]);

  // učitavanje izveštaja kad imamo auth + mesec
  useEffect(() => {
    if (!authChecked || !month) return;

    async function loadReport() {
      setLoading(true);
      setError("");
      setReport(null);

      try {
        const params = new URLSearchParams();
        params.set("month", month);

        const res = await fetch(
          `/api/reports/employee-month?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (res.status === 401) {
          router.replace("/login?next=/reports");
          return;
        }

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setError(
            data?.error || 'Greška (${res.status}) pri učitavanju izveštaja.'
          );
          setLoading(false);
          return;
        }

        setReport(data as EmployeeMonthReport);
        setLoading(false);
      } catch {
        setError("Ne mogu da kontaktiram server za izveštaj.");
        setLoading(false);
      }
    }

    loadReport();
  }, [authChecked, month, router]);

  // podaci za pie chart: ["Aktivnost", "Minuta"]
  const chartData = useMemo(() => {
    if (!report) return [];

    const rows: (string | number)[][] = [["Aktivnost", "Minuta"]];

    for (const a of report.activitiesByTitle) {
      rows.push([a.title, a.minutes]);
    }

    return rows;
  }, [report]);

  const totalMinutes = useMemo(() => {
    if (!report) return 0;
    return report.activitiesByTitle.reduce((sum, a) => sum + a.minutes, 0);
  }, [report]);

  if (!authChecked) {
    return (
      <main className="mx-auto max-w-4xl p-6 font-sans">
        <p className="text-sm text-zinc-600">Učitavanje...</p>
      </main>
    );
  }
  
  return (
    <main className="mx-auto max-w-4xl p-6 font-sans">
      <h1 className="mb-4 text-2xl font-semibold">Izveštaji</h1>

      {/* Filter meseca */}
      <section className="mb-6 rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">Pregled po mesecu</h2>

        <div className="flex flex-wrap items-end gap-4">
          <div>

            <label className="mb-2 block text-sm font-medium">
              Izaberi mesec
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Button text="Osveži" onClick={handleRefresh} />
          </div>
        </div>
      </section>

      {/* Greška */}
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <p className="mb-4 text-sm text-zinc-600">
          Učitavanje izveštaja za {month}...
        </p>
      )}

      {/* Ako ima reporta */}
      {!loading && report && (
        <>
          {/* Sažetak */}
          <section className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-zinc-500">
                Broj radnih dana
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {report.workDaysCount}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-zinc-500">
                Ukupan broj aktivnosti
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {report.totalActivities}
              </p>
            </div>

           <div className="rounded-xl bg-white p-4 shadow">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">
                UKUPNO RADNO VREME
              </p>

              {(() => {
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;

                return (
                  <p className="mt-2 text-2xl font-semibold">
                    {hours}h i {minutes} minuta
                  </p>
                );
              })()}
            </div>
          </section>

          {/* Udeo aktivnosti */}
          <section className="mb-6 rounded-xl bg-white p-4 shadow">
            {report.activitiesByTitle.length === 0 && (
              <p className="text-sm text-zinc-600">
                Nema zabeleženih aktivnosti za izabrani mesec.
              </p>
            )}

            {report.activitiesByTitle.length > 0 && (
              <div className="overflow-x-auto">
                
                <ActivityPieChart data={report.activitiesByTitle} />
              </div>
            )}
          </section>
        </>
      )}

      {!loading && !error && !report && (
        <p className="text-sm text-zinc-600">
          Nema podataka za izabrani mesec.
        </p>
      )}
    </main>
  );
}