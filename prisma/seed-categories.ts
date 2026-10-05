// prisma/seed-categories.ts
// Run once: npx ts-node prisma/seed-categories.ts

import { PrismaClient } from "@prisma/client";
import { eventCategorySeeds, marketplaceCategorySeeds } from "./categorySeedData";

const prisma = new PrismaClient();
const categories = [...eventCategorySeeds, ...marketplaceCategorySeeds];

async function main() {
  console.log("Seeding categories...\n");

  for (const cat of categories) {
    const result = await prisma.category.upsert({
      where:  { name: cat.name },
      update: { kind: cat.kind, icon: cat.icon, iconColor: cat.iconColor },
      create: { name: cat.name, kind: cat.kind, icon: cat.icon, iconColor: cat.iconColor },
    });
    console.log(`  ✓ [id=${result.id}] ${result.name}`);
  }

  console.log("\nAll categories seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());