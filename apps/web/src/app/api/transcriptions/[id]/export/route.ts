import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/usage";
import { PLANS } from "@/lib/plans";

interface Segment {
  start: number;
  end: number;
  text: string;
}

function pad(n: number, width = 2): string {
  return String(Math.floor(n)).padStart(width, "0");
}

function timestamp(seconds: number, separator: "," | "."): string {
  const h = pad(seconds / 3600);
  const m = pad((seconds % 3600) / 60);
  const s = pad(seconds % 60);
  const ms = String(Math.round((seconds % 1) * 1000)).padStart(3, "0");
  return `${h}:${m}:${s}${separator}${ms}`;
}

function toSrt(segments: Segment[]): string {
  return segments
    .map(
      (seg, i) =>
        `${i + 1}\n${timestamp(seg.start, ",")} --> ${timestamp(seg.end, ",")}\n${seg.text.trim()}\n`
    )
    .join("\n");
}

function toVtt(segments: Segment[]): string {
  const body = segments
    .map(
      (seg) => `${timestamp(seg.start, ".")} --> ${timestamp(seg.end, ".")}\n${seg.text.trim()}\n`
    )
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const transcription = await prisma.transcription.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
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

  const segments = (transcription.segments as unknown as Segment[] | null) ?? [];
  const baseName = transcription.title.replace(/\.[^.]+$/, "").slice(0, 80) || "transcription";

  let content: string;
  let contentType: string;
  let ext: string;

  switch (format) {
    case "SRT":
      content = toSrt(segments);
      contentType = "application/x-subrip";
      ext = "srt";
      break;
    case "VTT":
      content = toVtt(segments);
      contentType = "text/vtt";
      ext = "vtt";
      break;
    case "TXT":
    default: {
      content = transcription.text ?? segments.map((s) => s.text.trim()).join("\n");
      if (planConfig.watermark) {
        content += "\n\n---\nРасшифровано на сервисе «Голос в текст»";
      }
      contentType = "text/plain";
      ext = "txt";
      break;
    }
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}.${ext}"`,
    },
  });
}
