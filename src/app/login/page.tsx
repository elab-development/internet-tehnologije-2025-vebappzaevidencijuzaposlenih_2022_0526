"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "../../components/nav";
import Input from "../../components/input";
import Button from "../../components/button";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let res: Response;

    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });
    } catch {
      setError("Ne mogu da kontaktiram server.");
      return;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error || `Greška (${res.status})`);
      return;
    }

    // uspešan login → backend je setovao auth cookie
    router.push("/home");
  }

  return (
    <>
      <Nav />

      <main className="mx-auto max-w-md p-6 font-sans">
        <h1 className="mb-4 text-2xl font-semibold">
          Prijava zaposlenog
        </h1>

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

          <Button text="Prijavi se" type="submit" />

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


/*"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Nav from "../../components/nav";
import Input from "../../components/input";
import Button from "../../components/button";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      // POSLE LOGIN-A IDEMO NA DRUGU STRANICU
      router.push("/attendance");
      return;
    }

    const data = await res.json().catch(() => null);
    setError(data?.error || "Greška pri logovanju");
  }

  return (
    <>
      <Nav />

      <main className="mx-auto max-w-md p-6 font-sans">
        <h1 className="mb-4 text-2xl font-semibold">
          Prijava zaposlenog
        </h1>

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

          <Button text="Prijavi se" type="submit" />

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}
        </form>
      </main>
    </>
  );
}*/