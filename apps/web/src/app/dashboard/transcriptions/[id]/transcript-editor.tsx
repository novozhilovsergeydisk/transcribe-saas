"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pause, Play, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDuration } from "@/lib/utils";

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptEditorProps {
  transcriptionId: string;
  initialSegments: Segment[];
  initialText: string;
  audioAvailable: boolean;
}

/** Textarea, который растёт по содержимому. */
function GrowTextarea({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const resize = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  React.useLayoutEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <Textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      className={cn("resize-none overflow-hidden border-transparent bg-transparent px-2 py-1 hover:border-input focus-visible:border-input", className)}
      {...rest}
    />
  );
}

export function TranscriptEditor({
  transcriptionId,
  initialSegments,
  initialText,
  audioAvailable,
}: TranscriptEditorProps) {
  const router = useRouter();
  const hasSegments = initialSegments.length > 0;

  const audioRef = React.useRef<HTMLAudioElement>(null);
  const rowRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const baseline = React.useRef({
    segments: JSON.stringify(initialSegments),
    text: initialText,
  });

  const [segments, setSegments] = React.useState<Segment[]>(initialSegments);
  const [plain, setPlain] = React.useState(initialText);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const [playing, setPlaying] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const dirty = hasSegments
    ? JSON.stringify(segments) !== baseline.current.segments
    : plain !== baseline.current.text;

  // Подсветка активного сегмента по позиции воспроизведения.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasSegments) return;
    const onTime = () => {
      const t = audio.currentTime;
      setActiveIdx(segments.findIndex((s) => t >= s.start && t < s.end));
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [segments, hasSegments]);

  // Автопрокрутка к активному сегменту во время воспроизведения.
  React.useEffect(() => {
    if (activeIdx < 0 || !playing) return;
    rowRefs.current[activeIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx, playing]);

  // Предупреждение о несохранённых изменениях.
  React.useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const seekTo = (start: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = start;
    void audio.play().catch(() => {});
  };

  const updateSegment = (index: number, text: string) => {
    setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, text } : s)));
  };

  const deleteSegment = (index: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setSegments(JSON.parse(baseline.current.segments) as Segment[]);
    setPlain(baseline.current.text);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = hasSegments ? { segments } : { text: plain };
      const res = await fetch(`/api/transcriptions/${transcriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Не удалось сохранить изменения");
      }
      baseline.current = { segments: JSON.stringify(segments), text: plain };
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-t-lg border-b bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <h2 className="mr-auto text-base font-semibold">Редактор текста</h2>

        {error && <span className="text-sm text-destructive">{error}</span>}
        {saved && !dirty && (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-600" aria-hidden /> Сохранено
          </span>
        )}

        {dirty && (
          <Button variant="ghost" size="sm" onClick={reset} disabled={saving}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Отменить
          </Button>
        )}
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Сохранить
        </Button>
      </div>

      {audioAvailable && (
        <div className="border-b px-4 py-3">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            ref={audioRef}
            controls
            preload="metadata"
            src={`/api/transcriptions/${transcriptionId}/audio`}
            className="w-full"
          />
        </div>
      )}

      <div className="p-2 sm:p-3">
        {hasSegments ? (
          <div className="space-y-0.5">
            {segments.map((segment, i) => (
              <div
                key={i}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className={cn(
                  "group flex items-start gap-2 rounded-md border-l-2 border-transparent py-1 pl-2 pr-1 transition-colors",
                  i === activeIdx && "border-primary bg-primary/5"
                )}
              >
                {audioAvailable ? (
                  <button
                    type="button"
                    onClick={() => seekTo(segment.start)}
                    title="Перейти к этому месту"
                    className="mt-1.5 inline-flex shrink-0 items-center gap-1 font-mono text-xs text-primary hover:underline"
                  >
                    {i === activeIdx && playing ? (
                      <Pause className="h-3 w-3" aria-hidden />
                    ) : (
                      <Play className="h-3 w-3" aria-hidden />
                    )}
                    {formatDuration(segment.start)}
                  </button>
                ) : (
                  <span className="mt-1.5 shrink-0 font-mono text-xs text-muted-foreground">
                    {formatDuration(segment.start)}
                  </span>
                )}

                <GrowTextarea
                  value={segment.text}
                  onChange={(text) => updateSegment(i, text)}
                  className="flex-1 text-sm leading-relaxed"
                />

                <button
                  type="button"
                  onClick={() => deleteSegment(i)}
                  title="Удалить сегмент"
                  className="mt-1 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <GrowTextarea
            value={plain}
            onChange={setPlain}
            className="min-h-[12rem] text-sm leading-relaxed"
            placeholder="Текст транскрипции…"
          />
        )}
      </div>
    </div>
  );
}
