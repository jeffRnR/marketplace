// prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import { categories as localCategories } from '../data/categories';

const prisma = new PrismaClient()

async function main() {
  console.log(`\nStarting category seeding...`);
  console.log(`Loaded ${localCategories.length} categories from file.`);
  console.log(`---------------------------------`);

  for (const category of localCategories) {
    console.log(`Attempting to seed: ${category.name}`);
    try {
      await prisma.category.upsert({
        where: { id: category.id },
        update: {
          name:      category.name,
          icon:      category.iconName,
          iconColor: category.iconColor,
        },
        create: {
          id:        category.id,
          name:      category.name,
          icon:      category.iconName,
          iconColor: category.iconColor,
        },
      });
      console.log(`Upserted: ${category.name} (ID: ${category.id})`);
    } catch (error) {
      console.error(`FAILED: ${category.name} (ID: ${category.id})`, error);
    }
  }

  console.log(`\n---------------------------------`);
  console.log(`Done. ${localCategories.length} records processed.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); })