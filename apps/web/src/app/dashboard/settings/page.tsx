import type { Metadata } from "next";
import Link from "next/link";
import { subscriptions, users } from "@repo/db";
import { auth } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const session = await auth();
  const user = await users.findById(session!.user.id);
  const subscription = user ? await subscriptions.findByUserId(user.id) : null;

  const plan = PLANS[subscription?.plan ?? "FREE"];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Настройки</h1>

      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Имя</span>
            <span className="font-medium">{user?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Дата регистрации</span>
            <span className="font-medium">{user ? formatDate(user.createdAt) : "—"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Подписка <Badge variant="secondary">{plan.name}</Badge>
          </CardTitle>
          <CardDescription>
            {plan.priceMonth === 0
              ? "Бесплатный тариф"
              : `${formatPrice(plan.priceMonth)}/мес`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {plan.features.map((feature) => (
              <li key={feature}>• {feature}</li>
            ))}
          </ul>
          {plan.id !== "BUSINESS" && (
            <Link href="/#pricing" className="mt-4 inline-block">
              <Button variant="outline">Сменить тариф</Button>
            </Link>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Оплата и управление подпиской (ЮKassa) будут подключены в Фазе 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
