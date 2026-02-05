"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "./input";
import Button from "./button";
import { useAuth } from "./AuthProvider";

export default function AuthForm({ mode }: { mode: "login" }) {
  const router = useRouter();
  const { refresh } = useAuth(); // obaveštavamo globalni auth posle logina

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include", // zbog auth cookie-a
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || `Greška (${res.status})`);
        return;
      }

      // obavesti AuthProvider-u da smo sad ulogovani
      await refresh();

      // idi na home
      router.replace("/home");
    } catch {
      setError("Ne mogu da kontaktiram server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6 font-sans">
      <h1 className="mb-4 text-2xl font-semibold">Prijava zaposlenog</h1>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <Input
          placeholder="Email"
          value={email}
          onChange={setEmail}
        />

        <Input
          placeholder="Lozinka"
          type="password"
          value={password}
          onChange={setPassword}
        />

        <Button
          text={loading ? "Prijavljivanje..." : "Prijavi se"}
          type="submit"
          disabled={loading}
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </form>
    </main>
  );
}
