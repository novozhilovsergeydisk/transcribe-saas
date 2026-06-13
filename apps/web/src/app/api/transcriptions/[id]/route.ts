import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "@/lib/auth";
import { deleteObject } from "@/lib/s3";

async function findOwned(id: string, userId: string) {
  return prisma.transcription.findFirst({ where: { id, userId } });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const transcription = await findOwned(params.id, session.user.id);
  if (!transcription) {
    return NextResponse.json({ error: "Транскрипция не найдена" }, { status: 404 });
  }

  return NextResponse.json(transcription);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const transcription = await findOwned(params.id, session.user.id);
  if (!transcription) {
    return NextResponse.json({ error: "Транскрипция не найдена" }, { status: 404 });
  }

  if (transcription.fileKey) {
    await deleteObject(transcription.fileKey).catch(() => {
      // файл мог быть уже удалён — запись в БД всё равно убираем
    });
  }
  await prisma.transcription.delete({ where: { id: transcription.id } });

  return NextResponse.json({ ok: true });
}
