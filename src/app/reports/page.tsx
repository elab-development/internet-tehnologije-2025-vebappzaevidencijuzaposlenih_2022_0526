
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReportsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const meRes = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });
        const meData = await meRes.json().catch(() => null);
        const u = meData?.user ?? null;

        if (!u) {
          router.replace("/login?next=/reports");
          return;
        }

        setAuthChecked(true);
      } catch {
        router.replace("/login?next=/reports");
      }
    }

    checkAuth();
  }, [router]);

  if (!authChecked) {
    return (
      <main className="mx-auto max-w-3xl p-6 font-sans">
        <p className="text-sm text-zinc-600">Učitavanje...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 font-sans">
      <h1 className="mb-4 text-2xl font-semibold">Izvestaji</h1>
      <div className="rounded-xl bg-white p-6 shadow">
        <p className="text-zinc-700">To be implemented… :)</p>
      </div>
    </main>
  );
}