import type { Metadata } from "next";
import { NewTranscription } from "./new-transcription";

export const metadata: Metadata = { title: "Новая транскрипция" };

export default function NewTranscriptionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Новая транскрипция</h1>
        <p className="text-sm text-muted-foreground">
          Загрузите файл или вставьте ссылку на видео.
        </p>
      </div>
      <NewTranscription />
    </div>
  );
}
