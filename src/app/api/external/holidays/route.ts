import { NextResponse } from "next/server";

type NagerHoliday = {
  date: string; // "YYYY-MM-DD"
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties?: string[] | null;
  launchYear?: number | null;
  types: string[];
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // default: Srbija
    const countryCode = String(url.searchParams.get("country") ?? "RS").toUpperCase();

    // default: tekuća godina
    const yearParam = url.searchParams.get("year");
    const parsedYear = Number(yearParam);
    const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
    // poziv ka eksternom API-ju
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      {
        // Next.js cache: moze i "no-store" ako hocemo uvek sveze
        // vo se menja retko, pa je OK da se kesira.
        next: { revalidate: 60 * 60 * 24 }, // 24h
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Nager API error (${res.status})` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as NagerHoliday[];

    // vraćamo samo ono što nam treba 
    const simplified = data.map((h) => ({
      date: h.date,
      localName: h.localName,
      name: h.name,
      types: h.types,
    }));

    return NextResponse.json({ countryCode, year, holidays: simplified }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Greška pri učitavanju praznika." },
      { status: 500 }
    );
  }
}