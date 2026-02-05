"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../../components/button";
import { useAuth } from "../../components/AuthProvider";

type TodayRecord = {
  id: number;
  workDate: string;
  checkIn: string;
  checkOut: string | null;
} | null;

export default function HomePage() {
  const router = useRouter();
  const { status, user } = useAuth();

  const today = new Date().toLocaleDateString("sr-RS");

  // SVI hookovi su gore, bez uslova
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<TodayRecord>(null);
  const [error, setError] = useState("");

  // ako nije ulogovan → redirect na /login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // učitavanje današnjeg zapisa, ali tek kad imamo auth user-a
  useEffect(() => {
    if (status !== "authenticated" || !user) return;

    loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user]);

  async function loadToday() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/attendance/today", {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);

    setRecord(data?.record ?? null);
    setLoading(false);
  }
  
  async function handleCheckIn() {
    setError("");
    const res = await fetch("/api/attendance/check-in", {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || "Greška pri check-in.");
      return;
    }
    await loadToday();
  }

  async function handleCheckOut() {
    setError("");
    const res = await fetch("/api/attendance/check-out", {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || "Greška pri check-out.");
      return;
    }
    await loadToday();
  }

  // dok auth još “mota” ili radimo redirect, ne crtamo ništa
  if (status !== "authenticated" || !user) {
    return null;
  }

  const hasCheckIn = !!record?.checkIn;
  const hasCheckOut = !!record?.checkOut;

  const checkInDisabled = hasCheckIn;
  const checkOutDisabled = !hasCheckIn || hasCheckOut;

  return (
    <main className="mx-auto max-w-3xl p-6 font-sans">
      <h1 className="mb-2 text-2xl font-semibold">Evidencija prisustva</h1>

      <p className="mb-6 text-zinc-600">
        Današnji datum: <b>{today}</b>
      </p>

      <div className="mb-4 flex gap-3">
        <Button
          text="Check in"
          onClick={handleCheckIn}
          disabled={checkInDisabled || loading}
        />
        <Button
          text="Check out"
          onClick={handleCheckOut}
          disabled={checkOutDisabled || loading}
        />
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!loading && (
        <p className="mb-6 text-sm text-green-700">
          Status:{" "}
          {!record
            ? "Nema evidencije za danas."
            : record.checkOut
            ? `Check-out u ${new Date(record.checkOut).toLocaleTimeString(
                "sr-RS",
                { hour: "2-digit", minute: "2-digit" }
              )}`
            : `Check-in u ${new Date(record.checkIn).toLocaleTimeString(
                "sr-RS",
                { hour: "2-digit", minute: "2-digit" }
              )}`}
        </p>
      )}
    </main>
  );
}
