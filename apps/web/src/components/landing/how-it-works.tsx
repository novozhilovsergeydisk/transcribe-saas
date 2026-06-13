"use client";

import { motion } from "framer-motion";
import { Upload, Cpu, Download } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Загрузите файл или ссылку",
    description: "Перетащите медиафайл в окно браузера или вставьте URL видео.",
  },
  {
    icon: Cpu,
    title: "AI делает расшифровку",
    description: "Нейросеть распознаёт речь, расставляет пунктуацию и таймкоды.",
  },
  {
    icon: Download,
    title: "Скачайте результат",
    description: "Отредактируйте текст в браузере и экспортируйте в нужный формат.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-muted/50 py-20 sm:py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Как это работает</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Три шага от записи до готового текста.
          </p>
        </div>
        <ol className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className="relative text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <step.icon className="h-6 w-6" aria-hidden />
              </div>
              <span className="mt-4 block text-sm font-medium text-primary">Шаг {i + 1}</span>
              <h3 className="mt-1 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
