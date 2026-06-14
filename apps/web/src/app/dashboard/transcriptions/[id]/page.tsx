import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { transcriptions } from "@repo/db";
import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/usage";
import { PLANS } from "@/lib/plans";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { AutoRefresh } from "./auto-refresh";
import { TranscriptEditor } from "./transcript-editor";
import { formatDate, formatDuration } from "@/lib/utils";

export default async function TranscriptionPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const transcription = await transcriptions.findOwned(params.id, session!.user.id);
  if (!transcription) notFound();

  const plan = await getUserPlan(session!.user.id);
  const FORMAT_ORDER = ["TXT", "DOCX", "PDF", "SRT", "VTT"];
  const planFormats = PLANS[plan].exportFormats;
  const formats = FORMAT_ORDER.filter((f) => planFormats.includes(f));

  const inProgress = ["PENDING", "DOWNLOADING", "PROCESSING"].includes(transcription.status);
  const segments = transcription.segments ?? [];
  const audioAvailable = transcription.source === "UPLOAD" && !!transcription.fileKey;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {inProgress && <AutoRefresh />}

      <div>
        <Link
          href="/dashboard/history"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> К истории
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="break-all text-2xl font-bold">{transcription.title}</h1>
          <StatusBadge status={transcription.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(transcription.createdAt)}
          {transcription.durationSec ? ` · ${formatDuration(transcription.durationSec)}` : ""}
          {transcription.language && transcription.language !== "auto"
            ? ` · ${transcription.language.toUpperCase()}`
            : ""}
        </p>
      </div>

      {inProgress && (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="mx-auto h-2 max-w-sm overflow-hidden rounded-full bg-muted">
              <div
                className="h-full animate-pulse rounded-full bg-primary transition-all"
                style={{ width: `${Math.max(5, transcription.progress)}%` }}
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {transcription.status === "PENDING" && "Ожидает в очереди…"}
              {transcription.status === "DOWNLOADING" && "Скачиваем исходник…"}
              {transcription.status === "PROCESSING" &&
                `Распознаём речь… ${transcription.progress}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Страница обновится автоматически.
            </p>
          </CardContent>
        </Card>
      )}

      {transcription.status === "FAILED" && (
        <Card className="border-destructive/50">
          <CardContent className="py-6">
            <p className="font-medium text-destructive">Не удалось обработать запись</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {transcription.error ?? "Неизвестная ошибка. Попробуйте загрузить файл ещё раз."}
            </p>
          </CardContent>
        </Card>
      )}

      {transcription.status === "COMPLETED" && (
        <>
          <div className="flex flex-wrap gap-2">
            {formats.map((format) => (
              <a
                key={format}
                href={`/api/transcriptions/${transcription.id}/export?format=${format.toLowerCase()}`}
                download
              >
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" aria-hidden />
                  {format}
                </Button>
              </a>
            ))}
          </div>

          <TranscriptEditor
            transcriptionId={transcription.id}
            initialSegments={segments}
            initialText={transcription.text ?? ""}
            audioAvailable={audioAvailable}
          />
        </>
      )}
    </div>
  );
}
