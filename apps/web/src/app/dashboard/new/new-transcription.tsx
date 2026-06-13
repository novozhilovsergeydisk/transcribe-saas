"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileUp, Link2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: "auto", label: "Автоопределение" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "Английский" },
  { value: "de", label: "Немецкий" },
  { value: "fr", label: "Французский" },
  { value: "es", label: "Испанский" },
  { value: "zh", label: "Китайский" },
];

const ACCEPT = ".mp3,.wav,.m4a,.ogg,.mp4,.mov,.avi,.mkv,.webm";
const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 ГБ

type Tab = "upload" | "url";

function LanguageSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="language">Язык записи</Label>
      <select
        id="language"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NewTranscription() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("upload");
  const [language, setLanguage] = React.useState("auto");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // --- загрузка файла ---
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // --- URL ---
  const [url, setUrl] = React.useState("");

  function pickFile(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (f.size > MAX_SIZE) {
      setError("Файл больше 2 ГБ");
      return;
    }
    setFile(f);
  }

  function uploadWithProgress(uploadUrl: string, f: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", f.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Загрузка не удалась (${xhr.status})`));
      xhr.onerror = () => reject(new Error("Сетевая ошибка при загрузке"));
      xhr.send(f);
    });
  }

  async function submitUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);

    try {
      const contentType = file.type || "application/octet-stream";
      const presignRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType, fileSize: file.size }),
      });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось подготовить загрузку");
      }
      const { uploadUrl, fileKey } = await presignRes.json();

      await uploadWithProgress(uploadUrl, file);

      const createRes = await fetch("/api/transcriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "UPLOAD",
          title: file.name,
          fileKey,
          mimeType: contentType,
          fileSize: file.size,
          language,
        }),
      });
      if (!createRes.ok) {
        const data = await createRes.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось создать транскрипцию");
      }
      const { id } = await createRes.json();
      router.push(`/dashboard/transcriptions/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Что-то пошло не так");
      setBusy(false);
    }
  }

  async function submitUrl(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/transcriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "URL",
          title: url,
          sourceUrl: url,
          language,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось создать транскрипцию");
      }
      const { id } = await res.json();
      router.push(`/dashboard/transcriptions/${id}`);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Что-то пошло не так");
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "upload"}
            onClick={() => setTab("upload")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
              tab === "upload" ? "bg-background shadow-sm" : "text-muted-foreground"
            )}
          >
            <FileUp className="h-4 w-4" aria-hidden /> Файл
          </button>
          <button
            role="tab"
            aria-selected={tab === "url"}
            onClick={() => setTab("url")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
              tab === "url" ? "bg-background shadow-sm" : "text-muted-foreground"
            )}
          >
            <Link2 className="h-4 w-4" aria-hidden /> По ссылке
          </button>
        </div>

        {tab === "upload" ? (
          <div className="space-y-4">
            {!file ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  pickFile(e.dataTransfer.files[0]);
                }}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Выбрать файл для загрузки"
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors",
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <UploadCloud className="h-10 w-10 text-muted-foreground" aria-hidden />
                <p className="mt-3 font-medium">Перетащите файл сюда или нажмите для выбора</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  MP3, WAV, MP4, MOV, AVI, MKV — до 2 ГБ
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{file.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} МБ
                  </div>
                </div>
                {!busy && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Убрать файл"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {busy && (
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-muted-foreground">{progress}%</p>
              </div>
            )}

            <LanguageSelect value={language} onChange={setLanguage} />

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button className="w-full" disabled={!file || busy} onClick={submitUpload}>
              {busy ? "Загружаем…" : "Начать транскрибацию"}
            </Button>
          </div>
        ) : (
          <form onSubmit={submitUrl} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Ссылка на видео или аудио</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Поддерживаются YouTube, Vimeo и прямые ссылки на файлы.
              </p>
            </div>

            <LanguageSelect value={language} onChange={setLanguage} />

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={!url || busy}>
              {busy ? "Отправляем…" : "Начать транскрибацию"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
