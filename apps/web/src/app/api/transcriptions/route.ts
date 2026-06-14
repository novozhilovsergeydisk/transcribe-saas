import { NextResponse } from "next/server";
import { z } from "zod";
import { transcriptions, type TranscriptionStatus } from "@repo/db";
import { auth } from "@/lib/auth";
import { enqueueTranscription } from "@/lib/queue";
import { getRemainingSeconds, getUserPlan } from "@/lib/usage";

const createSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("UPLOAD"),
    title: z.string().trim().min(1).max(255),
    fileKey: z.string().min(1),
    mimeType: z.string().min(1),
    fileSize: z.number().int().positive(),
    language: z.string().max(10).default("auto"),
  }),
  z.object({
    source: z.literal("URL"),
    title: z.string().trim().min(1).max(255),
    sourceUrl: z.string().url("Некорректная ссылка"),
    language: z.string().max(10).default("auto"),
  }),
]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Некорректные данные" },
      { status: 400 }
    );
  }

  const remaining = await getRemainingSeconds(session.user.id);
  if (remaining !== null && remaining <= 0) {
    return NextResponse.json(
      { error: "Лимит минут на этот месяц исчерпан. Обновите тариф, чтобы продолжить." },
      { status: 402 }
    );
  }

  const data = parsed.data;
  const transcription = await transcriptions.create({
    userId: session.user.id,
    title: data.title,
    source: data.source,
    language: data.language,
    ...(data.source === "UPLOAD"
      ? { fileKey: data.fileKey, mimeType: data.mimeType, fileSize: data.fileSize }
      : { sourceUrl: data.sourceUrl }),
  });

  const plan = await getUserPlan(session.user.id);
  await enqueueTranscription(transcription.id, plan === "FREE" ? 10 : 1);

  return NextResponse.json({ id: transcription.id }, { status: 201 });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 10;
  const query = searchParams.get("q")?.trim();
  const status = searchParams.get("status");

  const filter = {
    userId: session.user.id,
    query: query || undefined,
    status: status && status !== "ALL" ? (status as TranscriptionStatus) : undefined,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };

  const [items, total] = await Promise.all([
    transcriptions.list(filter),
    transcriptions.count(filter),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
