export type Holiday = {
  date: string; // "YYYY-MM-DD"
  localName: string;
  name: string;
};

// uzimamo praznike za godinu/drzavu direktno sa Nager API-ja
export async function getPublicHolidays(year: string | number, country = "RS") {
  const res = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`,
    { cache: "no-store" } // da uvek dobijemo sveze
  );

  if (!res.ok) {
    throw new Error("Nager API error");
  }

  const data = await res.json();

  const holidays: Holiday[] = (data ?? []).map((h: any) => ({
    date: String(h.date),
    localName: String(h.localName),
    name: String(h.name),
  }));

  return holidays;
}

export async function isHoliday(dateISO: string, country = "RS") {
  const year = dateISO.slice(0, 4);
  const holidays = await getPublicHolidays(year, country);
  const found = holidays.find((h) => h.date === dateISO);
  return found ? found : null;
}