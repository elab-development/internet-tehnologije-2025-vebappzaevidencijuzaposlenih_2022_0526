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

  // selektovani redovi
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // forma za novu aktivnost
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");

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
      setSelectedIds([]); // reset selekcije kada promenimo datum

      try {
        const res = await fetch(
          `/api/activities?date=${encodeURIComponent(date)}`,
          {
            method: "GET",
            credentials: "include",
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

  // toggle jednog reda
  function handleToggleRow(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // toggle svih redova
  function handleToggleAll() {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r.id));
    }
  }

  // eksport svih ili selektovanih aktivnosti za dan
  async function handleExport() {
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("date", date);

      if (selectedIds.length > 0) {
        params.set("ids", selectedIds.join(","));
      }

      const res = await fetch(`/api/activities/export?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || `Eksport nije uspeo (${res.status})`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download =
        selectedIds.length > 0
          ? `aktivnosti_${date}_selektovane.ics`
          : `aktivnosti_${date}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch {
      setError("Ne mogu da kontaktiram server za eksport.");
    }
  }

  // brisanje selektovanih
  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;

    const confirmDelete = window.confirm(
      `Da li si sigurna da želiš da obrišeš ${selectedIds.length} aktivnost(i)?`
    );
    if (!confirmDelete) return;

    setError("");

    try {
      const res = await fetch("/api/activities", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedIds,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || `Greška pri brisanju (${res.status})`);
        return;
      }

      setRows((prev) => prev.filter((row) => !selectedIds.includes(row.id)));
      setSelectedIds([]);
    } catch {
      setError("Ne mogu da kontaktiram server pri brisanju.");
    }
  }

  // dodavanje nove aktivnosti
  async function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!newTitle.trim() || !newStartTime || !newEndTime) {
      setError("Naziv i vremena su obavezni.");
      return;
    }

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          startTime: newStartTime,
          endTime: newEndTime,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || `Greška pri dodavanju (${res.status})`);
        return;
      }

      const created = data?.activity as ActivityRow | undefined;

      if (created) {
        setRows((prev) =>
          [...prev, created].sort((a, b) =>
            a.startTime.localeCompare(b.startTime)
          )
        );
      }

      // reset forme
      setNewTitle("");
      setNewDescription("");
      setNewStartTime("");
      setNewEndTime("");
      setShowAddForm(false);
    } catch {
      setError("Ne mogu da kontaktiram server pri dodavanju.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6 font-sans">
      <h1 className="mb-4 text-2xl font-semibold">Aktivnosti</h1>

      {/* filter datuma + dugmad Obriši / Dodaj */}
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
          {selectedIds.length > 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              Selektovano aktivnosti: <b>{selectedIds.length}</b>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              text="Obriši selektovane"
              onClick={handleDeleteSelected}
              disabled={loading}
            />
          )}
          <Button
            text={showAddForm ? "Otkaži dodavanje" : "Dodaj aktivnost"}
            onClick={() => {
              if (showAddForm) {
                // zatvaramo formu → očisti grešku i polja
                setError("");
                setNewTitle("");
                setNewDescription("");
                setNewStartTime("");
                setNewEndTime("");
              }
              setShowAddForm((prev) => !prev);
            }}
            disabled={loading}
          />
          
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* forma za novu aktivnost */}
      {showAddForm && (
        <section className="mb-4 rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Nova aktivnost</h2>
          <form
            onSubmit={handleCreateActivity}
            className="grid gap-3 md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm text-zinc-600">
                Vreme od
              </label>
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-600">
                Vreme do
              </label>
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-zinc-600">
                Naziv aktivnosti
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Npr. Rad na korisničkom interfejsu"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-zinc-600">
                Opis (opciono)
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="Detaljniji opis zadatka..."
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button text="Sačuvaj aktivnost" type="submit" />
            </div>
          </form>
        </section>
      )}

      {/* tabela aktivnosti */}
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
          <Table
            columns={columns}
            data={rows}
            selectable
            selectedIds={selectedIds}
            onToggleRow={handleToggleRow}
            onToggleAll={handleToggleAll}
            idField="id"
          />
        )}
      </section>

      {/* dugme za eksport na dnu strane */}
      <div className="mt-6 flex justify-end">
        <Button
          text={
            selectedIds.length > 0
              ? "Eksportuj selektovane"
              : "Eksportuj sve"
          }
          onClick={handleExport}
          disabled={loading || rows.length === 0}
        />
      </div>
    </main>
  );
}
