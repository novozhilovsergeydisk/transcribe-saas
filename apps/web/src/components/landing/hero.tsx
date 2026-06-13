"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FileAudio, Link2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]"
        aria-hidden
      />
      <div className="container relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            AI-транскрибация на 90+ языках
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Превращайте аудио и видео в точный текст{" "}
            <span className="text-primary">за минуты</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Загружайте файлы или вставляйте ссылку на YouTube — получайте готовую
            расшифровку с таймкодами и экспортом в TXT, DOCX, SRT и VTT. Первые 30 минут — бесплатно.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Попробовать бесплатно
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
            <a href="#pricing">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Тарифы
              </Button>
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileAudio className="h-4 w-4" aria-hidden /> MP3, WAV, MP4, MOV, AVI, MKV
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Link2 className="h-4 w-4" aria-hidden /> YouTube, Vimeo, прямые ссылки
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
