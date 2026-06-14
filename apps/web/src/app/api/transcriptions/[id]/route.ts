import { NextResponse } from "next/server";
import { z } from "zod";
import { transcriptions, type UpdateTranscriptionInput } from "@repo/db";
import { auth } from "@/lib/auth";
import { deleteObject } from "@/lib/s3";

const segmentSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string().max(10_000),
});

const patchSchema = z
  .object({
    segments: z.array(segmentSchema).max(20_000).optional(),
    text: z.string().max(2_000_000).optional(),
  })
  .refine((d) => d.segments !== undefined || d.text !== undefined, {
    message: "Нет данных для сохранения",
  });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const transcription = await transcriptions.findOwned(params.id, session.user.id);
  if (!transcription) {
    return NextResponse.json({ error: "Транскрипция не найдена" }, { status: 404 });
  }

  return NextResponse.json(transcription);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const transcription = await transcriptions.findOwned(params.id, session.user.id);
  if (!transcription) {
    return NextResponse.json({ error: "Транскрипция не найдена" }, { status: 404 });
  }
  if (transcription.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Редактировать можно только завершённую транскрипцию" },
      { status: 409 }
    );
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const patch: UpdateTranscriptionInput = {};
  if (parsed.data.segments) {
    const segments = parsed.data.segments.map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    }));
    patch.segments = segments;
    patch.text = segments
      .map((s) => s.text.trim())
      .filter(Boolean)
      .join("\n");
  } else if (parsed.data.text !== undefined) {
    patch.text = parsed.data.text;
  }

  const updated = await transcriptions.update(transcription.id, patch);
  return NextResponse.json({ ok: true, updatedAt: updated?.updatedAt });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const transcription = await transcriptions.findOwned(params.id, session.user.id);
  if (!transcription) {
    return NextResponse.json({ error: "Транскрипция не найдена" }, { status: 404 });
  }

  if (transcription.fileKey) {
    await deleteObject(transcription.fileKey).catch(() => {
      // файл мог быть уже удалён — запись в БД всё равно убираем
    });
  }
  await transcriptions.remove(transcription.id);

  return NextResponse.json({ ok: true });
}
