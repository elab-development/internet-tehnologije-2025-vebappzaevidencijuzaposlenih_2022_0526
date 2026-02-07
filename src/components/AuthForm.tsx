"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "./input";
import Button from "./button";
import { useAuth } from "./AuthProvider";

type AuthFormMode = "login" | "admin";

type AuthFormProps = {
  mode: AuthFormMode;
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { refresh, logout } = useAuth(); // 👈 dodali smo logout

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdminMode = mode === "admin";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        // pošalji i mode, da i backend zna odakle je login
        body: JSON.stringify({
          email,
          password,
          mode: isAdminMode ? "admin" : "employee",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || `Greška (${res.status})`);
        return;
      }

      // osveži globalni auth context
      await refresh();

      // pokupi aktuelnog user-a
      const meRes = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });
      const meData = await meRes.json().catch(() => null);
      const me = meData?.user ?? null;

      // --- DODATNE PROVERE ---

      if (isAdminMode) {
  // ADMIN LOGIN FORMA: mora da bude admin
  if (!me || me.roleId !== 1) {
    // samo pogodi backend logout, ali ne radi redirect
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    setError("Ovaj nalog nema administratorska prava.");
    // ostajemo na /login/admin, samo prikažemo poruku
    return;
  }

  // ako jeste admin → idi na admin panel
  router.replace("/admin");
  return;


// običan login zaposlenog
router.replace("/home");
      } else {
        // ZAPOSLENI LOGIN FORMA: admin NE sme da se prijavi ovde
        if (me && me.roleId === 1) {
          await logout();
          setError(
            "Administratori se prijavljuju preko administratorske forme."
          );
          return;
        }

        router.replace("/home");
      }
    } catch {
      setError("Ne mogu da kontaktiram server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6 font-sans">
      <h1 className="mb-4 text-2xl font-semibold">
        {isAdminMode ? "Prijava administratora" : "Prijava zaposlenog"}
      </h1>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <Input placeholder="Email" value={email} onChange={setEmail} />

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
          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
      </form>

      {/* LINK ZA ADMIN / POVRATAK */}
      <p className="mt-4 text-xs text-zinc-500">
        {!isAdminMode ? (
          <Link
            href="/login/admin"
            className="text-blue-600 hover:underline"
          >
            Prijavi se kao administrator
          </Link>
        ) : (
          <>
            Nisi administrator?{" "}
            <Link
              href="/login"
              className="text-blue-600 hover:underline"
            >
              nazad na prijavu zaposlenog
            </Link>
          </>
        )}
      </p>
    </main>
  );
}


/*"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "./input";
import Button from "./button";
import { useAuth } from "./AuthProvider";

type AuthFormMode = "login" | "admin";

type AuthFormProps = {
  mode: AuthFormMode;
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdminMode = mode === "admin";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
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

      await refresh();

      // dodatna provera za admin formu
      if (isAdminMode) {
        const meRes = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        const meData = await meRes.json().catch(() => null);
        const me = meData?.user ?? null;

        if (!me || me.roleId !== 1) {
          // nije admin → odjavi ga i prijavi grešku
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });

          setError("Ovaj nalog nema administratorska prava.");
          return;
        }

        router.replace("/admin");
      } else {
        router.replace("/home");
      }
    } catch {
      setError("Ne mogu da kontaktiram server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6 font-sans">
      <h1 className="mb-4 text-2xl font-semibold">
        {isAdminMode ? "Prijava administratora" : "Prijava zaposlenog"}
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

        <Button
          text={loading ? "Prijavljivanje..." : "Prijavi se"}
          type="submit"
          disabled={loading}
        />

        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </form>

      // LINK ZA ADMIN / POVRATAK 
      <p className="mt-4 text-xs text-zinc-500">
        {!isAdminMode ? (
          <>
           
            <Link
              href="/login/admin"
              className="text-blue-600 hover:underline"
            >
              Prijavi se kao administrator
            </Link>
          </>
        ) : (
          <>
            Nisi administrator?{" "}
            <Link
              href="/login"
              className="text-blue-600 hover:underline"
            >
              nazad na prijavu zaposlenog
            </Link>
          </>
        )}
      </p>
    </main>
  );
}*/