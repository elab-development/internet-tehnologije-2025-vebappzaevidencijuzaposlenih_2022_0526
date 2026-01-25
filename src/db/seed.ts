import "dotenv/config";
import { db } from "./index";
import { roles, users } from "./schema";
import bcrypt from "bcrypt";

async function main() {
  const hash = await bcrypt.hash("1234", 10);

  await db.transaction(async (tx) => {
    // ubacivanje uloga
    await tx.insert(roles).values([
      { name: "ADMIN" },
      { name: "MANAGER" },
      { name: "EMPLOYEE" },
    ]);

    // ubacivanje korisnika
    await tx.insert(users).values([
      {
        fullName: "Administrator Sistema",
        email: "admin@gmail.com",
        passwordHash: hash,
        roleId: 1,
        isActive: true,
      },
      {
        fullName: "Zorana Kostic",
        email: "zorana@gmail.com",
        passwordHash: hash,
        roleId: 2,
        isActive: true,
      },
      {
        fullName: "Andjela Kandic",
        email: "andjela@gmail.com",
        passwordHash: hash,
        roleId: 3,
        isActive: true,
      },
      {
        fullName: "Danica Jovanovic",
        email: "danica@gmail.com",
        passwordHash: hash,
        roleId: 3, 
        isActive: true,
      },
    ]);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("Greška u seed skripti:", err);
  process.exit(1);
});