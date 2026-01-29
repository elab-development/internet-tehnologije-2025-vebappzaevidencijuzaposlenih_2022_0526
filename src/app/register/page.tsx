"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "../../components/nav";
import Input from "../../components/input";
import Button from "../../components/button";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });

    if (res.ok) {
      router.push("/");
      return;
    }

    const data = await res.json().catch(() => null);
    setError(data?.error || "Greška pri registraciji");
  }

   return (
    <>
      {/* NAV IDE OVDE */}
      <Nav />

      {/* OVO JE OGRANIČENI SADRŽAJ */}
      <main className="mx-auto max-w-md p-6 font-sans">
        <h1 className="mb-4 text-2xl font-semibold">
          Registracija zaposlenog
        </h1>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <Input
            placeholder="Ime i prezime"
            value={fullName}
            onChange={setFullName}
          />
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

          <Button text="Registruj se" type="submit" />

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}
        </form>
      </main>
    </>
  );
}