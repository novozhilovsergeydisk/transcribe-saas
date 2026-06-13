"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/plans";
import { cn, formatPrice } from "@/lib/utils";

const order = ["FREE", "PRO", "BUSINESS"] as const;

export function Pricing() {
  const [yearly, setYearly] = React.useState(false);

  return (
    <section id="pricing" className="py-20 sm:py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Тарифы</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Начните бесплатно — переходите на платный тариф, когда понадобится больше минут.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={cn("text-sm", !yearly && "font-semibold")}>Месяц</span>
          <button
            role="switch"
            aria-checked={yearly}
            aria-label="Переключить на годовую оплату"
            onClick={() => setYearly(!yearly)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              yearly ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                yearly ? "translate-x-[22px]" : "translate-x-0.5"
              )}
            />
          </button>
          <span className={cn("text-sm", yearly && "font-semibold")}>
            Год{" "}
            <Badge variant="success" className="ml-1 align-middle">
              −17%
            </Badge>
          </span>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {order.map((planId, i) => {
            const plan = PLANS[planId];
            const highlighted = planId === "PRO";
            const price = yearly ? plan.priceYear : plan.priceMonth;

            return (
              <motion.div
                key={planId}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card
                  className={cn(
                    "relative h-full",
                    highlighted && "border-primary shadow-lg shadow-primary/10"
                  )}
                >
                  {highlighted && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Популярный
                    </Badge>
                  )}
                  <CardHeader>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {price === 0 ? "0 ₽" : formatPrice(price)}
                      </span>
                      <span className="text-muted-foreground">/{yearly ? "год" : "мес"}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link href="/register" className="mt-6 block">
                      <Button
                        className="w-full"
                        variant={highlighted ? "default" : "outline"}
                      >
                        {planId === "FREE" ? "Начать бесплатно" : `Выбрать ${plan.name}`}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
