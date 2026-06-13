import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@repo/db";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(100),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  password: z.string().min(8, "Пароль должен быть не короче 8 символов").max(128),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: "Необходимо согласие с Политикой конфиденциальности" }),
  }),
  personalDataAccepted: z.literal(true, {
    errorMap: () => ({ message: "Необходимо согласие на обработку персональных данных" }),
  }),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Проверьте данные формы" },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Пользователь с таким email уже зарегистрирован" },
      { status: 409 }
    );
  }

  const now = new Date();
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hash(password, 10),
      privacyAcceptedAt: now,
      personalDataAcceptedAt: now,
      subscription: { create: { plan: "FREE" } },
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
