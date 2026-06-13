"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Анна Соколова",
    role: "Журналист",
    text: "Раньше расшифровка часового интервью занимала у меня весь вечер. Теперь — десять минут вместе с вычиткой. Качество распознавания русской речи отличное.",
  },
  {
    name: "Дмитрий Орлов",
    role: "Продюсер подкаста",
    text: "Загружаю выпуски сразу после записи и получаю субтитры в SRT для YouTube. Таймкоды точные, править почти не приходится.",
  },
  {
    name: "Мария Левина",
    role: "Руководитель отдела обучения",
    text: "Переводим в текст все вебинары и совещания. API на тарифе Business встроили в нашу LMS за один день.",
  },
];

export function Testimonials() {
  const [index, setIndex] = React.useState(0);

  const prev = () => setIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
  const next = () => setIndex((i) => (i + 1) % testimonials.length);

  const current = testimonials[index];

  return (
    <section className="bg-muted/50 py-20 sm:py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Что говорят клиенты</h2>
        </div>
        <div className="mx-auto mt-10 max-w-2xl">
          <Card>
            <CardContent className="p-8">
              <Quote className="h-8 w-8 text-primary/30" aria-hidden />
              <AnimatePresence mode="wait">
                <motion.figure
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <blockquote className="mt-4 text-lg">{current.text}</blockquote>
                  <figcaption className="mt-6">
                    <div className="font-semibold">{current.name}</div>
                    <div className="text-sm text-muted-foreground">{current.role}</div>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </CardContent>
          </Card>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={prev} aria-label="Предыдущий отзыв">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-2" role="tablist" aria-label="Отзывы">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Отзыв ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === index ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <Button variant="outline" size="icon" onClick={next} aria-label="Следующий отзыв">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
