// prisma/seed.ts (FINAL UPDATED VERSION)

import { PrismaClient } from '@prisma/client'
import { categories as localCategories } from '../data/categories'; 

// Initialize Prisma client
const prisma = new PrismaClient()

async function main() {
  // First log to confirm the script started and data was loaded
  console.log(`\n✨ Starting category seeding...`);
  console.log(`Loaded ${localCategories.length} categories from file.`);
  console.log(`---------------------------------`);

  // Loop through all categories for insertion
  for (const category of localCategories) {
    console.log(`Attempting to seed: ${category.name}`);

    try {
      // Ensure iconName is extracted correctly (assuming fixed data structure)
      const iconName: string = category.iconName; 

      await prisma.category.upsert({
        where: { id: category.id },
        update: {
          name: category.name,
          eventsCount: category.eventsCount,
          icon: iconName, 
          iconColor: category.iconColor,
        },
        create: {
          id: category.id,
          name: category.name,
          eventsCount: category.eventsCount,
          icon: iconName, 
          iconColor: category.iconColor,
        },
      });
      console.log(`✅ Upserted category: ${category.name} (ID: ${category.id})`);

    } catch (error) {
      // 🚨 CRITICAL: Log the detailed Prisma error object for debugging
      console.error(`❌ FAILED to seed category ${category.name} (ID: ${category.id})!`);
      console.error('*** PRISMA ERROR DETAILS ***', error);
      // We do NOT exit here, allowing the script to attempt the next category
    }
  }

  console.log(`\n---------------------------------`);
  console.log(`🎉 Category seeding complete. ${localCategories.length} records processed.`);
}

main()
  .catch((e) => {
    // Catch global, unhandled errors (like connection failure)
    console.error("\n*** GLOBAL SEEDING ERROR ***\n", e);
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })