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

/**
 * @swagger
 * /api/external/holidays:
 *   get:
 *     summary: Vraca listu drzavnih praznika
 *     description: Vraca praznike za zadatu drzavu i godinu preko eksternog Nager API servisa. Ako parametri nisu prosledjeni, koristi se RS i tekuca godina.
 *     tags:
 *       - External
 *     parameters:
 *       - in: query
 *         name: country
 *         required: false
 *         schema:
 *           type: string
 *           example: "RS"
 *         description: Kod drzave
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: integer
 *           example: "2026"
 *         description: Godina za koju se vracaju praznici
 *     responses:
 *       200:
 *         description: Uspesno vracena lista praznika
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 countryCode:
 *                   type: string
 *                   example: "RS"
 *                 year:
 *                   type: integer
 *                   example: "2026"
 *                 holidays:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         example: "2026-01-01"
 *                       localName:
 *                         type: string
 *                         example: "Nova godina"
 *                       name:
 *                         type: string
 *                         example: "New Year's Day"
 *                       types:
 *                         type: array
 *                         items:
 *                           type: string
 *                           example: "Public"
 *       502:
 *         description: Greska eksternog servisa
 *       500:
 *         description: Greska pri ucitavanju praznika
 */


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