import { PrismaClient, PlanType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Демо-пользователь для разработки: demo@example.com / demo1234
  // Хэш сгенерирован bcrypt(10) от "demo1234"
  const demoEmail = "demo@example.com";
  const existing = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (existing) {
    console.log("Seed: демо-пользователь уже существует, пропускаю");
    return;
  }

  const { hashSync } = await import("bcryptjs");

  await prisma.user.create({
    data: {
      email: demoEmail,
      name: "Демо Пользователь",
      passwordHash: hashSync("demo1234", 10),
      privacyAcceptedAt: new Date(),
      personalDataAcceptedAt: new Date(),
      subscription: {
        create: { plan: PlanType.FREE },
      },
    },
  });

  console.log("Seed: создан demo@example.com / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
