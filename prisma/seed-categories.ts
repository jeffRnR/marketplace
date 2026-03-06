// prisma/seed-categories.ts
// Run once: npx ts-node prisma/seed-categories.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Music & Entertainment",      icon: "Music",    iconColor: "#099409" },
  { name: "Arts & Culture",              icon: "Palette",  iconColor: "#946809" },
  { name: "Conferences & Networking",    icon: "Users",    iconColor: "#093c94" },
  { name: "Food & Drink",                icon: "Utensils", iconColor: "#366b33" },
  { name: "Sports & Fitness",            icon: "Dumbbell", iconColor: "#6a701a" },
  { name: "Community & Lifestyle",       icon: "Group",    iconColor: "#6e4f1e" },
  { name: "Health & Wellness",           icon: "Heart",    iconColor: "#821515" },
  { name: "Special Occasions",           icon: "Gift",     iconColor: "#6e1582" },
  { name: "Technology & Education",      icon: "Cpu",      iconColor: "#153282" },
  { name: "Niche / Emerging",            icon: "Sparkles", iconColor: "#158275" },
];

async function main() {
  console.log("Seeding categories...\n");

  for (const cat of categories) {
    const result = await prisma.category.upsert({
      where:  { name: cat.name },
      update: { icon: cat.icon, iconColor: cat.iconColor },
      create: { name: cat.name, icon: cat.icon, iconColor: cat.iconColor },
    });
    console.log(`  ✓ [id=${result.id}] ${result.name}`);
  }

  console.log("\nAll categories seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());