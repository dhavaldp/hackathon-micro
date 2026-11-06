import { prisma } from "../src/db/client";

async function seedDemoUsers() {
  for (const user of [
    { id: "demo-avery", displayName: "Avery Example", contactDetails: "avery@example.invalid" },
    { id: "demo-blair", displayName: "Blair Example", contactDetails: "blair@example.invalid" },
    { id: "demo-casey", displayName: "Casey Example", contactDetails: "casey@example.invalid" },
  ]) {
    await prisma.demoUser.upsert({ where: { id: user.id }, create: user, update: { contactDetails: user.contactDetails } });
  }
}

seedDemoUsers().then(
  async () => { await prisma.$disconnect(); },
  async (error: unknown) => { console.error("Demo seed failed:", error); await prisma.$disconnect(); process.exitCode = 1; },
);
