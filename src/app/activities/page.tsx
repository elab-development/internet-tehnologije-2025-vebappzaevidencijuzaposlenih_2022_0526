"use client";

import { useState } from "react";
import Nav from "../../components/nav";
import Button from "../../components/button";
import Input from "../../components/input";

export default function ActivitiesPage() {
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [showModal, setShowModal] = useState(false);

  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [activityName, setActivityName] = useState("");

  function handleSaveActivity() {
    // za sad samo zatvaramo modal (kasnije može čuvanje u listu)
    console.log(fromTime, toTime, activityName);
    setShowModal(false);

    // reset polja
    setFromTime("");
    setToTime("");
    setActivityName("");
  }

  return (
    <>
      <Nav />

      <main className="mx-auto max-w-3xl p-6 font-sans">
        <h1 className="mb-4 text-2xl font-semibold">
          Aktivnosti zaposlenog
        </h1>

        {/* KALENDAR + DUGME */}
        <div className="mb-6 flex items-end justify-between gap-4 rounded-xl bg-white p-4 shadow">
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

          <Button
            text="Dodaj aktivnost"
            onClick={() => setShowModal(true)}
          />
        </div>

        {/* LISTA AKTIVNOSTI */}
        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 text-xl font-semibold">
            Aktivnosti za izabrani dan
          </h2>

          <ul className="space-y-2">
            <li className="rounded-lg border p-3">
              09:00 – 11:00 • Rad na projektu
            </li>
            <li className="rounded-lg border p-3">
              11:15 – 12:30 • Sastanak tima
            </li>
          </ul>
        </section>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              Nova aktivnost
            </h2>

            <div className="mb-3">
              <label className="mb-1 block text-sm">Vreme od</label>
              <Input
                type="time"
                value={fromTime}
                onChange={setFromTime}
                placeholder=""
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm">Vreme do</label>
              <Input
                type="time"
                value={toTime}
                onChange={setToTime}
                placeholder=""
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm">
                Naziv aktivnosti
              </label>
              <Input
                placeholder="npr. Predavanje iz PIS"
                value={activityName}
                onChange={setActivityName}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                text="Otkaži"
                onClick={() => setShowModal(false)}
              />
              <Button
                text="Sačuvaj"
                onClick={handleSaveActivity}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
