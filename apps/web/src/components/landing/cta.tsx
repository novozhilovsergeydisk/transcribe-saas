"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="py-20 sm:py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Готовы сэкономить часы на расшифровке?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Зарегистрируйтесь и получите 30 минут транскрибации бесплатно. Без привязки карты.
          </p>
          <Link href="/register" className="mt-8 inline-block">
            <Button size="lg" variant="secondary">
              Начать бесплатно
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
