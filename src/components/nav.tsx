import Link from "next/link";

export default function Nav() {
  return (
    <nav className="mb-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <Link href="/" className="text-sm font-semibold text-zinc-900">
        Evidencija prisustva
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Home
        </Link>

        <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Moj profil
        </Link>

        <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Izvestaji
        </Link>
         <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Aktivnosti
        </Link>
         <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Log out
        </Link>
      </div>
    </nav>
  );
}