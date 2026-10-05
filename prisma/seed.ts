// prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import { eventCategorySeeds, marketplaceCategorySeeds } from './categorySeedData';

const prisma = new PrismaClient()
const categorySeeds = [...eventCategorySeeds, ...marketplaceCategorySeeds];

async function main() {
  console.log(`\nStarting category seeding...`);
  console.log(`Loaded ${categorySeeds.length} category seeds.`);
  console.log(`---------------------------------`);

  for (const category of categorySeeds) {
    console.log(`Attempting to seed: ${category.name}`);
    try {
      await prisma.category.upsert({
        where: { name: category.name },
        update: {
          name:      category.name,
          kind:      category.kind,
          icon:      category.icon,
          iconColor: category.iconColor,
        },
        create: {
          name:      category.name,
          kind:      category.kind,
          icon:      category.icon,
          iconColor: category.iconColor,
        },
      });
      console.log(`Upserted: ${category.name}`);
    } catch (error) {
      console.error(`FAILED: ${category.name}`, error);
    }
  }

  console.log(`\n---------------------------------`);
  console.log(`Done. ${categorySeeds.length} records processed.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); })