"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../../components/button";
import ActivityPieChart from "../../components/ActivityPieChart";
import { Chart } from "react-google-charts";

function formatMonthLabel(yyyyMm: string) {
  // ulaz: "2026-02"
  const [y, m] = yyyyMm.split("-");
  return `${m}.${y}`; // npr. "02.2026"
}

// Helper: napravi listu poslednjih N meseci (uključujući tekući mesec)
// Vraća niz u formatu "YYYY-MM"
function lastNMonths(n: number) {
  const now = new Date();
  const months: string[] = [];

  // i ide od najstarijeg ka najnovijem (da graf bude hronološki)
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
  }

  return months;
}

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

// ProductivityPoint sada prati backend: API vraća totalHours (NE totalMinutes)
type ProductivityPoint = {
  month: string; // "YYYY-MM"
  totalHours: number;
};

export default function ReportsPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);

  // ovo ti realno ne treba, ali ostavljam jer je bilo u fajlu
  const [selectedMonth, setSelectedMonth] = useState("");
  const [hasFetched, setHasFetched] = useState(false);

  // lista dozvoljenih meseci: poslednjih 6 meseci (uključujući tekući)
  const monthOptions = useMemo(() => {
    const now = new Date();
    const result: string[] = [];

    // i = 0 je tekući mesec, i = 1 je prošli, ...
    // < 6 => ukupno 6 meseci (NE 7)
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      result.push(`${y}-${m}`); // "YYYY-MM"
    }

    return result;
  }, []);

  // default: prvo ponuđeno (tekući mesec), da strana odmah pokaže nešto
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<EmployeeMonthReport | null>(null);

  // produktivnost: po mesecu, ukupno radnih sati
  const [productivity, setProductivity] = useState<ProductivityPoint[]>([]);

  // Funkcija za ručno osvežavanje (dugme "Osveži")
  async function handleRefresh() {
    if (!authChecked || !month) return;

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const params = new URLSearchParams();
      params.set("month", month);

      const res = await fetch(`/api/reports/employee-month?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 401) {
        router.replace("/login?next=/reports");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || `Greška (${res.status}) pri učitavanju izveštaja.`);
        return;
      }

      setReport(data as EmployeeMonthReport);
    } catch {
      setError("Ne mogu da kontaktiram server.");
    } finally {
      setLoading(false);
    }
  }

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

  // automatsko osvežavanje kad se promeni mesec (i imamo auth)
  useEffect(() => {
    if (!authChecked || !month) return;
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, month]);

  // učitavanje produktivnosti za poslednjih 6 meseci
  useEffect(() => {
    async function loadProductivity() {
      try {
        const res = await fetch("/api/reports/employee-productivity", {
          method: "GET",
          credentials: "include",
        });

        // ako je istekao login
        if (res.status === 401) {
          router.replace("/login?next=/reports");
          return;
        }

        const data = await res.json().catch(() => null);

        if (!Array.isArray(data)) return;

        // Backend vraća: { month, totalHours }
        setProductivity(
          data.map((item: any) => ({
            month: String(item.month),
            totalHours: Number(item.totalHours ?? 0),
          }))
        );
      } catch {
        setError("Ne mogu da kontaktiram server za produktivnost.");
      }
    }

    loadProductivity();
  }, [router]);

  // podaci za pie chart (Aktivnost / Minuta)
  const chartData = useMemo(() => {
    if (!report) return [];

    const rows: (string | number)[][] = [["Aktivnost", "Minuta"]];

    for (const a of report.activitiesByTitle) {
      rows.push([a.title, a.minutes]);
    }

    return rows;
  }, [report]);

  // računamo ukupno minuta iz aktivnosti (za karticu "UKUPNO RADNO VREME")
  const totalMinutes = useMemo(() => {
    if (!report) return 0;
    return report.activitiesByTitle.reduce((sum, a) => sum + a.minutes, 0);
  }, [report]);

  // Definisanje podataka za stubicasti grafikon (produktivnost)
  // Važno: uvek prikazujemo TAČNO poslednjih 6 meseci i ako neki mesec nema podatke → 0 sati
  const productivityChartData = useMemo(() => {
    const months = lastNMonths(6);

    // mapiramo API rezultate po mesecu radi lakšeg popunjavanja "rupa"
    const byMonth = new Map<string, number>();
    for (const p of productivity) {
      byMonth.set(p.month, p.totalHours ?? 0);
    }

    return [
      ["Mesec", "Radni sati"],
      ...months.map((m) => {
        const hours = byMonth.get(m) ?? 0;

        // zaokruži na 1 decimalu, npr. 52.5
        const rounded = Math.round(hours * 10) / 10;

        return [formatMonthLabel(m), rounded];
      }),
    ];
  }, [productivity]);

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
            <label className="mb-2 block text-sm font-medium">Izaberi mesec</label>
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
        <p className="mb-4 text-sm text-zinc-600">Učitavanje izveštaja za {month}...</p>
      )}

      {/* Ako ima reporta */}
      {!loading && report && (
        <>
          {/* Sažetak */}
          <section className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-zinc-500">Broj radnih dana</p>
              <p className="mt-1 text-2xl font-semibold">{report.workDaysCount}</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-zinc-500">Ukupan broj aktivnosti</p>
              <p className="mt-1 text-2xl font-semibold">{report.totalActivities}</p>
            </div>

            <div className="rounded-xl bg-white p-4 shadow">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">UKUPNO TRAJANJE AKTIVNOSTI</p>

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

          {/* Produktivnost (stubičasti grafikon) */}
          <section className="mt-10 rounded-xl bg-white p-6 shadow">
            <h2 className="mb-3 text-lg font-semibold">
              Produktivnost u poslednjih 6 meseci
            </h2>

            {productivityChartData ? (
              <Chart
                chartType="ColumnChart"
                width="100%"
                height="400px"
                data={productivityChartData}
                options={{
                  legend: { position: "none" },
                  hAxis: { title: "Mesec" },
                  vAxis: { title: "Radni sati", minValue: 0  },
                }}
              />
            ) : (
              <p className="text-sm text-zinc-600">
                Nema podataka o produktivnosti za poslednjih 6 meseci.
              </p>
            )}
          </section>
        </>
      )}

      {!loading && !error && !report && (
        <p className="text-sm text-zinc-600">Nema podataka za izabrani mesec.</p>
      )}
    </main>
  );
}