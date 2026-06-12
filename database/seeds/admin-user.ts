import { db } from "../../src/db";
import { users } from "../../src/db/schema";
import { nanoid } from "nanoid";

export async function seedAdminUser() {
  console.log("Seeding admin user...");

  // Default admin user details
  const adminPhone = "+919999999999";
  await db.transaction(async (tx) => {
    const existingAdmin = await tx.query.users.findFirst({
      where: (u, { eq }) => eq(u.phoneNumber, adminPhone),
    });

    if (!existingAdmin) {
      await tx.insert(users).values({
        id: `usr_${nanoid(10)}`,
        firebaseUid: "admin-firebase-uid-placeholder",
        phoneNumber: adminPhone,
        name: "Snail Studio Admin",
        email: "admin@snailstudio.com",
        role: "admin",
        phoneVerified: true,
        isActive: true,
      });
      console.log("Admin user seeded successfully!");
    } else {
      console.log("Admin user already exists. Skipping.");
    }
  });
}
