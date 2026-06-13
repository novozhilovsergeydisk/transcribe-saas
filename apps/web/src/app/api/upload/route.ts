import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createUploadUrl } from "@/lib/s3";

const ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/ogg",
  "video/mp4",
  "video/quicktime", // MOV
  "video/x-msvideo", // AVI
  "video/x-matroska", // MKV
  "video/webm",
];

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 ГБ

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().refine((t) => ALLOWED_MIME_TYPES.includes(t), {
    message: "Неподдерживаемый формат файла",
  }),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, "Файл больше 2 ГБ"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const parsed = uploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Некорректные данные" },
      { status: 400 }
    );
  }

  const { fileName, contentType } = parsed.data;
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
  const fileKey = `uploads/${session.user.id}/${randomUUID()}.${ext}`;

  const uploadUrl = await createUploadUrl(fileKey, contentType);

  return NextResponse.json({ uploadUrl, fileKey });
}
