import { db } from "../../src/db";
import { attributeGroups, attributeValues } from "../../src/db/schema";
import { nanoid } from "nanoid";

export async function seedAttributes() {
  console.log("Seeding attributes...");

  const groups = [
    { name: "Length", code: "length", attributeType: "VARIANT" as const, variantAxis: true, values: ["Short", "Medium", "Long", "Extra Long"] },
    { name: "Shape", code: "shape", attributeType: "VARIANT" as const, variantAxis: true, values: ["Coffin", "Almond", "Square", "Stiletto"] },
    { name: "Texture", code: "texture", attributeType: "CATALOG" as const, variantAxis: false, values: ["Matte", "Glossy", "Glitter"] },
    { name: "Colour", code: "colour", attributeType: "CATALOG" as const, variantAxis: false, values: ["Nude", "Pink", "Red", "Blue", "White", "Black"] },
    { name: "Style", code: "style", attributeType: "CATALOG" as const, variantAxis: false, values: ["Minimalist", "Floral", "Ombre", "French", "Classic"] },
    { name: "Occasion", code: "occasion", attributeType: "CATALOG" as const, variantAxis: false, values: ["Casual", "Wedding", "Party", "Festive"] }
  ];

  await db.transaction(async (tx) => {
    for (const group of groups) {
      const groupId = `attr_grp_${nanoid(10)}`;
      
      // Attempt to insert the group
      await tx.insert(attributeGroups).values({
        id: groupId,
        name: group.name,
        code: group.code,
        attributeType: group.attributeType,
        variantAxis: group.variantAxis,
        filterable: true,
        searchable: true,
        visibleOnPdp: true,
        displayOrder: 0
      }).onConflictDoNothing();

      // Fetch the group ID (to support re-running safely)
      const existingGroup = await tx.query.attributeGroups.findFirst({
        where: (ag, { eq }) => eq(ag.code, group.code)
      });
      
      const targetGroupId = existingGroup ? existingGroup.id : groupId;

      for (const val of group.values) {
        const code = val.toLowerCase().replace(/\s+/g, "_");
        
        const existingVal = await tx.query.attributeValues.findFirst({
          where: (av, { and, eq }) => and(eq(av.groupId, targetGroupId), eq(av.code, code))
        });

        if (!existingVal) {
          await tx.insert(attributeValues).values({
            id: `attr_val_${nanoid(10)}`,
            groupId: targetGroupId,
            value: val,
            code: code
          });
        }
      }
    }
  });

  console.log("Attributes seeded successfully!");
}
