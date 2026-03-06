import "dotenv/config";
import { db } from "./index";
import {
  roles,
  users,
  groups,
  userGroups,
  workDayRecords,
  activities,
} from "./schema";
import bcrypt from "bcrypt";

async function main() {
  const hash = await bcrypt.hash("1234", 10);

  await db.transaction(async (tx) => {
    await tx.insert(roles).values([
      { name: "ADMIN" },
      { name: "MANAGER" },
      { name: "EMPLOYEE" },
    ]);

    const insertedUsers = await tx
      .insert(users)
      .values([
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
      ])
      .returning();

    const zorana = insertedUsers[1];
    const andjela = insertedUsers[2];
    const danica = insertedUsers[3];

    const insertedGroup = await tx
      .insert(groups)
      .values({
        name: "Tim Zorana",
        description: "Tim menadzera Zorane",
      })
      .returning();

    const groupId = insertedGroup[0].id;

    await tx.insert(userGroups).values([
      {
        userId: zorana.id,
        groupId,
      },
      {
        userId: andjela.id,
        groupId,
      },
      {
        userId: danica.id,
        groupId,
      },
    ]);

    async function generateWorkAndActivities(userId: number, personLabel: string) {
      const dates = [
        "2026-02-03",
        "2026-02-04",
        "2026-02-05",
        "2026-02-06",
        "2026-02-10",
        "2026-02-11",
        "2026-02-12",
        "2026-02-13",
        "2026-02-17",
        "2026-02-18",
        "2026-02-19",
        "2026-02-20",
        "2026-02-24",
        "2026-02-25",
        "2026-02-26",
        "2026-02-27",
        "2026-03-01",
        "2026-03-02",
        "2026-03-03",
        "2026-03-04",
        "2026-03-05",
        "2026-03-06",
      ];

      for (const date of dates) {
        const day = await tx
          .insert(workDayRecords)
          .values({
            userId,
            workDate: date,
            checkIn: new Date(`${date}T09:00:00`),
            checkOut: new Date(`${date}T17:00:00`),
            hours: 8,
            note: `Radni dan - ${personLabel}`,
          })
          .returning();

        const workDayId = day[0].id;

        await tx.insert(activities).values([
          {
            workDayId,
            title: "Razvoj funkcionalnosti",
            description: `Implementacija zadataka - ${personLabel}`,
            startTime: "09:00:00",
            endTime: "12:00:00",
            minutesSpent: 180,
          },
          {
            workDayId,
            title: "Testiranje i ispravke",
            description: `Provera i dorade - ${personLabel}`,
            startTime: "13:00:00",
            endTime: "16:00:00",
            minutesSpent: 180,
          },
        ]);
      }
    }

    await generateWorkAndActivities(andjela.id, "Andjela");
    await generateWorkAndActivities(danica.id, "Danica");
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("Greska u seed skripti:", err);
  process.exit(1);
});