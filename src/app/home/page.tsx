"use client";

import { useState } from "react";
import Nav from "../../components/nav";
import Button from "../../components/button";

export default function HomePage() {
  const today = new Date().toLocaleDateString("sr-RS");

  const [status, setStatus] = useState<"in" | "out" | null>(null);
  const [time, setTime] = useState<string>("");

  function nowTime() {
    return new Date().toLocaleTimeString("sr-RS", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleCheckIn() {
    setStatus("in");
    setTime(nowTime());
  }

  function handleCheckOut() {
    setStatus("out");
    setTime(nowTime());
  }

  const checkInDisabled = status === "in";
  const checkOutDisabled = status !== "in"; // disable dok nije check in

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl p-6 font-sans">
        <h1 className="mb-2 text-2xl font-semibold">Evidencija prisustva</h1>

        <p className="mb-6 text-zinc-600">
          Današnji datum: <b>{today}</b>
        </p>

        {/* CHECK IN / CHECK OUT */}
        <div className="mb-4 flex gap-3">
          <Button text="Check in" onClick={handleCheckIn} disabled={checkInDisabled} />
          <Button text="Check out" onClick={handleCheckOut} disabled={checkOutDisabled} />
        </div>

        {/* STATUS */}
        {status && (
          <p className="mb-6 text-sm text-green-600">
            Status:{" "}
            {status === "in"
              ? `Ulogovana (${time})`
              : `Odjavljena (${time})`}
          </p>
        )}

        {/* AKTIVNOSTI */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">Današnje aktivnosti</h2>

          <ul className="space-y-2">
            <li className="rounded-lg border p-3">
              14:00 – 16:00 • PIS predavanje
            </li>
            <li className="rounded-lg border p-3">
              16:15 – 18:00 • Vežbe iz internet tehnologija
            </li>
            <li className="rounded-lg border p-3">
              18:15 – 19:00 • Samostalni rad
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}