"use client";

import { useState } from "react";
import Nav from "../../components/nav";
import Button from "../../components/button";
import Input from "../../components/input";
import Table from "../../components/table";

export default function ActivitiesPage() {
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [showModal, setShowModal] = useState(false);

  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [activityName, setActivityName] = useState("");

  function handleSaveActivity() {
    console.log(fromTime, toTime, activityName);
    setShowModal(false);

    setFromTime("");
    setToTime("");
    setActivityName("");
  }

  // TABELA: kolone + primer podaci (kasnije možeš da ubaciš state listu)
  const columns = [
    { header: "Vreme od", accessor: "from" },
    { header: "Vreme do", accessor: "to" },
    { header: "Naziv aktivnosti", accessor: "name" },
  ];

  const data = [
    { from: "09:00", to: "11:00", name: "Rad na projektu" },
    { from: "11:15", to: "12:30", name: "Sastanak tima" },
  ];

  return (
    <>
      <Nav />

      <main className="mx-auto max-w-3xl p-6 font-sans">
        <h1 className="mb-4 text-2xl font-semibold">Aktivnosti zaposlenog</h1>

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

          <Button text="Dodaj aktivnost" onClick={() => setShowModal(true)} />
        </div>

        {/* TABELA AKTIVNOSTI */}
        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 text-xl font-semibold">
            Aktivnosti za izabrani dan
          </h2>

          <Table columns={columns} data={data} />
        </section>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Nova aktivnost</h2>

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
              <label className="mb-1 block text-sm">Naziv aktivnosti</label>
              <Input
                placeholder="npr. Predavanje iz PIS"
                value={activityName}
                onChange={setActivityName}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button text="Otkaži" onClick={() => setShowModal(false)} />
              <Button text="Sačuvaj" onClick={handleSaveActivity} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
