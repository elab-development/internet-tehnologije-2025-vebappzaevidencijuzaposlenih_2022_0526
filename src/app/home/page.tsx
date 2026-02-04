"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/nav";
import Button from "../../components/button";

type TodayRecord = {
  id: number;
  workDate: string;
  checkIn: string;
  checkOut: string | null;
} | null;

export default function HomePage() {
  const today = new Date().toLocaleDateString("sr-RS");

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<TodayRecord>(null);
  const [error, setError] = useState("");

  async function loadToday() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/attendance/today", { method: "GET" });
    const data = await res.json().catch(() => null);

    setRecord(data?.record ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadToday();
  }, []);

  async function handleCheckIn() {
    setError("");
    const res = await fetch("/api/attendance/check-in", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || "Greška pri check-in.");
      return;
    }
    await loadToday(); // ucitaj ponovo iz baze
  }

  async function handleCheckOut() {
    setError("");
    const res = await fetch("/api/attendance/check-out", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || "Greška pri check-out.");
      return;
    }
    await loadToday(); // ucitaj ponovo iz baze
  }

  const hasCheckIn = !!record?.checkIn;
  const hasCheckOut = !!record?.checkOut;

  const checkInDisabled = hasCheckIn;          // ako je vec checkIn, disable
  const checkOutDisabled = !hasCheckIn || hasCheckOut; // mora prvo checkIn, i samo jednom

  return (
    <>
      <Nav />

      <main className="mx-auto max-w-3xl p-6 font-sans">
        <h1 className="mb-2 text-2xl font-semibold">Evidencija prisustva</h1>

        <p className="mb-6 text-zinc-600">
          Današnji datum: <b>{today}</b>
        </p>

        <div className="mb-4 flex gap-3">
          <Button text="Check in" onClick={handleCheckIn} disabled={checkInDisabled || loading} />
          <Button text="Check out" onClick={handleCheckOut} disabled={checkOutDisabled || loading} />
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {!loading && (
          <p className="mb-6 text-sm text-green-700">
            Status:{" "}
            {!record
              ? "Nema evidencije za danas."
              : record.checkOut
              ? `Check-out u ${new Date(record.checkOut).toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}`
              : `Check-in u ${new Date(record.checkIn).toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        )}
      </main>
    </>
  );
}

