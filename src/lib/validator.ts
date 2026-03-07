import { z } from "zod";

// 1) VALIDACIJA DATUMA, proveravamo da li je string validan datum oblika YYYY-MM-DD
export function isValidISODate(date: string) {

  // Delimo string po znaku - (npr. "2026-02-24" transformisemou ["2026","02","24"])
  const parts = date.split("-");

  // ako nemamo tacno 3 dela (god, mes, dan), vracamo false
  if (parts.length !== 3) return false;

  // razdvajamo delove u promenljive
  const [y, m, d] = parts;

  if (y.length !== 4 || m.length !== 2 || d.length !== 2) return false;

  const year = Number(y);
  const month = Number(m);
  const day = Number(d);

    //validacija
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  // Pravimo Date objekat u UTC vr zoni
  const dt = new Date(Date.UTC(year, month - 1, day));

  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

// 2) VALIDACIJA VREMENA (HH:MM ili HH:MM:SS
export function isValidTime(time: string) {
  const s = time.trim();

  // Delimo po : ("09:30" u ["09","30"])
  const parts = s.split(":");

  // samo 2 ili 3 dela (HH:MM ili HH:MM:SS)
  if (parts.length !== 2 && parts.length !== 3) return false;


  const [hh, mm, ss] = parts;
  if (hh.length !== 2 || mm.length !== 2) return false;
  if (parts.length === 3 && ss.length !== 2) return false; //ako postoji sekund

  const h = Number(hh);
  const m = Number(mm);
  const sec = parts.length === 3 ? Number(ss) : 0;

  if (![h, m, sec].every(Number.isInteger)) return false;


  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;
  if (sec < 0 || sec > 59) return false;

  return true;
}


// 3) ZOD SCHEMA ZA DATUM
export const dateSchema = z
  .string()
  .trim()
  .min(1, "Datum je obavezan.")
  .refine(isValidISODate, "Neispravan datum (ocekivan YYYY-MM-DD).");



// 4) ZOD SCHEMA ZA VREME
export const timeSchema = z
  .string()
  .trim()
  .min(1, "Vreme je obavezno.")
  .refine(isValidTime, "Neispravno vreme (HH:MM ili HH:MM:SS).");

// 5) SCHEMA ZA GET /api/activities- ocekuje objekat koji ima samo polje date
export const activitiesGetQuerySchema = z.object({
  date: dateSchema,
});

// 6) SCHEMA ZA POST /api/activities- definisemo kako mora izgledati body zahteva
export const activitiesCreateBodySchema = z.object({
  // datum mora biti validan
  date: dateSchema,

  // title mora biti string, trimovan, najmanje 1 karakter, max 120
  title: z.string().trim().min(1).max(120),

  // description opcion nullable ili string do 1000 char
  description: z.string().trim().max(1000).nullable().optional(),

  // isto i vreme pocetka i kraja mora biti validno vreme
  startTime: timeSchema,
  endTime: timeSchema,
});

// 7) SCHEMA ZA DELETE /api/activities- ocekujemo objekat koji ima niz brojeva "ids"
export const activitiesDeleteBodySchema = z.object({
  // ids mora biti niz: svaki element poz. ceo broj; niz ima bar 1 element
  ids: z.array(z.number().int().positive()).min(1),
});

// 8) SCHEMA ZA ADMIN POST jer admin mora da pošalje i userId (za kog zaposlenog se kreira aktivnost)
export const adminActivitiesCreateBodySchema = z.object({
  userId: z.number().int().positive(),
  date: dateSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  startTime: timeSchema,
  endTime: timeSchema,
});

// 9) SCHEMA ZA ADMIN PATCH jer id je obavezan
export const adminActivitiesPatchBodySchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.startTime !== undefined ||
      data.endTime !== undefined,
    { message: "Nema polja za izmenu." }
  );

//10) SCHEMA AUTH LOGIN 
export const authLoginBodySchema = z.object({
  email: z.string().trim().min(1, "Email je obavezan.").email("Neispravan email."),
  password: z.string().min(1, "Lozinka je obavezna.").max(200, "Lozinka je preduga."),
});