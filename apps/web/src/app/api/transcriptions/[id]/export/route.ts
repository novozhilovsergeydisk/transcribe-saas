import { NextResponse } from "next/server";
import { transcriptions } from "@repo/db";
import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/usage";
import { PLANS } from "@/lib/plans";
import { buildExport } from "@/lib/export-formats";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const transcription = await transcriptions.findOwned(params.id, session.user.id);
  if (!transcription || transcription.status !== "COMPLETED") {
    return NextResponse.json({ error: "Транскрипция не готова" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") ?? "txt").toUpperCase();

  const plan = await getUserPlan(session.user.id);
  const planConfig = PLANS[plan];
  if (!planConfig.exportFormats.includes(format)) {
    return NextResponse.json(
      { error: `Формат ${format} доступен на тарифе Pro и выше` },
      { status: 403 }
    );
  }

  const segments = transcription.segments ?? [];
  const baseName = transcription.title.replace(/\.[^.]+$/, "").slice(0, 80) || "transcription";

  const { body, contentType, ext, binary } = await buildExport(format, {
    title: transcription.title,
    text: transcription.text,
    segments,
    watermark: planConfig.watermark,
    createdAt: transcription.createdAt,
    durationSec: transcription.durationSec,
    language: transcription.language,
  });

  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": binary ? contentType : `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}.${ext}"`,
    },
  });
}
