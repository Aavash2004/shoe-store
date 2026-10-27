import { prisma } from "../lib/db/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    }
  });

  console.log("=== USERS IN DATABASE ===");
  users.forEach((u) => {
    console.log(`- ${u.name || "No Name"} | ${u.email} | Role: ${u.role}`);
  });
}

main().finally(async () => {
  await prisma.$disconnect();
  process.exit(0);
});
