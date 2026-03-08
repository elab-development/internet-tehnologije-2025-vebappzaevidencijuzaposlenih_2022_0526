# Veb Aplikacija za evidenciju prisustva zaposlenih

Fullstack veb aplikacija za upravljanje evidencijom prisustva zaposlenih, razvijena kao seminarski rad u
okviru predmeta Internet Tehnologije 2025.

## O aplikaciji

Aplikacija omogućava zaposlenima evidentiranje prisustva na poslu, pregled i dodavanje aktivnosti, a
administratorima i menadžerima upravljanje zaposlenima, aktivnostima, izveštajima i timovima.

### Uloge korisnika
- **Admin** — upravljanje zaposlenima, aktivnostima i timovima
- **Menadžer** — dodavanje aktivnosti i pregled aktivnosti/izveštaja svog tima
- **Zaposleni** — pregled aktivnosti i dodavanje aktivnosti

#### Test kredencijali

| Uloga   | Email                   | Lozinka |
|---------|-------------------------|---------|
|Admin    |admin@gmail.com          |1234     |
|Menadzer |zorana@gmail.com         |1234     |
|Zaposleni|danica@gmail.com         |1234     |
|Zaposleni|andjela@gmail.com        |1234     |

### Tehnologije
- **Frontend & Backend:** Next.js 16 (App Router, TypeScript)
- **Baza podataka:** PostgreSQL
- **ORM:** Drizzle
- **Autentifikacija:** JWT
- **Stilizacija:** Tailwind CSS
- **Kontejnerizacija:** Docker, Docker Compose

---

## Pokretanje aplikacije

### Preduslovi
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 20+](https://nodejs.org/) (za lokalni razvoj)

### 1. Kloniranje repozitorijuma
```bash
git clone https://github.com/elab-development/internet-tehnologije-2025-vebappzaevidencijuzaposlenih_2022_0526.git
cd .\internet-tehnologije-2025-vebappzaevidencijuzaposlenih_2022_0526\
```

### 2. Podešavanje environment varijabli
Kreiraj `.env` fajl u `internet-tehnologije-2025-vebappzaevidencijuzaposlenih_2022_0526/` folderu:
```env
DATABASE_URL="postgres://postgres:postgres@localhost:5432/iteh_evidencija"
JWT_SECRET=TAJNA_LOZINKA_ZA_JWT_TOKEN
```
### 3. Lokalni build
```bash
npm install
npx drizzle-kit generate 
npx drizzle-kit migrate 
npm run dev
```

### 4. Pokretanje sa Docker Compose
```bash
docker compose up
```
Aplikacija je dostupna na: **http://localhost:3000**

### 5. Punjenje baze test podacima (opciono)
```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/iteh_evidencija" 
npx ts-node --compiler-options `{"module":"CommonJS"}` db/seed.ts
```

## Sruktura projekta
```
internet-tehnologije-2025-vebappzaevidencijuzaposlenih_2022_0526/
├── src/
│   ├── app/
│   │   ├── api/          # REST API rute
│   │   ├── admin/        # Admin panel
│   │   ├── home/         # Početna stranica
│   │   ├── activities/   # Pregled aktivnosti
│   │   ├── login/        # Prijava
|   |   ├── reports/      # Pregled izveštaja
|   |   ├── team/         # Moj tim
│   │   └── profile/      # Moj profil    
│   ├── components/       # Reusable komponente
|   |   └── __tests__/    # Automatizovani testovi
│   └── lib/              # Pomoćna logika
|   |__ db/
|   |   ├── index.ts      # Inicijalizacija ORM-a
|   |   ├── schema.ts     # Šema baze podataka
|   |   ├── seed.ts       # Test podaci
├── Dockerfile
└── docker-compose.yaml
```

## API endpointi

| Metoda | Endpoint                            | Opis                                                     |
|--------|-------------------------------------|----------------------------------------------------------|
| GET    | /api/activities/export              | Eksport aktivnosti u ICS fajl                            |
| GET    | /api/activities                     | Vraća aktivnosti ulogovanog korisnika za izabrani datum  |
| POST   | /api/activities                     | Dodaje novu aktivnosti                                   |
| DELETE | /api/activities                     | Briše aktivnost                                          |
| GET    | /api/admin/activities               | Vraća aktivnosti za izabranog korisnika i datum          |
| POST   | /api/admin/activities               | Dodaje aktivnost zaposlenom                              |
| PATCH  | /api/admin/activities               | Menja aktivnost                                          |
| DELETE | /api/admin/activities               | Briše aktivnost                                          |
| GET    | /api/admin/users                    | Vraća sve korisnike                                      |
| POST   | /api/admin/users                    | Kreira novog korisnika                                   |
| PATCH  | /api/admin/users                    | Menja ulogu korisnika                                    |
| DELETE | /api/admin/users                    | Briše korisnika                                          |
| POST   | /api/attendance/check-in            | Evidentira check-in ulogovanog korisnika                 |
| POST   | /api/attendance/check-out           | Evidentira check-in ulogovanog korisnika                 |
| GET    | /api/attendance/today               | Vraća današnji attendance zapis ulogovanog korisnika     |
| POST   | /api/auth/login                     | Prijava korisnika                                        |
| POST   | /api/auth/logout                    | Odjava korisnika                                         |
| GET    | /api/auth/me                        | Podaci o ulogovanom korisniku                            |
| GET    | /api/external/holidays              | Briše korisnika                                          |
| GET    | /api/reports/employee-productivity  | Evidentira check-in ulogovanog korisnika                 |
| GET    | /api/reports/manager-activity-share | Evidentira check-in ulogovanog korisnika                 |
| GET    | /api/reports/manager-activity-titles| Lista naziva aktivnosti tima za izabrani mesec           |
| GET    | /api/reports/manager-team-month     | Ukupno trajanje aktivnosti članova tima za izabrani mesec|
| GET    | /api/team/users                     | Lista članova tima menadžera                             |


## Git grane
- `main` stabilna produkciona verzija
- `develop` integaciona grana
- `feature/security` 
- `feature/tests` upravljanje testovima
- `feature/reports` upravljanje izveštajima
- `feature/cicd` podešavanje CI/CD procesa za automatski build i deploy
- `feature/swagger` integracija Swagger dokumentacije za API
- `feature/holidays` integracija API-ja za državne praznike i onemogućavanje aktivnosti na praznike
- `feature/cloud` podešavanje cloud hostinga i deploy aplikacije