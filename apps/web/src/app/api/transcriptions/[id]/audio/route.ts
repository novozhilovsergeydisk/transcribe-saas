import { NextResponse } from "next/server";
import { transcriptions } from "@repo/db";
import { auth } from "@/lib/auth";
import { createDownloadUrl } from "@/lib/s3";

export const runtime = "nodejs";

// Отдаёт исходный медиафайл для проигрывания в редакторе: проверяет владельца
// и редиректит на presigned-ссылку S3/MinIO (поддерживает range-запросы → перемотка).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const transcription = await transcriptions.findOwned(params.id, session.user.id);
  if (!transcription || transcription.source !== "UPLOAD" || !transcription.fileKey) {
    return NextResponse.json({ error: "Аудио недоступно" }, { status: 404 });
  }

  const url = await createDownloadUrl(transcription.fileKey, {
    contentType: transcription.mimeType ?? undefined,
  });
  return NextResponse.redirect(url, 302);
}
