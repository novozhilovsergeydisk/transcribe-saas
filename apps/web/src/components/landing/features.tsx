"use client";

import { motion } from "framer-motion";
import {
  FileUp,
  Link2,
  FileDown,
  Languages,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: FileUp,
    title: "Загрузка файлов",
    description:
      "Перетащите аудио или видео в браузер — поддерживаются MP3, WAV, MP4, MOV, AVI и MKV до 2 ГБ.",
  },
  {
    icon: Link2,
    title: "Обработка по URL",
    description:
      "Вставьте ссылку на YouTube, Vimeo или прямой файл — мы скачаем и расшифруем его сами.",
  },
  {
    icon: FileDown,
    title: "Экспорт в любой формат",
    description:
      "Скачивайте результат в TXT, DOCX, PDF или субтитрах SRT/VTT с точными таймкодами.",
  },
  {
    icon: Languages,
    title: "90+ языков",
    description:
      "Русский, английский и десятки других языков с автоматическим определением языка записи.",
  },
  {
    icon: Clock,
    title: "Быстрая обработка",
    description:
      "Час записи расшифровывается за считанные минуты. На тарифе Pro — приоритетная очередь.",
  },
  {
    icon: ShieldCheck,
    title: "Приватность",
    description:
      "Обработка на наших серверах без передачи третьим лицам. Файлы можно удалить в любой момент.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Всё для работы с речью
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Один сервис вместо ручной расшифровки, монтажных листов и сторонних конвертеров.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
