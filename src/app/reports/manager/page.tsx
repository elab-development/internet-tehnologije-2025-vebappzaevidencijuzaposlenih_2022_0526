"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Chart } from "react-google-charts";
import Button from "../../../components/button";

function formatMonthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-");
  return `${m}.${y}`;
}

function lastNMonths(n: number) {
  const now = new Date();
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
  }
  return months;
}

type TeamMemberMonthRow = {
  userId: number;
  fullName: string;
  totalMinutes: number;
};

type ActivityShareRow = {
  userId: number;
  fullName: string;
  minutes: number;
};

export default function ManagerReportsPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState("");

  // mesec (poslednjih 6)
  const monthOptions = useMemo(() => lastNMonths(6), []);
  const [month, setMonth] = useState<string>(() => monthOptions[monthOptions.length - 1]);

  // bar chart data
  const [teamMonth, setTeamMonth] = useState<TeamMemberMonthRow[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  // dropdown aktivnosti + pie data
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [share, setShare] = useState<ActivityShareRow[]>([]);
  const [loadingShare, setLoadingShare] = useState(false);

  // AUTH (isto kao kod vas)
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
          router.replace("/login?next=/reports/manager");
          return;
        }

        setAuthChecked(true);
      } catch {
        router.replace("/login?next=/reports/manager");
      }
    }

    checkAuth();
  }, [router]);

  // Učitaj bar chart (teamMonth) za izabrani mesec
  async function loadTeamMonth() {
    if (!authChecked || !month) return;

    setLoadingMonth(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("month", month);

      const res = await fetch(`/api/reports/manager-team-month?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 401) {
        router.replace("/login?next=/reports/manager");
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || `Greška (${res.status}) pri učitavanju izveštaja.`);
        return;
      }

      if (!Array.isArray(data)) {
        setTeamMonth([]);
        return;
      }

      setTeamMonth(
        data.map((x: any) => ({
          userId: Number(x.userId),
          fullName: String(x.fullName),
          totalMinutes: Number(x.totalMinutes ?? 0),
        }))
      );
    } catch {
      setError("Ne mogu da kontaktiram server za izveštaj tima.");
    } finally {
      setLoadingMonth(false);
    }
  }

  // Učitaj listu aktivnosti (titles) za izabrani mesec
  async function loadTitles() {
    if (!authChecked || !month) return;

    setError("");

    try {
      const params = new URLSearchParams();
      params.set("month", month);

      const res = await fetch(`/api/reports/manager-activity-titles?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 401) {
        router.replace("/login?next=/reports/manager");
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || `Greška (${res.status}) pri učitavanju aktivnosti.`);
        setTitles([]);
        setSelectedTitle("");
        return;
      }

      if (!Array.isArray(data)) {
        setTitles([]);
        setSelectedTitle("");
        return;
      }

      const list = data.map((t: any) => String(t));
      setTitles(list);

      // default: prva aktivnost
      setSelectedTitle(list[0] ?? "");
    } catch {
      setError("Ne mogu da kontaktiram server za aktivnosti.");
      setTitles([]);
      setSelectedTitle("");
    }
  }

  // Učitaj pie chart (share) kad imamo month + selectedTitle
  async function loadShare() {
    if (!authChecked || !month || !selectedTitle) {
      setShare([]);
      return;
    }

    setLoadingShare(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("month", month);
      params.set("title", selectedTitle);

      const res = await fetch(`/api/reports/manager-activity-share?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 401) {
        router.replace("/login?next=/reports/manager");
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || `Greška (${res.status}) pri učitavanju učešća.`);
        setShare([]);
        return;
      }

      if (!Array.isArray(data)) {
        setShare([]);
        return;
      }

      setShare(
        data.map((x: any) => ({
          userId: Number(x.userId),
          fullName: String(x.fullName),
          minutes: Number(x.minutes ?? 0),
        }))
      );
    } catch {
      setError("Ne mogu da kontaktiram server za učešće u aktivnosti.");
      setShare([]);
    } finally {
      setLoadingShare(false);
    }
  }

  // automatsko učitavanje kad se menja mesec
  useEffect(() => {
    if (!authChecked) return;
    loadTeamMonth();
    loadTitles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, month]);

  // učitavanje pie chart kad se promeni selectedTitle
  useEffect(() => {
    if (!authChecked) return;
    loadShare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, month, selectedTitle]);

  // Bar chart data: ["Član", "Sati"] (pretvaramo minute u sate radi lepšeg prikaza)
  const barChartData = useMemo(() => {
    const header: (string | number)[] = ["Član tima", "Trajanje (h)"];

    const rows = teamMonth.map((m) => {
      const hours = Math.round((m.totalMinutes / 60) * 10) / 10; // 1 decimala
      return [m.fullName, hours] as (string | number)[];
    });

    return [header, ...rows];
  }, [teamMonth]);

  // Pie chart data: ["Član", "Minuta"]
  const pieChartData = useMemo(() => {
    const header: (string | number)[] = ["Član", "Minuta"];
    const rows = share.map((s) => [s.fullName, s.minutes] as (string | number)[]);
    return [header, ...rows];
  }, [share]);

  if (!authChecked) {
    return (
      <main className="mx-auto max-w-5xl p-6 font-sans">
        <p className="text-sm text-zinc-600">Učitavanje...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6 font-sans">
      <h1 className="mb-4 text-2xl font-semibold">Izveštaji (Menadžer)</h1>

      {/* Filter meseca */}
      <section className="mb-6 rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">Filter</h2>

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
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Button text="Osveži" onClick={() => { loadTeamMonth(); loadTitles(); }} />
          </div>
        </div>
      </section>

      {/* Greška */}
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Bar chart */}
      <section className="mb-6 rounded-xl bg-white p-6 shadow">
        <h2 className="mb-3 text-lg font-semibold">
          Ukupno trajanje aktivnosti po članu tima ({formatMonthLabel(month)})
        </h2>

        {loadingMonth ? (
          <p className="text-sm text-zinc-600">Učitavanje...</p>
        ) : teamMonth.length === 0 ? (
          <p className="text-sm text-zinc-600">Nema podataka za izabrani mesec.</p>
        ) : (
          <Chart
            chartType="ColumnChart"
            width="100%"
            height="420px"
            data={barChartData}
            options={{
              legend: { position: "none" },
              hAxis: { title: "Član tima" },
              vAxis: { title: "Trajanje (h)", minValue: 0 },
            }}
          />
        )}
      </section>

      {/* Pie chart */}
      <section className="rounded-xl bg-white p-6 shadow">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Udeo članova tima za aktivnost</h2>

          <div>
            <label className="mb-2 block text-sm font-medium">Aktivnost</label>
            <select
              value={selectedTitle}
              onChange={(e) => setSelectedTitle(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              disabled={titles.length === 0}
            >
              {titles.length === 0 && <option value="">Nema aktivnosti</option>}
              {titles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingShare ? (
          <p className="text-sm text-zinc-600">Učitavanje...</p>
        ) : !selectedTitle ? (
          <p className="text-sm text-zinc-600">Izaberi aktivnost.</p>
        ) : !Array.isArray(share) ? (
          <p className="text-sm text-zinc-600">Greška: neispravan format podataka.</p>
        ) : share.filter((x) => (x.minutes ?? 0) > 0).length === 0 ? (
          <p className="text-sm text-zinc-600">
            Nema podataka za aktivnost “{selectedTitle}” u izabranom mesecu.
          </p>
        ) : (
          <Chart
            chartType="PieChart"
            width="100%"
            height="420px"
            data={[
              ["Član", "Minuta"],
              ...share
                .filter((x) => (x.minutes ?? 0) > 0)
                .map((s) => [s.fullName, s.minutes]),
            ]}
            options={{
              legend: { position: "right" },
              pieHole: 0.35,
            }}
          />
        )}
      </section>
    </main>
  );
}